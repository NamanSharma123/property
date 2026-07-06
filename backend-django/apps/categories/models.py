from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel


class Category(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='owner_id', null=True, blank=True
    )
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20)
    description = models.CharField(max_length=500, null=True, blank=True)
    icon = models.CharField(max_length=50, null=True, blank=True)
    color = models.CharField(max_length=20, default='#6B7280')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, db_column='parent_id', null=True, blank=True)
    is_system = models.BooleanField(default=False)
    tax_code = models.CharField(max_length=50, null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'categories'
        indexes = [
            models.Index(fields=['type'], name='idx_categories_type'),
            models.Index(fields=['owner'], name='idx_categories_owner_id'),
            models.Index(fields=['is_system'], name='idx_categories_is_system'),
        ]

    def __str__(self):
        return self.name
