from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel


class Notification(CreatedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user'], name='idx_notifications_user_id'),
            models.Index(fields=['is_read'], name='idx_notifications_is_read'),
            models.Index(fields=['-created_at'], name='idx_notif_created_at'),
        ]

    def __str__(self):
        return self.title
