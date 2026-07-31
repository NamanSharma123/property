from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Transaction(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, db_column='property_id')
    tenant = models.ForeignKey(
        'tenants.Tenant', on_delete=models.SET_NULL, db_column='tenant_id', null=True, blank=True
    )
    category = models.ForeignKey(
        'categories.Category', on_delete=models.SET_NULL, db_column='category_id', null=True, blank=True
    )
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    type = models.CharField(max_length=20)
    category_name = models.CharField(max_length=100, null=True, blank=True)
    # Which unit within a multi-unit property (duplex/block-of-units/rooming-house)
    # this transaction belongs to, e.g. "A" or "3" — matches the labels shown in
    # the property form's address preview. Null for single-dwelling properties.
    unit_label = models.CharField(max_length=50, null=True, blank=True)
    transaction_source = models.CharField(max_length=50, default='Manual Entry')
    status = models.CharField(max_length=20, default='pending')
    payment_method = models.CharField(max_length=30, null=True, blank=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    receipt_url = models.TextField(null=True, blank=True)
    attachments = models.JSONField(default=list)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, null=True, blank=True)
    recurring_end_date = models.DateField(null=True, blank=True)
    parent_transaction = models.ForeignKey(
        'self', on_delete=models.SET_NULL, db_column='parent_transaction_id', null=True, blank=True
    )
    source_document = models.ForeignKey(
        'ocr.Document', on_delete=models.SET_NULL, db_column='source_document_id',
        null=True, blank=True, related_name='transactions'
    )
    notes = models.TextField(null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=False)
    tax_category = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='created_by',
        null=True, blank=True, related_name='created_transactions'
    )

    class Meta:
        db_table = 'transactions'
        indexes = [
            models.Index(fields=['owner'], name='idx_transactions_owner_id'),
            models.Index(fields=['property'], name='idx_transactions_property_id'),
            models.Index(fields=['tenant'], name='idx_transactions_tenant_id'),
            models.Index(fields=['-date'], name='idx_transactions_date'),
            models.Index(fields=['type', 'status'], name='idx_transactions_type_status'),
        ]

    def __str__(self):
        return f'{self.type}: {self.description}'
