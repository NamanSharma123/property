from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Tenant(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey('properties.Property', on_delete=models.CASCADE, db_column='property_id')
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    unit = models.CharField(max_length=50, default='1')
    lease_start = models.DateField()
    lease_end = models.DateField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rent_due_day = models.IntegerField(default=1)
    status = models.CharField(max_length=20, default='pending')
    emergency_contact = models.JSONField(default=dict)
    documents = models.JSONField(default=list)
    move_in_date = models.DateField(null=True, blank=True)
    move_out_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'tenants'
        indexes = [
            models.Index(fields=['owner'], name='idx_tenants_owner_id'),
            models.Index(fields=['property'], name='idx_tenants_property_id'),
            models.Index(fields=['status'], name='idx_tenants_status'),
            models.Index(fields=['email'], name='idx_tenants_email'),
        ]

    def __str__(self):
        return self.name
