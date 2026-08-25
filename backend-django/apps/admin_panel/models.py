"""
Admin-panel-only tables. Everything else the admin panel shows (users,
properties, transactions, documents, activity) reads the existing domain
tables directly — nothing is duplicated here.
"""
from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel


class AdminAuditLog(CreatedModel):
    """Tracks every admin-panel mutation (who did what to which record).
    Deliberately separate from apps.accounts.models.ActivityLog, which logs
    per-user security/account events (login, password change, ...) and
    backs the Users module's "Activity" tab instead."""

    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='admin_id',
        null=True, blank=True, related_name='+',
    )
    action = models.CharField(max_length=100)  # e.g. 'user.suspend', 'user.edit'
    entity_type = models.CharField(max_length=50)  # 'user', 'property', ...
    entity_id = models.CharField(max_length=64, null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'admin_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['admin'], name='idx_admin_audit_admin_id'),
            models.Index(fields=['entity_type', 'entity_id'], name='idx_admin_audit_entity'),
            models.Index(fields=['-created_at'], name='idx_admin_audit_created_at'),
        ]

    def __str__(self):
        return f'{self.action} on {self.entity_type}:{self.entity_id}'


class PlatformSetting(models.Model):
    """Simple admin-editable key/value store, for the *non-secret* settings
    the spec asks for (Company Branding, Theme, Logo, default subscription
    terms). Deliberately does NOT hold API keys/credentials (Postal API,
    OCR API, AWS SES/S3, Basiq, SMTP) — those stay in environment variables
    / deployment secrets as they already are (see config/settings/base.py),
    surfaced in the Settings page as read-only "configured / not configured"
    status rather than editable plaintext, since exposing live credentials
    through a web form is a real security surface the spec's own module
    list doesn't need to reopen."""
    key = models.CharField(max_length=100, primary_key=True)
    value = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='updated_by', null=True, blank=True
    )

    class Meta:
        db_table = 'platform_settings'

    def __str__(self):
        return self.key
