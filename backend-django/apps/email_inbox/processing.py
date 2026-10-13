"""
The OCR job: turns one Document's file into OCR'd, structured data — and,
for the automatic email pipeline specifically, straight into transactions
when the result is confident enough to not need a human (Unique Email ID
spec: "If OCR is successful ... status goes to success ... Unsuccessful
[results] go to review").

Two layers:
  - run_ocr_extraction(document) — the actual OCR attempt. Always creates a
    brand-new OCRJob row (never overwrites a previous attempt's result —
    full history survives every retry) plus this attempt's ExtractedData/
    DocumentLineItem rows. Used by both the automatic pipeline below and
    apps.admin_panel.views_ocr.AdminOcrReprocessView's explicit "re-OCR"
    endpoint. Never raises, never auto-creates transactions or changes
    review status on its own — those are policy decisions, not OCR's job.
  - process_email_message(msg) — the email-specific policy: classify the
    subject (spec point 4), run extraction on every attachment, and only
    when a result is unambiguous (a property could be resolved, a
    sensible amount was found) auto-create the transaction and mark the
    document 'completed' — otherwise it's left 'pending' for the existing
    OCR Review Panel to pick up, same as a direct file upload would.

Called from two places, both wrapping process_email_message() in a loop:
apps.email_inbox.tasks (the periodic "run every hour" job) and
apps.admin_panel.views_email.AdminEmailRunJobView (the admin's "run now"
button).
"""
import hashlib
import logging
import re
import urllib.request
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.db.models import Max, Q
from django.utils import timezone

from apps.ocr import statement_parser
from apps.ocr.models import Document, DocumentDuplicate, DocumentLineItem, ExtractedData, OcrTemplate, OCRJob
from apps.ocr.parser import extract_data
from apps.ocr.views import _extract_image_text, _extract_pdf_text, _extract_pdf_text_via_ocr
from apps.properties.models import Property
from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)

# Subject-line routing. Keyed to the document_type slugs already seeded
# into OcrTemplate (apps/ocr/migrations/0004_seed_ocr_templates.py:
# rental-statement, settlement-statement, interest-statement) rather than
# inventing new ones, so OcrTemplate.status can actually gate automatic
# processing (see _template_is_approved below / Req 9) — the two used to
# use different naming schemes entirely and could never have lined up.
# More specific phrases first; matched as whole words (see classify_subject)
# so e.g. "Current Statement" doesn't false-positive on "rent" inside
# "current", and inner whitespace/case/leading-trailing space don't matter.
SUBJECT_TYPE_KEYWORDS = [
    ('settlement statement', 'settlement-statement'),
    ('settlement', 'settlement-statement'),
    ('depreciation statement', 'depreciation-schedule'),
    ('depreciation', 'depreciation-schedule'),
    ('bank interest', 'interest-statement'),
    ('interest statement', 'interest-statement'),
    ('interest', 'interest-statement'),
    ('rental statement', 'rental-statement'),
    ('owner statement', 'rental-statement'),
    ('rental', 'rental-statement'),
    ('rent', 'rental-statement'),
]

_DATE_FORMATS = (
    '%d %b %Y', '%d %B %Y', '%d %m %Y', '%m %d %Y',
    '%d %b %y', '%d %B %y', '%d %m %y',
)


def classify_subject(subject):
    # Collapse internal whitespace + strip the ends so stray double-spaces
    # or leading/trailing whitespace in a real email subject can't dodge a
    # match; \b-bounded search so a keyword only matches as a whole word.
    normalized = re.sub(r'\s+', ' ', (subject or '')).strip().lower()
    for keyword, doc_type in SUBJECT_TYPE_KEYWORDS:
        if re.search(rf'\b{re.escape(keyword)}\b', normalized):
            return doc_type
    return 'other'


def _template_is_approved(doc_type):
    """Req 9: an OcrTemplate's status='enabled' (the admin panel's
    "approve") is what allows a matching statement to skip Pending Review
    and auto-create its transactions. No row for this document_type at
    all (e.g. the 'other' catch-all) defaults to NOT trusted — approval
    has to be explicit, never implicit."""
    return OcrTemplate.objects.filter(document_type=doc_type, status='enabled').exists()


