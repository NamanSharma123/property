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
import logging
import re
import urllib.request
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.db.models import Max
from django.utils import timezone

from apps.ocr import statement_parser
from apps.ocr.models import Document, DocumentLineItem, ExtractedData, OCRJob
from apps.ocr.parser import extract_data
from apps.ocr.views import _extract_image_text, _extract_pdf_text, _extract_pdf_text_via_ocr
from apps.properties.models import Property
from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)

# Subject-line routing (spec point 4) — order matters, more specific first.
# There's no dedicated settlement/depreciation parser in this codebase (the
# generic extractor + the layout-aware statement_parser already cover a wide
# range of real-estate statement formats regardless of subject), so this
# classification drives Document.document_type / admin-panel filtering
# rather than picking a different extraction function.
SUBJECT_TYPE_KEYWORDS = [
    ('settlement', 'settlement'),
    ('depreciation', 'depreciation'),
    ('rental statement', 'rental_statement'),
    ('owner statement', 'rental_statement'),
    ('rental', 'rental_statement'),
    ('rent', 'rental_statement'),
]

_DATE_FORMATS = (
    '%d %b %Y', '%d %B %Y', '%d %m %Y', '%m %d %Y',
    '%d %b %y', '%d %B %y', '%d %m %y',
)


def classify_subject(subject):
    lower = (subject or '').lower()
    for keyword, doc_type in SUBJECT_TYPE_KEYWORDS:
        if keyword in lower:
            return doc_type
    return 'other'


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
    msg.status = 'processing'
    msg.save(update_fields=['status'])

    total_created = 0
    total_unresolved = 0
    total_extracted = 0
    any_failed = False
    confidences = []

    for att in attachments:
        document = getattr(att, 'document', None)
        if document is None:
            document = _get_or_create_document(
                msg.user_id, msg.property_id, _attachment_name(att), _attachment_url(att), doc_type,
            )
            if hasattr(att, 'file_url'):  # a real EmailAttachment row, not the msg-as-attachment shim
                att.document = document
                att.save(update_fields=['document'])
            if msg.document_id is None:
                msg.document = document
                msg.save(update_fields=['document'])
        elif document.status == 'completed':
            # Already resolved on a prior run — nothing to redo for this one.
            continue

        job = run_ocr_extraction(document)
        if job.status == 'failed':
            any_failed = True
            continue

        confidences.append(job.confidence or 0)
        named_items = [
            (li.property_name, li) for li in DocumentLineItem.objects.filter(document=document, ocr_job=job)
        ]
        total_extracted += len(named_items)

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

    if any_failed and not total_created:
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
    elif total_extracted:
        msg.status = 'needs_review'
        summary = f'Extracted {total_extracted} line item(s) but could not resolve a property for any of them — needs manual review.'
    else:
        msg.status = 'needs_review'
        summary = 'No transactions could be extracted from this email — needs manual review.'

    msg.ocr_confidence = (sum(confidences) / len(confidences)) if confidences else None
    msg.processing_log = summary
    msg.save(update_fields=['status', 'ocr_confidence', 'processing_log'])
    return summary


def process_pending_messages(message_ids=None):
    """Runs process_email_message over outstanding EmailMessages. Shared by
    the admin's on-demand "run now" button and the periodic task.

    - No message_ids (the periodic job, and the admin's "run all"): only
      messages never yet turned into a Document — reprocessing an already
      OCR'd message on every hourly tick would just duplicate transactions.
    - Explicit message_ids (an admin re-selecting specific rows, e.g. after
      mapping a user or fixing a property): treated as a deliberate retry,
      so it reruns regardless of prior outcome — except one already mid-run.
      Per-attachment Documents already 'completed' are skipped even on a
      forced retry (see process_email_message); a genuine "this was wrong,
      redo it" retry is apps.admin_panel.views_ocr.AdminOcrReprocessView,
      scoped to one Document, not the whole email.

    Returns {processed, needs_review, failed, total} counts."""
    from .models import EmailMessage

    if message_ids:
        qs = EmailMessage.objects.filter(id__in=message_ids).exclude(status='processing')
    else:
        qs = EmailMessage.objects.filter(document__isnull=True).exclude(status__in=('processed', 'processing'))

    counts = {'processed': 0, 'needs_review': 0, 'failed': 0, 'total': 0}
    for msg in qs.prefetch_related('attachments'):
        process_email_message(msg)
        counts['total'] += 1
        counts[msg.status] = counts.get(msg.status, 0) + 1
    return counts
