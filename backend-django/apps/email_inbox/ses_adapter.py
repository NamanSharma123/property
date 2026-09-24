"""
The real integration point for AWS SES inbound receiving — what
apps/email_inbox/views.py's docstring calls "a thin adapter that
translates that SNS payload into [the webhook's] shape". SES's receipt
rule (once provisioned — see the "Unique Email ID" setup guide) delivers
each inbound email's raw MIME to an S3 bucket and publishes a notification
about it to an SNS topic; SNS in turn POSTs that notification here.

Flow: SNS notification -> verify it's really from SNS (signature, not a
shared secret — SNS can't send custom headers) -> parse the SES event ->
fetch the raw email from S3 -> parse MIME (headers, body, attachments) ->
re-upload each attachment into our own documents bucket -> hand off to
apps.email_inbox.views.ingest_email(), the same function the test webhook
uses, so there's exactly one ingestion code path.

SES inbound receiving is only available in a few AWS regions (us-east-1,
us-west-2, eu-west-1 as of writing) — NOT ap-southeast-2, where the rest of
this app (App Runner, the documents S3 bucket) is deployed. That's fine:
SNS HTTPS delivery works cross-region, so this endpoint just needs to be
reachable over the public internet, which it already is.
"""
import base64
import email as email_lib
import json
import logging
import re
import urllib.request
import uuid
from email import policy

from django.conf import settings
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.views import PublicView

from .serializers import email_message_row
from .views import ingest_email

logger = logging.getLogger(__name__)

# Only ever fetch a signing certificate from a real AWS SNS host — without
# this check, a forged notification could point SigningCertURL at an
# attacker-controlled cert and "verify" against its own fake signature.
_SNS_CERT_HOST_RE = re.compile(r'^sns\.[a-zA-Z0-9\-]+\.amazonaws\.com$')


def _canonical_string(notification):
    """The exact field order AWS documents for SNS message signing —
    different for a Notification vs. a (Un)SubscriptionConfirmation."""
    msg_type = notification.get('Type')
    if msg_type == 'Notification':
        fields = ['Message', 'MessageId']
        if 'Subject' in notification:
            fields.append('Subject')
        fields += ['Timestamp', 'TopicArn', 'Type']
    else:  # SubscriptionConfirmation / UnsubscribeConfirmation
        fields = ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']

    parts = []
    for field in fields:
        if field in notification:
            parts.append(f'{field}\n{notification[field]}\n')
    return ''.join(parts).encode('utf-8')


def verify_sns_signature(notification):
    """Cryptographically verifies this notification was really signed by
    AWS SNS, per AWS's documented recipe. Returns False (never raises) on
    anything that doesn't check out — a malformed payload, an untrusted
    cert host, a bad signature, or a missing dependency."""
    try:
        cert_url = notification.get('SigningCertURL', '')
        host = cert_url.split('/', 3)[2] if cert_url.startswith('https://') else ''
        if not _SNS_CERT_HOST_RE.match(host):
            logger.warning('SNS signature check: untrusted SigningCertURL host %r', host)
            return False

        signature = base64.b64decode(notification.get('Signature', ''))
        signature_version = notification.get('SignatureVersion', '1')
        to_sign = _canonical_string(notification)

        with urllib.request.urlopen(cert_url, timeout=10) as resp:
            cert_pem = resp.read()

        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding
        from cryptography.x509 import load_pem_x509_certificate

        cert = load_pem_x509_certificate(cert_pem)
        public_key = cert.public_key()
        digest = hashes.SHA256() if signature_version == '2' else hashes.SHA1()

        try:
            public_key.verify(signature, to_sign, padding.PKCS1v15(), digest)
            return True
        except InvalidSignature:
            return False
    except Exception:
        logger.exception('SNS signature verification failed')
        return False


def _extract_mime(raw_bytes):
    """Parses a raw MIME email into the shape ingest_email() expects.
    Prefers explicit Delivered-To/X-Original-To headers (added by most
    forwarding/routing setups) over the plain To header — see
    apps.email_inbox.views._resolve_recipient for why that order matters."""
    parsed = email_lib.message_from_bytes(raw_bytes, policy=policy.default)

    text_body = None
    html_body = None
    attachments = []

    if parsed.is_multipart():
        for part in parsed.walk():
            if part.is_multipart():
                continue
            filename = part.get_filename()
            content_type = part.get_content_type()
            if filename or part.get_content_disposition() == 'attachment':
                payload = part.get_payload(decode=True) or b''
                attachments.append({'filename': filename or f'attachment-{len(attachments) + 1}', 'content_type': content_type, 'data': payload})
            elif content_type == 'text/plain' and text_body is None:
                text_body = part.get_content()
            elif content_type == 'text/html' and html_body is None:
                html_body = part.get_content()
    else:
        if parsed.get_content_type() == 'text/html':
            html_body = parsed.get_content()
        else:
            text_body = parsed.get_content()

    def header_list(name):
        value = parsed.get(name)
        if not value:
            return []
        return [addr.strip() for addr in str(value).split(',') if addr.strip()]

    return {
        'sender': parsed.get('From'),
        'to': header_list('To'),
        'deliveredTo': header_list('Delivered-To'),
        'xOriginalTo': header_list('X-Original-To'),
        'cc': header_list('Cc'),
        'bcc': header_list('Bcc'),
        'subject': parsed.get('Subject'),
        'messageId': (parsed.get('Message-ID') or '').strip('<>') or None,
        'textBody': text_body,
        'htmlBody': html_body,
        'attachments': attachments,
    }


