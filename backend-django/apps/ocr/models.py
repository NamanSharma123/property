"""
OCR document tables (used by backend/src/controllers/ocrController.js — these
exist in the live database although they are not in all-in-one.sql).
"""
from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel, TimeStampedModel


class Document(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(
        'properties.Property', on_delete=models.SET_NULL, db_column='property_id', null=True, blank=True
    )
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    status = models.CharField(max_length=20, default='pending')
    document_type = models.CharField(max_length=50, null=True, blank=True)
    ocr_raw_text = models.TextField(null=True, blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    # Admin OCR Review Panel — who approved/rejected this document (and
    # when), separate from `status` so "processed automatically, never
    # reviewed" and "processed, admin-reviewed" stay distinguishable.
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='reviewed_by',
        null=True, blank=True, related_name='reviewed_documents'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'documents'
        indexes = [
            models.Index(fields=['owner'], name='idx_documents_owner_id'),
            models.Index(fields=['status'], name='idx_documents_status'),
        ]

    def __str__(self):
        return self.file_name


class OCRJob(TimeStampedModel):
    """
    One OCR attempt against a Document's file. Separate from Document so
    every attempt — including retries/reprocesses — keeps its own full
    history (raw text, confidence, provider, error) instead of a retry
    overwriting the previous attempt's result. Document.ocr_raw_text/
    ocr_confidence continue to mirror the *latest completed* job for
    anything that only cares about "the current answer" (existing UI);
    this table is what "re-OCR with full history" actually reads/writes.
    """
    STATUS_CHOICES = [
        ('queued', 'queued'),
        ('processing', 'processing'),
        ('completed', 'completed'),
        ('failed', 'failed'),
    ]

    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id', related_name='ocr_jobs')
    attempt_number = models.PositiveIntegerField()
    # Which extraction path actually produced the result — 'pdf-text',
    # 'pdf-ocr' (scanned PDF rendered + Tesseract), 'pdfplumber-layout'
    # (statement_parser's layout-aware parser), or 'tesseract' (image).
    provider = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    config = models.JSONField(default=dict, blank=True)
    raw_text = models.TextField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='triggered_by',
        null=True, blank=True, related_name='triggered_ocr_jobs',
        help_text='Admin who requested a reprocess; null for the original automatic attempt.',
    )

    class Meta:
        db_table = 'ocr_jobs'
        indexes = [
            models.Index(fields=['document'], name='idx_ocr_jobs_document_id'),
            models.Index(fields=['status'], name='idx_ocr_jobs_status'),
        ]
        ordering = ['document', 'attempt_number']
        constraints = [
            models.UniqueConstraint(fields=['document', 'attempt_number'], name='uniq_ocr_job_attempt'),
        ]

    def __str__(self):
        return f'{self.document_id} attempt #{self.attempt_number} ({self.status})'


class Review(CreatedModel):
    """
    A reviewer's decision on a Document's (latest) OCR result — kept as
    its own append-only row per decision, so "who approved/rejected this,
    when, and why" has full history instead of only the single reviewed_by/
    reviewed_at pair Document already carries (which this doesn't replace,
    just backs with an audit trail).
    """
    STATUS_CHOICES = [
        ('pending', 'pending'),
        ('approved', 'approved'),
        ('rejected', 'rejected'),
        ('reprocess_requested', 'reprocess_requested'),
    ]

    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id', related_name='reviews')
    ocr_job = models.ForeignKey(
        OCRJob, on_delete=models.SET_NULL, db_column='ocr_job_id', null=True, blank=True, related_name='reviews'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='reviewer_id', null=True, blank=True
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ocr_reviews'
        indexes = [
            models.Index(fields=['document'], name='idx_ocr_reviews_document_id'),
        ]

    def __str__(self):
        return f'Review({self.document_id}, {self.status})'


class DocumentDuplicate(CreatedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    file_hash = models.CharField(max_length=64)
    document_signature = models.JSONField(default=dict)
    original_document = models.ForeignKey(
        Document, on_delete=models.CASCADE, db_column='original_document_id'
    )
    detection_type = models.CharField(max_length=30, default='exact-hash')

    class Meta:
        db_table = 'document_duplicates'
        indexes = [
            models.Index(fields=['owner', 'file_hash'], name='idx_doc_dup_owner_hash'),
        ]


class ExtractedData(CreatedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id')
    # Which OCR attempt produced this row — null for rows written before
    # OCRJob existed, or by the direct-upload flow which doesn't create one.
    ocr_job = models.ForeignKey(
        OCRJob, on_delete=models.SET_NULL, db_column='ocr_job_id', null=True, blank=True, related_name='extracted_data'
    )
    field_name = models.CharField(max_length=100)
    field_value = models.TextField(null=True, blank=True)
    original_value = models.TextField(null=True, blank=True)
    corrected_value = models.TextField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    data_type = models.CharField(max_length=30, default='string')
    is_validated = models.BooleanField(default=False)
    validation_status = models.CharField(max_length=30, null=True, blank=True)
    corrected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='corrected_by',
        null=True, blank=True, related_name='corrected_extractions'
    )
    corrected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'extracted_data'
        verbose_name_plural = 'extracted data'
        indexes = [
            models.Index(fields=['document'], name='idx_extracted_doc_id'),
        ]


class DocumentLineItem(CreatedModel):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id')
    ocr_job = models.ForeignKey(
        OCRJob, on_delete=models.SET_NULL, db_column='ocr_job_id', null=True, blank=True, related_name='line_items'
    )
    line_number = models.IntegerField(null=True, blank=True)
    property_name = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField()
    category = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    item_type = models.CharField(max_length=20, default='expense')
    included_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    is_converted = models.BooleanField(default=False)
    transaction = models.ForeignKey(
        'transactions.Transaction', on_delete=models.SET_NULL, db_column='transaction_id',
        null=True, blank=True
    )

    class Meta:
        db_table = 'document_line_items'
        indexes = [
            models.Index(fields=['document'], name='idx_line_items_doc_id'),
        ]


class OcrTemplate(TimeStampedModel):
    """
    Admin-facing registry of the document types OCR is expected to handle
    (spec: "OCR Template Management" — enable/disable, confidence
    threshold, version). Deliberately informational/toggleable metadata,
    not a parsing engine: extraction itself runs client-side (Tesseract in
    the browser) using fixed keyword logic in apps.ocr.parser /
    statement_parser, not a template lookup. `document_type` is the value
    that already gets written to Document.document_type by the client, so
    the admin panel can show accurate per-type stats without this table
    controlling how parsing actually happens.
    """
    STATUS_CHOICES = [('enabled', 'enabled'), ('disabled', 'disabled')]

    name = models.CharField(max_length=100)
    document_type = models.CharField(max_length=50, unique=True)
    confidence_threshold = models.FloatField(default=70.0)
    version = models.CharField(max_length=20, default='1.0')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='enabled')
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'ocr_templates'
        ordering = ['name']

    def __str__(self):
        return self.name
