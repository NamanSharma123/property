"""
EmailInboundWebhookView is the integration point for AWS SES inbound
receiving. It intentionally has a simple, stable JSON contract; it does
NOT parse a real SES/SNS notification payload (SES delivers mail into S3
and notifies via SNS in its own envelope format) — wiring the real
receipt rule means adding a thin adapter (Lambda, or a view here) that
translates that SNS payload into this shape and POSTs/calls it, once the
domain's MX records + SES receipt rule are provisioned. Until then this
endpoint only fires from direct calls (e.g. testing).

Auth: a shared secret header, not JWT — the caller is AWS infrastructure,
not a logged-in user. Swap for real SNS message-signature verification
when wiring the live integration; this is a placeholder gate so the
endpoint isn't wide open in the meantime.
"""
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.response import Response

from apps.accounts.models import Mailbox, User
from apps.common.exceptions import error_response
from apps.common.views import PublicView

from .models import EmailAttachment, EmailMessage
from .serializers import email_message_row


def _as_list(value):
    if not value:
        return []
    if isinstance(value, str):
        return [value]
    return list(value)


def _resolve_recipient(data):
    """
    Central-mailbox routing: every alias's mail actually lands at one real
    address, so the plain To header can't be trusted to still say
    "abhi7464@..." once a provider has forwarded/aliased it — check the
    headers that usually survive that in order of reliability:
    Delivered-To, then X-Original-To, then To, then (oldest/legacy
    callers) the flat `receiver` field this endpoint originally only took.

    Returns (user, matched_address, resolved_via) — user is None (and the
    other two are whatever partial info was found) when nothing matched
    any Mailbox/User, so the caller can route it to the admin review queue
    instead of losing it.
    """
    candidates = [
        ('delivered-to', data.get('deliveredTo') or data.get('delivered_to')),
        ('x-original-to', data.get('xOriginalTo') or data.get('x_original_to')),
        ('to', data.get('to')),
        ('legacy', data.get('receiver')),
    ]

    for header_name, raw in candidates:
        for address in _as_list(raw):
            address = (address or '').strip()
            if not address:
                continue
            mailbox = Mailbox.objects.filter(email_address__iexact=address, status='active').select_related('user').first()
            if mailbox:
                return mailbox.user, address, header_name
            # Fall back to User.inbound_email directly for accounts that
            # predate the Mailbox model and haven't been backfilled yet
            # (see apps.accounts.management.commands.backfill_mailboxes).
            user = User.objects.filter(inbound_email__iexact=address).first()
            if user:
                return user, address, header_name

    # Nothing matched — still return the best-guess address so the row is
    # useful to an admin resolving it manually, preferring whichever header
    # actually had something in it.
    for header_name, raw in candidates:
        for address in _as_list(raw):
            if address:
                return None, address.strip(), header_name
    return None, '', None


class EmailInboundWebhookView(PublicView):
    def post(self, request):
        secret = request.META.get('HTTP_X_INBOUND_SECRET', '')
        if not settings.INBOUND_EMAIL_WEBHOOK_SECRET or secret != settings.INBOUND_EMAIL_WEBHOOK_SECRET:
            return error_response('Not authorized', 401)

        data = request.data
        sender = data.get('sender')
        if not sender:
            return error_response('sender is required', 400)

        message_id = data.get('messageId') or data.get('message_id') or None

        # Idempotency: an at-least-once webhook (SNS retries, a flaky
        # adapter re-POSTing) must not create a second EmailMessage — and
        # therefore a second Document/OCR run/Transaction — for the same
        # email. Message-ID is the one thing guaranteed unique per email.
        if message_id:
            existing = EmailMessage.objects.filter(message_id=message_id).first()
            if existing:
                return Response({
                    'success': True,
                    'data': {'emailMessage': email_message_row(existing)},
                    'message': 'Already ingested (duplicate Message-ID) — returning the existing record',
                }, status=200)

        user, receiver, resolved_via = _resolve_recipient(data)
        if not receiver:
            return error_response('No recipient (to/deliveredTo/xOriginalTo/receiver) was provided', 400)

        received_at = parse_datetime(data.get('receivedAt') or '') or timezone.now()

        msg = EmailMessage.objects.create(
            sender=sender,
            receiver=receiver,
            resolved_via=resolved_via,
            subject=data.get('subject') or None,
            cc=_as_list(data.get('cc')),
            bcc=_as_list(data.get('bcc')),
            text_body=data.get('textBody') or data.get('text_body') or None,
            html_body=data.get('htmlBody') or data.get('html_body') or None,
            message_id=message_id,
            # Legacy single-attachment fields, kept for any caller still
            # using the old flat shape — see the attachments list below
            # for the actual (possibly multi-file) ingestion path.
            attachment_url=data.get('attachmentUrl') or None,
            attachment_name=data.get('attachmentName') or None,
            received_at=received_at,
            user=user,
            status='received' if user else 'needs_review',
            processing_log='No matching user for this inbound address — needs manual mapping.' if not user else None,
        )

        attachments = data.get('attachments')
        if isinstance(attachments, list) and attachments:
            EmailAttachment.objects.bulk_create([
                EmailAttachment(
                    email_message=msg,
                    file_url=a.get('url') or a.get('fileUrl'),
                    file_name=a.get('name') or a.get('fileName'),
                    content_type=a.get('contentType') or a.get('content_type'),
                    file_size=a.get('size') or a.get('fileSize'),
                )
                for a in attachments if a.get('url') or a.get('fileUrl')
            ])
        elif msg.attachment_url:
            # Old flat single-attachment shape — mirror it into
            # EmailAttachment too, so processing.py has one consistent
            # place (`.attachments`) to read from regardless of which
            # shape a given caller used.
            EmailAttachment.objects.create(
                email_message=msg, file_url=msg.attachment_url, file_name=msg.attachment_name,
            )

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg)},
            'message': 'Email received',
        }, status=201)
