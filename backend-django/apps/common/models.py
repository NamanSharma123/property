"""
Abstract base models shared by domain apps. This app defines NO concrete
models of its own (nothing to migrate).
"""
import uuid

from django.db import models


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class CreatedModel(UUIDModel):
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class TimeStampedModel(CreatedModel):
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
