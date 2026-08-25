"""
Manual loan records, linked to a property. Previously loan data only lived
as an unstructured JSON blob on Property.loan_details — this is the first
real Loan table (net-new; nothing existing to reuse/port). `owner` is
denormalized onto the loan itself (rather than derived through `property`)
so admin/user queries can filter by owner directly, matching the existing
Transaction/Document pattern.

`basiq_status`/`basiq_account_id` are placeholders for the future Basiq
open-banking sync (Connect/Sync/Disconnect buttons in the admin UI) — no
live Basiq integration exists yet, this just reserves the shape.
"""
from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Loan(TimeStampedModel):
    STATUS_CHOICES = [('active', 'active'), ('closed', 'closed'), ('refinanced', 'refinanced')]
    BASIQ_STATUS_CHOICES = [('not_connected', 'not_connected'), ('connected', 'connected')]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(
        'properties.Property', on_delete=models.CASCADE, db_column='property_id', related_name='loans'
    )
    lender = models.CharField(max_length=200)
    loan_number = models.CharField(max_length=100, null=True, blank=True)
    principal = models.DecimalField(max_digits=15, decimal_places=2)
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    monthly_repayment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    offset_balance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    redraw_available = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    basiq_account_id = models.CharField(max_length=100, null=True, blank=True)
    basiq_status = models.CharField(max_length=20, choices=BASIQ_STATUS_CHOICES, default='not_connected')
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'loans'
        indexes = [
            models.Index(fields=['owner'], name='idx_loans_owner_id'),
            models.Index(fields=['property'], name='idx_loans_property_id'),
            models.Index(fields=['status'], name='idx_loans_status'),
        ]

    def __str__(self):
        return f'{self.lender} loan on property {self.property_id}'
