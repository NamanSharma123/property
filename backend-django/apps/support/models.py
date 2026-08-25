"""
Support tickets. Net-new (nothing existing to port — the current
frontend/app/dashboard/tickets page is a static UI mock with no backend).
A ticket is a thread: the first TicketMessage is the user's original
enquiry, every reply (user or admin) is another TicketMessage;
`is_internal_note` marks admin-only notes that never show to the user.
"""
from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel, TimeStampedModel


class Ticket(TimeStampedModel):
    PRIORITY_CHOICES = [('low', 'low'), ('medium', 'medium'), ('high', 'high'), ('urgent', 'urgent')]
    STATUS_CHOICES = [('open', 'open'), ('in_progress', 'in_progress'), ('resolved', 'resolved'), ('closed', 'closed')]
    CATEGORY_CHOICES = [
        ('billing', 'billing'), ('ocr', 'ocr'), ('bug', 'bug'),
        ('feature_request', 'feature_request'), ('other', 'other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    assigned_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='assigned_admin_id',
        null=True, blank=True, related_name='assigned_tickets'
    )

    class Meta:
        db_table = 'tickets'
        indexes = [
            models.Index(fields=['user'], name='idx_tickets_user_id'),
            models.Index(fields=['status'], name='idx_tickets_status'),
            models.Index(fields=['assigned_admin'], name='idx_tickets_assigned'),
        ]

    def __str__(self):
        return self.subject


class TicketMessage(CreatedModel):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, db_column='ticket_id', related_name='messages')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='author_id', null=True, blank=True
    )
    body = models.TextField()
    is_internal_note = models.BooleanField(default=False)

    class Meta:
        db_table = 'ticket_messages'
        indexes = [
            models.Index(fields=['ticket'], name='idx_ticket_msg_ticket_id'),
        ]
