"""
Turns one inbound EmailMessage into OCR'd transactions automatically — the
"OCR job" from the Unique Email ID spec: subject-line classification (point
4), then the same text-extraction pipeline apps.ocr.views uses for direct
uploads (point 2), landing on 'processed' when transactions could be
created outright or 'needs_review' when a human has to finish the job
(point 3) — never silently dropped, never raises.

Called from two places, both just wrapping process_email_message() in a
loop: apps.email_inbox.tasks (the periodic "run every hour" job) and
apps.admin_panel.views_email.AdminEmailRunJobView (the admin's "run now"
button) — see those for how a batch of messages gets selected.
"""
import logging
import re
import urllib.request
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

from django.utils import timezone

from apps.ocr import statement_parser
from apps.ocr.models import Document, DocumentLineItem, ExtractedData
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
    """attachment_url is a plain URL per the inbound-webhook contract (see
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


def process_email_message(msg):
    """Processes one EmailMessage end to end, updating it (and whatever
    Document/Transactions it creates) in place. Returns a short
    human-readable summary. Never raises — a failure is captured onto the
    message so a batch run isn't aborted by one bad email."""
    if not msg.user_id:
        msg.status = 'needs_review'
        msg.processing_log = 'No matching user for this inbound address — needs manual mapping.'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    if not msg.attachment_url:
        msg.status = 'needs_review'
        msg.processing_log = 'No attachment on this email — nothing to OCR.'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    doc_type = classify_subject(msg.subject)
    msg.status = 'processing'
    msg.save(update_fields=['status'])

    document = msg.document
    if document is None:
        document = Document.objects.create(
            owner_id=msg.user_id,
            property_id=msg.property_id,
            file_name=msg.attachment_name or (msg.subject or 'email-attachment'),
            file_url=msg.attachment_url,
            file_type=_guess_content_type(msg.attachment_name, msg.attachment_url),
            file_size=0,
            status='pending',
            document_type=doc_type,
            processing_started_at=timezone.now(),
        )
        msg.document = document
        msg.save(update_fields=['document'])
    elif not document.document_type:
        document.document_type = doc_type
        document.processing_started_at = document.processing_started_at or timezone.now()
        document.save(update_fields=['document_type', 'processing_started_at'])

    if document.status == 'completed':
        # Already fully processed on a prior run — an explicit retry
        # (message_ids passed to process_pending_messages) landing here
        # means nothing's actually wrong with it. Don't regenerate.
        msg.status = 'processed'
        msg.processing_log = 'Already processed — nothing to redo.'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    # A retry of a previously needs_review/failed run — clear what that run
    # left behind before regenerating, but only transactions still 'pending'
    # (untouched since). Anything an admin/user has since reviewed, edited,
    # or paid is left alone rather than silently deleted out from under them.
    Transaction.objects.filter(source_document=document, status='pending').delete()
    DocumentLineItem.objects.filter(document=document).delete()
    ExtractedData.objects.filter(document=document).delete()

    try:
        data = _fetch_attachment_bytes(msg.attachment_url)
        is_pdf = document.file_type == 'application/pdf'
        confidence = 90
        layout_result = None

        if is_pdf:
            text, _pages = _extract_pdf_text(data)
            if not text or len(text.strip()) < 10:
                text, _pages = _extract_pdf_text_via_ocr(data)
            try:
                transactions, period, prop_addr = statement_parser.extract_transactions_pdf(BytesIO(data))
                if transactions:
                    layout_result = statement_parser.to_properties_shape(transactions, period, prop_addr)
            except Exception:
                layout_result = None
        else:
            text, confidence = _extract_image_text(data)

        result = layout_result or extract_data(text or '')
    except Exception as exc:
        logger.exception('OCR processing failed for email message %s', msg.id)
        document.status = 'failed'
        document.error_message = str(exc)
        document.processing_completed_at = timezone.now()
        document.save(update_fields=['status', 'error_message', 'processing_completed_at'])
        msg.status = 'failed'
        msg.processing_log = f'OCR failed: {exc}'
        msg.save(update_fields=['status', 'processing_log'])
        return msg.processing_log

    named_items = [
        (prop.get('propertyName'), item)
        for prop in result.get('properties', [])
        for item in prop.get('lineItems', [])
    ]

    statement_period = result.get('statementPeriod') or {}
    fallback_date = (
        _parse_flexible_date(statement_period.get('to'))
        or _parse_flexible_date(statement_period.get('from'))
        or timezone.now().date().isoformat()
    )

    document.ocr_raw_text = (text or '')[:20000]
    document.ocr_confidence = confidence

    created_count = 0
    unresolved_count = 0

    for property_name, item in named_items:
        ExtractedData.objects.create(
            document=document, field_name='line_item',
            field_value=item.get('description'),
            confidence=item.get('confidence') or confidence, data_type='string',
        )

        try:
            amount = Decimal(str(item.get('moneyIn') or item.get('moneyOut') or '0'))
        except InvalidOperation:
            amount = Decimal('0')

        item_type = 'income' if item.get('moneyIn') else 'expense'
        line_item = DocumentLineItem.objects.create(
            document=document,
            property_name=property_name,
            description=item.get('description') or '(no description)',
            category=item.get('category'),
            amount=amount,
            item_type=item_type,
            confidence=item.get('confidence') or confidence,
        )

        resolved_property_id = _resolve_property(msg.user_id, msg.property_id, property_name)
        if not resolved_property_id or amount <= 0:
            unresolved_count += 1
            continue

        tx = Transaction.objects.create(
            owner_id=msg.user_id,
            property_id=resolved_property_id,
            description=item.get('description') or (msg.subject or 'Email statement'),
            amount=amount,
            date=fallback_date,
            type=item_type,
            category_name=item.get('category'),
            transaction_source='OCR Upload',
            status='pending',
            source_document=document,
        )
        line_item.is_converted = True
        line_item.transaction = tx
        line_item.save(update_fields=['is_converted', 'transaction'])
        created_count += 1

    if named_items and created_count and not unresolved_count:
        document.status = 'completed'
        msg.status = 'processed'
        summary = f'Created {created_count} transaction(s) from {len(named_items)} line item(s).'
    elif created_count:
        document.status = 'needs_review'
        msg.status = 'needs_review'
        summary = f'Created {created_count} transaction(s); {unresolved_count} line item(s) need a property match.'
    elif named_items:
        document.status = 'needs_review'
        msg.status = 'needs_review'
        summary = f'Extracted {len(named_items)} line item(s) but could not resolve a property for any of them — needs manual review.'
    else:
        document.status = 'needs_review'
        msg.status = 'needs_review'
        summary = 'No transactions could be extracted from this attachment — needs manual review.'

    document.processing_completed_at = timezone.now()
    document.save(update_fields=['ocr_raw_text', 'ocr_confidence', 'status', 'processing_completed_at'])

    msg.ocr_confidence = confidence
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

    Returns {processed, needs_review, failed, total} counts."""
    from .models import EmailMessage

    if message_ids:
        qs = EmailMessage.objects.filter(id__in=message_ids).exclude(status='processing')
    else:
        qs = EmailMessage.objects.filter(document__isnull=True).exclude(status__in=('processed', 'processing'))

    counts = {'processed': 0, 'needs_review': 0, 'failed': 0, 'total': 0}
    for msg in qs:
        process_email_message(msg)
        counts['total'] += 1
        counts[msg.status] = counts.get(msg.status, 0) + 1
    return counts
