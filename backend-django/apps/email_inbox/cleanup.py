"""
Bulk "delete from server" (Req 6, points discussed 04/10/2026): frees mail
server space by removing the ORIGINAL raw email from the SES inbound S3
bucket for every email whose statement already reached a terminal outcome —
the email hard-failed OCR, or an admin rejected its document. Optionally
only the large ones (min_size_bytes).

Same eligibility and same guarantees as the single-email
AdminEmailDeleteFromServerView: only the raw source copy is removed; the
app's own EmailMessage/Document/Transaction rows are untouched, and
source_deleted_at records that the server copy is gone.

Manual for now — triggered from the admin Email Inbox ("Clean up server"),
or by `manage.py cleanup_inbound_emails` if it should later run on a
schedule.
"""
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from .models import EmailMessage


def eligible_for_server_delete():
    return EmailMessage.objects.filter(
        source_deleted_at__isnull=True,
        source_s3_bucket__isnull=False,
        source_s3_key__isnull=False,
    ).filter(Q(status='failed') | Q(document__status='failed'))


def cleanup_server_emails(min_size_bytes=0, dry_run=False):
    """Returns {deleted, skipped_small, errors, freed_bytes, dry_run}."""
    import boto3

    s3 = boto3.client('s3', region_name=settings.SES_INBOUND_S3_REGION)
    result = {'deleted': 0, 'skipped_small': 0, 'errors': 0, 'freed_bytes': 0, 'dry_run': dry_run}

    for msg in eligible_for_server_delete():
        try:
            size = s3.head_object(Bucket=msg.source_s3_bucket, Key=msg.source_s3_key)['ContentLength']
        except Exception:
            # Already gone from the bucket (deleted by hand, lifecycle rule…)
            # — record that so it stops showing up as eligible.
            if not dry_run:
                msg.source_deleted_at = timezone.now()
                msg.save(update_fields=['source_deleted_at'])
            continue

        if size < min_size_bytes:
            result['skipped_small'] += 1
            continue

        if not dry_run:
            try:
                s3.delete_object(Bucket=msg.source_s3_bucket, Key=msg.source_s3_key)
            except Exception:
                result['errors'] += 1
                continue
            msg.source_deleted_at = timezone.now()
            msg.save(update_fields=['source_deleted_at'])

        result['deleted'] += 1
        result['freed_bytes'] += size

    return result
