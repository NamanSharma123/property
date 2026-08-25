"""
Every inbound email addressed to a user's unique OCR inbox (User.inbound_email)
lands here first, before it becomes a Document/Transaction — the "Email
Ingestion" half of the spec's OCR pipeline. Net-new (nothing existing to
port); populated by EmailInboundWebhookView, which is the integration point
for AWS SES inbound receiving — that AWS-side wiring (receipt rule + this
domain's MX records) is a separate provisioning step, not something this
code can do on its own. Until it's provisioned, this table only fills up
via direct POSTs to the webhook (e.g. for testing).
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class EmailMessage(TimeStampedModel):
    STATUS_CHOICES = [
        ('received', 'received'),
        ('processing', 'processing'),
        ('processed', 'processed'),
        ('needs_review', 'needs_review'),
        ('failed', 'failed'),
    ]

    sender = models.EmailField()
    receiver = models.EmailField()  # the inbound_email address the mail was sent to
    subject = models.CharField(max_length=500, null=True, blank=True)
    attachment_url = models.TextField(null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    received_at = models.DateTimeField()

    # Resolved by matching `receiver` against User.inbound_email at ingest
    # time; property is left null for the admin to assign manually (a user
    # inbox isn't tied to one property).
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='user_id', null=True, blank=True
    )
    property = models.ForeignKey(
        'properties.Property', on_delete=models.SET_NULL, db_column='property_id', null=True, blank=True
    )
    document = models.ForeignKey(
        'ocr.Document', on_delete=models.SET_NULL, db_column='document_id', null=True, blank=True,
        help_text='Set once this message has been converted into a Document for OCR processing.',
    )

    ocr_confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    processing_log = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'email_messages'
        indexes = [
            models.Index(fields=['user'], name='idx_email_msg_user_id'),
            models.Index(fields=['status'], name='idx_email_msg_status'),
            models.Index(fields=['receiver'], name='idx_email_msg_receiver'),
        ]

    def __str__(self):
        return f'{self.sender} -> {self.receiver}: {self.subject or "(no subject)"}'
