"""
Event hooks — notifications created automatically on domain events.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver

from .services import notify_welcome


@receiver(post_save, sender='accounts.User')
def send_welcome_notification(sender, instance, created, **kwargs):
    """Same as the Node signup flow, which sent a welcome notification on
    account creation."""
    if created:
        notify_welcome(instance.id, instance.name)
