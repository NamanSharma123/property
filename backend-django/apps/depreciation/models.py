"""
Quantity-surveyor depreciation schedule PDFs, parsed into a normalized
year-by-year Division 40 / Division 43 table per method (diminishing value /
prime cost) — see schedule_parser.py for the PDF parsing itself.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class DepreciationSchedule(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(
        'properties.Property', on_delete=models.CASCADE, db_column='property_id'
    )
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_size = models.BigIntegerField()
    # Best-effort detected from the PDF text, e.g. "Duo Tax", "Mitchell Brandtman".
    provider = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'depreciation_schedules'
        indexes = [
            models.Index(fields=['owner'], name='idx_dep_schedules_owner_id'),
            models.Index(fields=['property'], name='idx_dep_schedules_property_id'),
        ]

    def __str__(self):
        return self.file_name


class DepreciationScheduleYear(TimeStampedModel):
    METHOD_CHOICES = [
        ('diminishing_value', 'Diminishing Value'),
        ('prime_cost', 'Prime Cost'),
    ]

    schedule = models.ForeignKey(DepreciationSchedule, on_delete=models.CASCADE, db_column='schedule_id')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    financial_date = models.DateField()
    division_40_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    division_43_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'depreciation_schedule_years'
        indexes = [
            models.Index(fields=['schedule', 'method'], name='idx_dep_years_schedule_method'),
        ]
        ordering = ['sort_order']

    def __str__(self):
        return f'{self.schedule_id} {self.method} {self.financial_date}'