def _parse_flexible_date(date_str):
    """The parser's regex-captured dates ('05/09/2026', '5 Sept 2024', ...)
    aren't ISO — coerce_date only handles ISO, so this mirrors the same
    format list apps.ocr.parser._parse_date_ts already uses elsewhere."""
    if not date_str:
        return None
    if re.match(r'^\d{4}-\d{2}-\d{2}', date_str):
        return date_str[:10]
    clean = re.sub(r'[/-]', ' ', date_str).strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(clean, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _guess_content_type(name, url):
    lower = (name or url or '').lower()
    if lower.endswith(('.jpg', '.jpeg')):
        return 'image/jpeg'
    if lower.endswith('.png'):
        return 'image/png'
    if lower.endswith('.webp'):
        return 'image/webp'
    if lower.endswith('.gif'):
        return 'image/gif'
    return 'application/pdf'


def _fetch_attachment_bytes(url):
    """A plain URL per the inbound-webhook contract (see
    apps.email_inbox.views) — fetch it directly. Falls back to a direct S3
    GET for our own private documents bucket (the backend already holds AWS
    credentials for it, same as UploadFileView/DocumentViewUrlView) since a
    bare HTTPS GET against a private bucket key 403s."""
    from django.conf import settings

    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            return resp.read()
    except Exception:
        if not settings.DOCUMENTS_S3_BUCKET:
            raise
        prefix = f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/'
        if not url.startswith(prefix):
            raise
        import boto3
        key = url[len(prefix):].split('?', 1)[0]
        s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
        obj = s3.get_object(Bucket=settings.DOCUMENTS_S3_BUCKET, Key=key)
        return obj['Body'].read()


def _resolve_property(owner_id, fixed_property_id, property_name):
    if fixed_property_id:
        return fixed_property_id
    if property_name:
        prop = Property.objects.filter(owner_id=owner_id, name__iexact=property_name.strip()).first()
        if prop:
            return prop.id
    # A user with exactly one property — the statement obviously belongs to
    # it even when OCR couldn't read/match the printed property name.
    only_two = list(Property.objects.filter(owner_id=owner_id).values_list('id', flat=True)[:2])
    if len(only_two) == 1:
        return only_two[0]
    return None


DEPRECIATION_DOC_TYPE = 'depreciation-schedule'


def _finish_depreciation_extraction(document, job, data, text):
    """The depreciation-schedule branch of run_ocr_extraction: runs
    apps.depreciation's schedule parser (the same one the property page's
    upload uses) and records each financial year as an ExtractedData row,
    so the admin review dialog shows the years/amounts it found. Creates no
    line items. The parsed result is attached to the job as
    `depreciation_parsed` for the caller to file without re-parsing."""
    from apps.depreciation import schedule_parser, service as depreciation_service

    try:
        parsed = schedule_parser.extract_depreciation_schedule(BytesIO(data))
    except Exception as exc:
        logger.warning('Depreciation parse failed for document %s: %s', document.id, exc)
        parsed = None

    found = depreciation_service.has_rows(parsed)
    confidence = 90 if found else 30
    if parsed and parsed['provider']:
        ExtractedData.objects.create(
            document=document, ocr_job=job, field_name='Depreciation provider',
            field_value=parsed['provider'], confidence=confidence,
        )
    if parsed and parsed['address']:
        ExtractedData.objects.create(
            document=document, ocr_job=job, field_name='Report property address',
            field_value=parsed['address'][2], confidence=confidence,
        )
    for method, label in (('diminishing_value', 'Diminishing value'), ('prime_cost', 'Prime cost')):
        for row in (parsed or {}).get(method, []):
            ExtractedData.objects.create(
                document=document, ocr_job=job,
                field_name=f'{label}: year ending {row["financial_date"]}'[:100],
                field_value=(
                    f'${row["total_amount"]:,.2f} (Div 40 ${row["division_40_amount"]:,.2f}'
                    f' + Div 43 ${row["division_43_amount"]:,.2f})'
                ),
                confidence=confidence, data_type='currency',
            )

    job.provider = 'depreciation-schedule-parser'
    job.raw_text = (text or '')[:20000]
    job.confidence = confidence
    job.status = 'completed'
    job.completed_at = timezone.now()
    if not found:
        job.error_message = 'No recognised depreciation schedule table found in this PDF.'
    job.save(update_fields=['provider', 'raw_text', 'confidence', 'status', 'completed_at', 'error_message'])

    document.ocr_raw_text = job.raw_text
    document.ocr_confidence = confidence
    document.processing_completed_at = timezone.now()
    document.save(update_fields=['ocr_raw_text', 'ocr_confidence', 'processing_completed_at'])

    job.depreciation_parsed = parsed
    return job


def file_depreciation_schedule(document, prop, parsed=None):
    """Files `document` (an emailed depreciation schedule) under `prop`'s
    Depreciation section. Parses the file if `parsed` isn't given. Returns
    (schedule, error) — error is a message when nothing was filed: no
    rows found, an address mismatch, or this exact file already filed for
    that property (no duplicates, point 2 of 04/10/2026)."""
    from apps.depreciation import schedule_parser, service as depreciation_service
    from apps.depreciation.models import DepreciationSchedule

    if DepreciationSchedule.objects.filter(property=prop, file_url=document.file_url).exists():
        return None, 'This depreciation schedule is already added to that property.'
    if parsed is None:
        try:
            parsed = schedule_parser.extract_depreciation_schedule(BytesIO(_fetch_attachment_bytes(document.file_url)))
        except Exception as exc:
            return None, f'Could not read the depreciation schedule: {exc}'
    if not depreciation_service.has_rows(parsed):
        return None, 'No recognised depreciation schedule table was found in this PDF.'
    mismatch = depreciation_service.address_mismatch(parsed, prop, include_name=True)
    if mismatch:
        return None, mismatch

    schedule, _years = depreciation_service.create_schedule(
        document.owner_id, prop, document.file_name, document.file_url, document.file_size, parsed,
    )
    return schedule, None


def _depreciation_property(msg, parsed):
    """Which property an emailed depreciation schedule belongs to: the one
    the email was mapped to, else the user's property whose address matches
    the report's, else the user's only property. None when ambiguous."""
    from apps.depreciation import service as depreciation_service

    if msg.property_id:
        return Property.objects.filter(id=msg.property_id, owner_id=msg.user_id).first()
    properties = list(Property.objects.filter(owner_id=msg.user_id))
    matched = depreciation_service.match_property(properties, parsed)
    if matched:
        return matched
    return properties[0] if len(properties) == 1 else None


def run_ocr_extraction(document, triggered_by=None, config=None):
    """Runs one OCR attempt against `document`'s file. Always creates a new
    OCRJob (attempt_number auto-incremented) with this attempt's raw text/
    confidence/provider/error, and ExtractedData/DocumentLineItem rows tied
    to it — a retry never touches a previous attempt's rows. Mirrors the
    latest attempt's raw_text/confidence onto Document for anything that
    just wants "the current answer". Leaves Document.status as 'pending'
    (i.e. "has a fresh result, awaiting a decision") — it's the caller's
    job to decide whether that decision can be automatic. Never raises.

    Returns the OCRJob.
    """
    next_attempt = (
        OCRJob.objects.filter(document=document).aggregate(Max('attempt_number'))['attempt_number__max'] or 0
    ) + 1
    job = OCRJob.objects.create(
        document=document, attempt_number=next_attempt, status='processing',
        config=config or {}, started_at=timezone.now(), triggered_by=triggered_by,
    )

    document.status = 'pending'
    document.processing_started_at = document.processing_started_at or timezone.now()
    document.save(update_fields=['status', 'processing_started_at'])

    try:
        data = _fetch_attachment_bytes(document.file_url)
        is_pdf = document.file_type == 'application/pdf'
        confidence = 90
        layout_result = None
        provider = 'unknown'

        if is_pdf:
            text, _pages = _extract_pdf_text(data)
            provider = 'pdf-text'
            if not text or len(text.strip()) < 10:
                text, _pages = _extract_pdf_text_via_ocr(data)
                provider = 'pdf-ocr'
            if document.document_type == DEPRECIATION_DOC_TYPE:
                # "Based on subject, relevant OCR will run": a depreciation
                # schedule is a per-financial-year table, not a list of
                # transactions — it gets its own parser and ends up in the
                # property's Depreciation section, never as line items.
                return _finish_depreciation_extraction(document, job, data, text)
            try:
                transactions, period, prop_addr = statement_parser.extract_transactions_pdf(BytesIO(data))
                if transactions:
                    layout_result = statement_parser.to_properties_shape(transactions, period, prop_addr)
                    provider = 'pdfplumber-layout'
            except Exception:
                layout_result = None
        else:
            text, confidence = _extract_image_text(data)
            provider = 'tesseract'

        result = layout_result or extract_data(text or '')
    except Exception as exc:
        logger.exception('OCR extraction failed for document %s', document.id)
        job.status = 'failed'
        job.error_message = str(exc)
        job.completed_at = timezone.now()
        job.save(update_fields=['status', 'error_message', 'completed_at'])
        document.status = 'failed'
        document.error_message = str(exc)
        document.processing_completed_at = timezone.now()
        document.save(update_fields=['status', 'error_message', 'processing_completed_at'])
        return job

    named_items = [
        (prop.get('propertyName'), item)
        for prop in result.get('properties', [])
        for item in prop.get('lineItems', [])
    ]

    # Stashed as a regular ExtractedData row (not a special field on OCRJob)
    # so it shows up in the review UI like any other extracted value, and
    # so process_email_message can read it back to date the transactions
    # it creates from this attempt's line items.
    statement_period = result.get('statementPeriod') or {}
    period_value = statement_period.get('to') or statement_period.get('from')
    if period_value:
        ExtractedData.objects.create(
            document=document, ocr_job=job, field_name='statement_period_to',
            field_value=period_value, confidence=confidence, data_type='date',
        )

    for property_name, item in named_items:
        ExtractedData.objects.create(
            document=document, ocr_job=job, field_name='line_item',
            field_value=item.get('description'),
            confidence=item.get('confidence') or confidence, data_type='string',
        )
        try:
            amount = Decimal(str(item.get('moneyIn') or item.get('moneyOut') or '0'))
        except InvalidOperation:
            amount = Decimal('0')
        DocumentLineItem.objects.create(
            document=document, ocr_job=job,
            property_name=property_name,
            description=item.get('description') or '(no description)',
            category=item.get('category'),
            amount=amount,
            item_type='income' if item.get('moneyIn') else 'expense',
            confidence=item.get('confidence') or confidence,
        )

    job.provider = provider
    job.raw_text = (text or '')[:20000]
    job.confidence = confidence
    job.status = 'completed'
    job.completed_at = timezone.now()
    job.save(update_fields=['provider', 'raw_text', 'confidence', 'status', 'completed_at'])

    document.ocr_raw_text = job.raw_text
    document.ocr_confidence = confidence
    document.processing_completed_at = timezone.now()
    document.save(update_fields=['ocr_raw_text', 'ocr_confidence', 'processing_completed_at'])

    return job


def _get_or_create_document(owner_id, property_id, file_name, file_url, doc_type):
    return Document.objects.create(
        owner_id=owner_id,
        property_id=property_id,
        file_name=file_name or 'email-attachment',
        file_url=file_url,
        file_type=_guess_content_type(file_name, file_url),
        file_size=0,
        status='pending',
        document_type=doc_type,
    )


def _claim_or_find_duplicate_document(owner_id, file_hash, file_name, file_size, new_document_kwargs):
    """Req 2/11 — the actual duplicate-protection mechanism: creating the
    Document and registering its content hash happen as one atomic unit
    against the existing apps.ocr.DocumentDuplicate table (reused as-is,
    not a new field — see its docstring), which has a DB-level unique
    constraint on (owner, file_hash). If this exact file was already
    registered for this owner — by an earlier email, or by another
    worker/request racing this one right now — the insert collides on
    that constraint and this returns the ALREADY-existing Document instead
    of creating a second one. That collision is the duplicate check; there
    is no separate "look first, then create" step for a race to slip
    through.

    Returns (document, created). `document` is None only in the
    pathological case where the colliding row vanished between the
    IntegrityError and the follow-up read (caller should treat that as
    "couldn't determine — don't skip").
    """
    try:
        with db_transaction.atomic():
            document = Document.objects.create(**new_document_kwargs)
            DocumentDuplicate.objects.create(
                owner_id=owner_id, file_hash=file_hash,
                document_signature={'fileName': file_name, 'fileSize': file_size},
                original_document=document, detection_type='content-sha256',
            )
        return document, True
    except IntegrityError:
        existing = DocumentDuplicate.objects.filter(
            owner_id=owner_id, file_hash=file_hash
        ).select_related('original_document').first()
        return (existing.original_document if existing else None), False


def _iter_attachments(msg):
    """EmailAttachment rows if any exist; otherwise the legacy single
    attachment_url/attachment_name pair some older rows only have."""
    attachments = list(msg.attachments.all())
    if attachments:
        return attachments
    if msg.attachment_url:
        return [msg]  # duck-typed: has .file_url-shaped attrs below
    return []


def _attachment_url(att):
    return getattr(att, 'file_url', None) or getattr(att, 'attachment_url', None)


def _attachment_name(att):
    return getattr(att, 'file_name', None) or getattr(att, 'attachment_name', None)


def _email_documents(msg):
    docs = {att.document for att in msg.attachments.all() if att.document_id}
    if msg.document_id:
        docs.add(msg.document)
    return docs


def email_status_from_documents(msg):
    """The email-level status implied by its attachments' review outcome:
    'processed' once every document is approved/completed, 'failed' once
    every document is decided and at least one was rejected — None while
    any document is still awaiting review."""
    docs = _email_documents(msg)
    if not docs or any(d.status not in ('completed', 'failed') for d in docs):
        return None
    return 'processed' if all(d.status == 'completed' for d in docs) else 'failed'


def sync_email_status_for_document(document):
    """Called after an admin approves/rejects a Document: moves the email(s)
    it came from out of needs_review so "Run OCR job now" (which only
    touches received/needs_review) leaves a decided statement alone, and a
    rejected one lands in the email list's failed state — which is what
    makes it eligible for "Delete from server"."""
    from .models import EmailMessage

    messages = EmailMessage.objects.filter(
        Q(document=document) | Q(attachments__document=document)
    ).distinct().prefetch_related('attachments__document')
    for msg in messages:
        new_status = email_status_from_documents(msg)
        if new_status and msg.status != new_status:
            msg.status = new_status
            msg.save(update_fields=['status'])


def process_email_message(msg):
    """Processes one EmailMessage end to end: runs OCR on every attachment
    and, for each one whose result is unambiguous, creates the transaction
    automatically — matching the spec's "OCR successful -> success state;
    unsuccessful -> review" split. Updates msg (and whatever Document/
    OCRJob/Transactions it creates) in place. Returns a short human-
    readable summary. Never raises — a failure is captured onto the
    message so a batch run isn't aborted by one bad email."""
    if not msg.user_id:
        msg.status = 'needs_review'
        msg.processing_log = 'No matching user for this inbound address — needs manual mapping.'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    attachments = _iter_attachments(msg)
    if not attachments:
        msg.status = 'needs_review'
        msg.processing_log = 'No attachment on this email — nothing to OCR.'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    doc_type = classify_subject(msg.subject)
    template_approved = _template_is_approved(doc_type)
    msg.status = 'processing'
    msg.save(update_fields=['status'])

    total_created = 0
    total_unresolved = 0
    total_extracted = 0
    total_awaiting_template = 0
    total_duplicates = 0
    total_decided = 0
    total_depreciation_filed = 0
    depreciation_review_reasons = []
    any_failed = False
    confidences = []

    for att in attachments:
        document = getattr(att, 'document', None)
        if document is None:
            att_url = _attachment_url(att)
            att_name = _attachment_name(att)

            # Req 2: fetch once up front to hash the actual content — this
            # is what catches the same statement arriving via a different
            # email/Message-ID (the Message-ID check in ingest_email only
            # catches a retried *delivery* of the same email, not a
            # genuinely separate email with identical content).
            try:
                content = _fetch_attachment_bytes(att_url)
            except Exception:
                content = None

            created = True
            if content is not None:
                file_hash = hashlib.sha256(content).hexdigest()
                document, created = _claim_or_find_duplicate_document(
                    msg.user_id, file_hash, att_name, len(content),
                    dict(
                        owner_id=msg.user_id, property_id=msg.property_id,
                        file_name=att_name or 'email-attachment', file_url=att_url,
                        file_type=_guess_content_type(att_name, att_url),
                        file_size=len(content), status='pending', document_type=doc_type,
                    ),
                )
                if document is None:
                    # Pathological race edge case (see
                    # _claim_or_find_duplicate_document) — fall back to a
                    # plain create rather than silently dropping the
                    # attachment.
                    document = _get_or_create_document(msg.user_id, msg.property_id, att_name, att_url, doc_type)
                    created = True
            else:
                # Couldn't fetch to hash — create normally; run_ocr_extraction
                # will hit (and record) the same fetch failure below.
                document = _get_or_create_document(msg.user_id, msg.property_id, att_name, att_url, doc_type)

            if hasattr(att, 'file_url'):  # a real EmailAttachment row, not the msg-as-attachment shim
                att.document = document
                att.save(update_fields=['document'])
            if msg.document_id is None:
                msg.document = document
                msg.save(update_fields=['document'])

            if not created:
                # Identical content already processed for this owner — no
                # new OCR run, no new document, no new transaction.
                total_duplicates += 1
                continue
        elif document.status == 'completed' or document.reviewed_at:
            # Already resolved on a prior run, or an admin already approved/
            # rejected it — "Run OCR job now" must never re-OCR a decided
            # statement (only Re-OCR in the review dialog does that).
            total_decided += 1
            continue

        # A re-run over a statement that already produced transactions (e.g.
        # a partly-resolved one left in needs_review) must not auto-create
        # them a second time — the fresh attempt goes to review instead.
        has_prior_transactions = Transaction.objects.filter(source_document=document).exists()

        job = run_ocr_extraction(document)
        if job.status == 'failed':
            any_failed = True
            continue

        confidences.append(job.confidence or 0)

        if document.document_type == DEPRECIATION_DOC_TYPE:
            # Filed straight into the property's Depreciation section when
            # the template is approved and the property is known — otherwise
            # Pending Review, where Approve files it under the chosen property.
            reason = None
            if not template_approved:
                reason = f'"{doc_type}" has no approved OCR template yet'
            else:
                prop = _depreciation_property(msg, getattr(job, 'depreciation_parsed', None))
                if not prop:
                    reason = 'could not tell which property it belongs to'
                else:
                    schedule, reason = file_depreciation_schedule(
                        document, prop, getattr(job, 'depreciation_parsed', None),
                    )
                    if schedule:
                        document.property = prop
                        document.status = 'completed'
                        document.save(update_fields=['property', 'status'])
                        total_depreciation_filed += 1
                        continue
            depreciation_review_reasons.append(reason)
            continue

        named_items = [
            (li.property_name, li) for li in DocumentLineItem.objects.filter(document=document, ocr_job=job)
        ]
        total_extracted += len(named_items)

        if not template_approved or has_prior_transactions:
            # Req 9: without an approved OcrTemplate for this document type,
            # extraction still runs (so the admin has something to review),
            # but it never bypasses Pending Review — the line items stay
            # unconverted for AdminOcrApproveLineItemsView to turn into
            # transactions once a human signs off.
            total_awaiting_template += len(named_items)
            continue

        period_field = ExtractedData.objects.filter(
            document=document, ocr_job=job, field_name='statement_period_to'
        ).first()
        fallback_date = (
            (_parse_flexible_date(period_field.field_value) if period_field else None)
            or timezone.now().date().isoformat()
        )

        created_here = 0
        unresolved_here = 0
        for property_name, line_item in named_items:
            resolved_property_id = _resolve_property(msg.user_id, msg.property_id, property_name)
            if not resolved_property_id or line_item.amount <= 0:
                unresolved_here += 1
                continue

            tx = Transaction.objects.create(
                owner_id=msg.user_id,
                property_id=resolved_property_id,
                description=line_item.description or (msg.subject or 'Email statement'),
                amount=line_item.amount,
                date=fallback_date,
                type=line_item.item_type,
                category_name=line_item.category,
                transaction_source='OCR Upload',
                status='pending',
                source_document=document,
            )
            line_item.is_converted = True
            line_item.transaction = tx
            line_item.save(update_fields=['is_converted', 'transaction'])
            created_here += 1

        total_created += created_here
        total_unresolved += unresolved_here

        # This attachment's result is unambiguous only when every extracted
        # line item resolved to a transaction — anything less needs a human
        # (matches the OCR Review Panel's existing pending/completed/failed
        # convention, so it shows up in "Pending Review" like any other
        # unreviewed document).
        if named_items and created_here and not unresolved_here:
            # Auto-approved — reviewed_by/reviewed_at stay null, distinguishing
            # this from a document an admin actually looked at and approved.
            document.status = 'completed'
            document.save(update_fields=['status'])
        # else: leave 'pending' (already set by run_ocr_extraction) for review.

    if total_decided and total_decided == len(attachments):
        # Nothing left to OCR — every attachment was already approved or
        # rejected; just reflect that decision on the email.
        msg.status = email_status_from_documents(msg) or 'needs_review'
        summary = 'All attachment(s) were already reviewed — nothing to re-OCR.'
    elif (total_depreciation_filed or depreciation_review_reasons) and not total_extracted:
        msg.status = 'needs_review' if (depreciation_review_reasons or any_failed) else 'processed'
        parts = []
        if total_depreciation_filed:
            parts.append(f"Added {total_depreciation_filed} depreciation schedule(s) to the property's Depreciation section.")
        if depreciation_review_reasons:
            parts.append('Depreciation schedule needs admin review — ' + '; '.join(dict.fromkeys(depreciation_review_reasons)) + '.')
        if any_failed:
            parts.append('Some attachments failed OCR.')
        summary = ' '.join(parts)
    elif any_failed and not total_created:
        msg.status = 'failed'
        summary = 'OCR failed on all attachment(s) — see the document(s) for the error.'
    elif total_created and not total_unresolved and not any_failed:
        msg.status = 'processed'
        summary = f'Created {total_created} transaction(s) from {total_extracted} line item(s).'
    elif total_created:
        msg.status = 'needs_review'
        summary = (
            f'Created {total_created} transaction(s); {total_unresolved} line item(s) need a property match'
            + (' (and some attachments failed OCR)' if any_failed else '') + '.'
        )
    elif total_awaiting_template and template_approved:
        msg.status = 'needs_review'
        summary = (
            f'Re-extracted {total_awaiting_template} line item(s) — this statement already has transactions, '
            'so the new result needs admin review instead of creating them again.'
        )
    elif total_awaiting_template:
        msg.status = 'needs_review'
        summary = (
            f'Extracted {total_awaiting_template} line item(s) — "{doc_type}" has no approved OCR template yet, '
            'so this needs admin review before transactions are created.'
        )
    elif total_extracted:
        msg.status = 'needs_review'
        summary = f'Extracted {total_extracted} line item(s) but could not resolve a property for any of them — needs manual review.'
    elif total_duplicates and not any_failed:
        # Req 2: every attachment on this email matched content already
        # processed for this owner — correctly a no-op, not an error.
        msg.status = 'processed'
        summary = f'{total_duplicates} attachment(s) are duplicates of already-processed statement(s) — no new transactions created.'
    else:
        msg.status = 'needs_review'
        summary = 'No transactions could be extracted from this email — needs manual review.'

    msg.ocr_confidence = (sum(confidences) / len(confidences)) if confidences else None
    msg.processing_log = summary
    msg.save(update_fields=['status', 'ocr_confidence', 'processing_log'])
    return summary


# "Run OCR Job Now" (Req 1): only ever eligible for a message still waiting
# on OCR — never a message that's already processed, already rejected, or
# already hard-failed. Re-running OCR on an already-decided statement is a
# different, deliberate action (AdminOcrReprocessView, scoped to one
# Document) — this button is strictly "finish the ones still pending".
RUN_JOB_ELIGIBLE_STATUSES = ('received', 'needs_review')


def process_pending_messages(message_ids=None, include_needs_review=False):
    """Runs process_email_message over outstanding EmailMessages. Shared by
    the admin's on-demand "run now" button and the periodic task. Enforced
    here (not just hidden in the UI) — see RUN_JOB_ELIGIBLE_STATUSES: a
    status outside (received, needs_review) is never processed by this
    path, whether it arrived via message_ids or the default sweep.

    - No message_ids, periodic job: only messages never yet turned into a
      Document — re-OCRing every needs_review message on each hourly tick
      would just churn out new attempts nobody asked for.
    - No message_ids, admin's "Run OCR job now" (include_needs_review=True):
      every received AND needs_review message — the button exists to retry
      the ones still waiting (points discussed 04/10/2026). Already
      approved/rejected attachments inside them are still skipped, and a
      statement that already has transactions never gets them twice (see
      process_email_message).
    - Explicit message_ids (an admin re-selecting specific rows, e.g. after
      mapping a user or fixing a property): still restricted to the same
      eligible statuses — selecting an already-processed/rejected row is a
      no-op here, not a forced redo.

    Race safety (Req 11): each message is "claimed" with a single
    conditional UPDATE (status still eligible -> 'processing') before this
    process reads/touches it. That UPDATE is atomic at the database level,
    so if the periodic task and an admin's click (or two overlapping
    periodic ticks) both pick up the same message, only one UPDATE affects
    a row — the other claims 0 rows and skips it instead of both of them
    racing through process_email_message and double-creating transactions.

    Returns {processed, needs_review, failed, skipped, total} counts."""
    from .models import EmailMessage

    base_qs = EmailMessage.objects.filter(status__in=RUN_JOB_ELIGIBLE_STATUSES)
    if message_ids:
        candidate_ids = list(base_qs.filter(id__in=message_ids).values_list('id', flat=True))
        # Explicitly requested but not eligible at all (already processed/
        # rejected/failed) — count these as skipped too, not just the
        # race-lost ones below, so a caller selecting only ineligible rows
        # gets an accurate "N skipped" instead of a silent no-op.
        already_ineligible = len(message_ids) - len(candidate_ids)
    else:
        sweep_qs = base_qs if include_needs_review else base_qs.filter(document__isnull=True)
        candidate_ids = list(sweep_qs.values_list('id', flat=True))
        already_ineligible = 0

    counts = {'processed': 0, 'needs_review': 0, 'failed': 0, 'skipped': already_ineligible, 'total': 0}
    for msg_id in candidate_ids:
        claimed = EmailMessage.objects.filter(
            id=msg_id, status__in=RUN_JOB_ELIGIBLE_STATUSES
        ).update(status='processing')
        if not claimed:
            # Lost the race to another worker/click, or its status moved
            # out of eligibility between the list query and here.
            counts['skipped'] += 1
            continue

        msg = EmailMessage.objects.prefetch_related('attachments').get(id=msg_id)
        process_email_message(msg)
        counts['total'] += 1
        counts[msg.status] = counts.get(msg.status, 0) + 1
    return counts
