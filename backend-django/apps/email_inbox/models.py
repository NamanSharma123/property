"""
Every inbound email addressed to a user's unique OCR inbox (Mailbox /
User.inbound_email) lands here first, before its attachments become
Document + OCRJob rows — the "Email Ingestion" half of the Unique Email
ID spec. Net-new (nothing existing to port); populated by
EmailInboundWebhookView, which is the integration point for AWS SES
inbound receiving — that AWS-side wiring (receipt rule + this domain's
MX records) is a separate provisioning step, not something this code can
do on its own. Until it's provisioned, this table only fills up via
direct POSTs to the webhook (e.g. for testing).

IMPORTANT — there is no per-user physical mailbox. Every alias's mail
actually arrives at one central address; the webhook resolves which
alias an email was *really* addressed to by checking Delivered-To /
X-Original-To / To (in that order — providers don't reliably preserve a
plain To header once an alias forwards/routes mail), then looks that
alias up in apps.accounts.Mailbox to find the owning user. `resolved_via`
records which header actually matched, for debugging misrouted mail.
"""
from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel, TimeStampedModel


class EmailMessage(TimeStampedModel):
    STATUS_CHOICES = [
        ('received', 'received'),
        ('processing', 'processing'),
        ('processed', 'processed'),
        ('needs_review', 'needs_review'),
        ('failed', 'failed'),
    ]

    sender = models.EmailField()
    receiver = models.EmailField()  # the alias address the mail was resolved as being sent to
    # Which header actually matched a Mailbox — 'delivered-to' | 'x-original-to'
    # | 'to' | 'legacy' (the older flat sender/receiver-only webhook shape).
    resolved_via = models.CharField(max_length=20, null=True, blank=True)
    subject = models.CharField(max_length=500, null=True, blank=True)
    cc = models.JSONField(default=list, blank=True)
    bcc = models.JSONField(default=list, blank=True)
    text_body = models.TextField(null=True, blank=True)
    html_body = models.TextField(null=True, blank=True)
    # Provider/Message-ID header — the idempotency key that stops the same
    # inbound email (e.g. an at-least-once webhook retry) from being
    # ingested twice. Null for rows created before this existed, or by
    # test/manual inserts that don't have a real Message-ID.
    message_id = models.CharField(max_length=500, unique=True, null=True, blank=True)

    # Where SES actually stored the raw MIME email (Req 6 — "delete from
    # server"/inbox needs to know the exact source object to remove). Null
    # for rows that didn't arrive via the SES/SNS adapter (the test
    # webhook, or rows predating this field).
    source_s3_bucket = models.CharField(max_length=255, null=True, blank=True)
    source_s3_key = models.TextField(null=True, blank=True)
    # Set once an admin deletes the raw email from that bucket — the
    # application's own EmailMessage/Document/Transaction records are
    # untouched by this (Req 6: deleting from the server must not delete
    # already-stored data), so this is purely "is there still a copy on
    # the mail server" bookkeeping.
    source_deleted_at = models.DateTimeField(null=True, blank=True)

    # Legacy single-attachment convenience fields — kept for backward
    # compatibility with rows/integrations written before EmailAttachment
    # existed. New ingestion writes EmailAttachment rows instead; a
    # message with real attachments should be read from `.attachments`,
    # not these two, which processing.py now only falls back to when
    # `.attachments` is empty.
    attachment_url = models.TextField(null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)

    received_at = models.DateTimeField()

    # Resolved by matching the recipient headers against Mailbox at ingest
    # time; left null for the admin to assign manually (an inbox alias
    # isn't tied to one property, and an unmapped alias needs a human).
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='user_id', null=True, blank=True
    )
    property = models.ForeignKey(
        'properties.Property', on_delete=models.SET_NULL, db_column='property_id', null=True, blank=True
    )
    # The first attachment's Document, kept for backward compatibility with
    # code/UI that only ever expected one attachment per email. For the
    # authoritative per-attachment mapping (multiple documents per email),
    # see EmailAttachment.document below.
    document = models.ForeignKey(
        'ocr.Document', on_delete=models.SET_NULL, db_column='document_id', null=True, blank=True,
        help_text='The first attachment turned into a Document for OCR processing, if any.',
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
            models.Index(fields=['message_id'], name='idx_email_msg_message_id'),
        ]

    def __str__(self):
        return f'{self.sender} -> {self.receiver}: {self.subject or "(no subject)"}'


class EmailAttachment(CreatedModel):
    """
    One file attached to an inbound EmailMessage. Split out from
    EmailMessage's old single attachment_url/attachment_name pair so a
    real statement email with several PDFs/images each gets its own
    Document + OCRJob (and its own review/reprocess history) instead of
    only the first attachment ever being processed.
    """
    email_message = models.ForeignKey(
        EmailMessage, on_delete=models.CASCADE, db_column='email_message_id', related_name='attachments'
    )
    file_name = models.CharField(max_length=255, null=True, blank=True)
    file_url = models.TextField()
    content_type = models.CharField(max_length=100, null=True, blank=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    # Set once this attachment has been turned into a Document for OCR.
    document = models.ForeignKey(
        'ocr.Document', on_delete=models.SET_NULL, db_column='document_id', null=True, blank=True,
        related_name='email_attachment'
    )

    class Meta:
        db_table = 'email_attachments'
        indexes = [
            models.Index(fields=['email_message'], name='idx_email_att_msg_id'),
        ]

    def __str__(self):
        return self.file_name or self.file_url
