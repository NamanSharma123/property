from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.common.models import TimeStampedModel


class Property(TimeStampedModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id')
    name = models.CharField(max_length=200)
    address = models.JSONField(default=dict)
    full_address = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=50, default='residential')
    sub_type = models.CharField(max_length=50, null=True, blank=True)
    units = models.IntegerField(default=1)
    occupancy = models.IntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    square_feet = models.IntegerField(null=True, blank=True)
    lot_size = models.IntegerField(null=True, blank=True)
    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    amenities = ArrayField(models.TextField(), null=True, blank=True, default=list)
    description = models.TextField(null=True, blank=True)
    images = models.JSONField(default=list)
    status = models.CharField(max_length=20, default='active')
    tax_id = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    loan_details = models.JSONField(default=dict)
    ownership_details = models.JSONField(default=dict)
    ownership = models.CharField(max_length=100, null=True, blank=True)
    has_depreciation = models.BooleanField(default=False)
    usage = models.CharField(max_length=50, null=True, blank=True)
    abn = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'properties'
        verbose_name_plural = 'properties'
        indexes = [
            models.Index(fields=['owner'], name='idx_properties_owner_id'),
            models.Index(fields=['status'], name='idx_properties_status'),
        ]

    def __str__(self):
        return self.name
