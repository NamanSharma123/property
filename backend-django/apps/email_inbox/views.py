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

from apps.accounts.models import User
from apps.common.exceptions import error_response
from apps.common.views import PublicView

from .models import EmailMessage
from .serializers import email_message_row


class EmailInboundWebhookView(PublicView):
    def post(self, request):
        secret = request.META.get('HTTP_X_INBOUND_SECRET', '')
        if not settings.INBOUND_EMAIL_WEBHOOK_SECRET or secret != settings.INBOUND_EMAIL_WEBHOOK_SECRET:
            return error_response('Not authorized', 401)

        data = request.data
        sender = data.get('sender')
        receiver = data.get('receiver')
        if not sender or not receiver:
            return error_response('sender and receiver are required', 400)

        received_at = parse_datetime(data.get('receivedAt') or '') or timezone.now()
        user = User.objects.filter(inbound_email__iexact=receiver).first()

        msg = EmailMessage.objects.create(
            sender=sender,
            receiver=receiver,
            subject=data.get('subject') or None,
            attachment_url=data.get('attachmentUrl') or None,
            attachment_name=data.get('attachmentName') or None,
            received_at=received_at,
            user=user,
            status='received' if user else 'needs_review',
            processing_log='No matching user for this inbound address — needs manual mapping.' if not user else None,
        )

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg)},
            'message': 'Email received',
        }, status=201)
