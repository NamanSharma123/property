"""
Notification creation helpers (port of the helper exports in
backend/src/controllers/notificationController.js).
"""
from .models import Notification


def create_notification(user_id, type_, title, message, action_url=None, metadata=None):
    try:
        return Notification.objects.create(
            user_id=user_id,
            type=type_,
            title=title,
            message=message,
            action_url=action_url,
            metadata=metadata or {},
        )
    except Exception as exc:
        print(f'Failed to create notification: {exc}')
        return None


def notify_welcome(user_id, user_name):
    return create_notification(
        user_id,
        'welcome',
        'Welcome to Properly! 👋',
        f'Hi {user_name}! Get started by adding your first property to track your investments.',
        '/dashboard/property/new',
        {'onboarding': True},
    )


def notify_ocr(user_id, success, transaction_count=0, file_name=None):
    if success:
        return create_notification(
            user_id,
            'ocr_complete',
            'OCR Processing Complete',
            f'Successfully extracted {transaction_count} transaction(s)'
            + (f' from "{file_name}"' if file_name else '') + '.',
            '/dashboard/transactions',
            {'transactionCount': transaction_count, 'fileName': file_name},
        )
    return create_notification(
        user_id,
        'ocr_failed',
        'OCR Processing Failed',
        'Could not extract data' + (f' from "{file_name}"' if file_name else '') + '.',
        '/dashboard/ocr',
        {'fileName': file_name},
    )
