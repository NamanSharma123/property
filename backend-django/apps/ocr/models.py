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

    class Meta:
        db_table = 'documents'
        indexes = [
            models.Index(fields=['owner'], name='idx_documents_owner_id'),
            models.Index(fields=['status'], name='idx_documents_status'),
        ]

    def __str__(self):
        return self.file_name


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
