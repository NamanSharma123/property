from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Expense(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, db_column='property_id')
    category = models.ForeignKey(
        'categories.Category', on_delete=models.SET_NULL, db_column='category_id', null=True, blank=True
    )
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    category_name = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    vendor = models.JSONField(default=dict)
    receipt_url = models.TextField(null=True, blank=True)
    attachments = models.JSONField(default=list)
    payment_method = models.CharField(max_length=30, null=True, blank=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=True)
    tax_category = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='created_by',
        null=True, blank=True, related_name='created_expenses'
    )

    class Meta:
        db_table = 'expenses'
        indexes = [
            models.Index(fields=['owner'], name='idx_expenses_owner_id'),
            models.Index(fields=['property'], name='idx_expenses_property_id'),
            models.Index(fields=['-date'], name='idx_expenses_date'),
            models.Index(fields=['status'], name='idx_expenses_status'),
        ]

    def __str__(self):
        return self.description