def _fetch_raw_email(bucket, key):
    import boto3

    s3 = boto3.client('s3', region_name=settings.SES_INBOUND_S3_REGION)
    obj = s3.get_object(Bucket=bucket, Key=key)
    return obj['Body'].read()


def _upload_attachment(filename, content_type, data):
    """Re-hosts one MIME attachment into our own documents bucket (the SES
    bucket is a separate, SES-owned-policy bucket we don't want the rest of
    the app depending on) — same layout UploadFileView uses for
    user-initiated uploads."""
    import boto3

    if not settings.DOCUMENTS_S3_BUCKET:
        raise RuntimeError('DOCUMENTS_S3_BUCKET is not configured')

    ext = (filename.rsplit('.', 1)[-1] if filename and '.' in filename else 'bin').lower()
    key = f'email-attachments/{uuid.uuid4()}.{ext}'

    s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
    s3.put_object(Bucket=settings.DOCUMENTS_S3_BUCKET, Key=key, Body=data, ContentType=content_type or 'application/octet-stream')

    return f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/{key}'


class SESInboundNotificationView(PublicView):
    """POST — the URL given to the SNS topic's HTTPS subscription. Handles
    all three SNS message types; only 'Notification' actually ingests mail."""

    def post(self, request):
        try:
            notification = json.loads(request.body)
        except (ValueError, TypeError):
            return error_response('Invalid SNS payload', 400)

        msg_type = notification.get('Type')

        if not verify_sns_signature(notification):
            return error_response('SNS signature verification failed', 401)

        if settings.SES_INBOUND_SNS_TOPIC_ARN and notification.get('TopicArn') != settings.SES_INBOUND_SNS_TOPIC_ARN:
            return error_response('Unexpected SNS TopicArn', 401)

        if msg_type == 'SubscriptionConfirmation':
            # AWS requires the endpoint to GET the SubscribeURL to actually
            # activate the subscription — do it right away so the topic
            # starts delivering without a manual console click.
            subscribe_url = notification.get('SubscribeURL')
            if subscribe_url:
                try:
                    urllib.request.urlopen(subscribe_url, timeout=10)
                except Exception:
                    logger.exception('Failed to confirm SNS subscription')
                    return error_response('Failed to confirm subscription', 500)
            return Response({'success': True, 'message': 'Subscription confirmed'})

        if msg_type == 'UnsubscribeConfirmation':
            logger.warning('SNS topic unsubscribed: %s', notification.get('TopicArn'))
            return Response({'success': True})

        if msg_type != 'Notification':
            return error_response(f'Unhandled SNS message type: {msg_type}', 400)

        try:
            ses_event = json.loads(notification.get('Message', '{}'))
        except (ValueError, TypeError):
            return error_response('Invalid SES event in SNS Message', 400)

        mail = ses_event.get('mail', {})
        receipt = ses_event.get('receipt', {})
        action = receipt.get('action', {})

        if action.get('type') != 'S3':
            # A receipt rule not configured to deliver to S3 — nothing we
            # can fetch the body/attachments from. Shouldn't happen once
            # the rule is set up correctly, but don't crash on it.
            return error_response('SES receipt action is not S3 — cannot fetch the email body', 400)

        bucket = action.get('bucketName') or settings.SES_INBOUND_S3_BUCKET
        key = action.get('objectKey')
        if not bucket or not key:
            return error_response('SES notification is missing the S3 bucket/key', 400)

        try:
            raw_bytes = _fetch_raw_email(bucket, key)
            parsed = _extract_mime(raw_bytes)
        except Exception as exc:
            logger.exception('Failed to fetch/parse inbound email from s3://%s/%s', bucket, key)
            return error_response(f'Failed to fetch/parse the email: {exc}', 500)

        uploaded_attachments = []
        for att in parsed['attachments']:
            try:
                url = _upload_attachment(att['filename'], att['content_type'], att['data'])
                uploaded_attachments.append({
                    'url': url, 'name': att['filename'], 'contentType': att['content_type'], 'size': len(att['data']),
                })
            except Exception:
                logger.exception('Failed to re-upload attachment %s', att['filename'])

        received_at = parse_datetime(mail.get('timestamp') or '') if mail.get('timestamp') else None

        data = {
            'sender': parsed['sender'] or mail.get('source'),
            'to': parsed['to'] or receipt.get('recipients') or mail.get('destination'),
            'deliveredTo': parsed['deliveredTo'],
            'xOriginalTo': parsed['xOriginalTo'],
            'cc': parsed['cc'],
            'bcc': parsed['bcc'],
            'subject': parsed['subject'],
            'textBody': parsed['textBody'],
            'htmlBody': parsed['htmlBody'],
            'messageId': parsed['messageId'] or mail.get('messageId'),
            'attachments': uploaded_attachments,
            'receivedAt': received_at.isoformat() if received_at else None,
        }

        msg, created, error = ingest_email(data)
        if error:
            logger.error('Failed to ingest SES-delivered email: %s', error)
            # Still 200 — SNS treats non-2xx as "retry", and a permanent
            # validation error (e.g. genuinely no recipient at all) will
            # never succeed on retry, so don't let SNS hammer this forever.
            return Response({'success': False, 'error': error}, status=200)

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg)},
            'message': 'Email ingested from SES' if created else 'Already ingested (duplicate Message-ID)',
        }, status=200)
