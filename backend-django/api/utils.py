"""
Shared helpers: row serialization (matching the raw pg-row JSON the Express
backend returned), pagination, activity logging, and notification creation.
"""
import math
import re
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from .models import ActivityLog, Notification


def to_snake(key):
    # Same conversion the Node controllers use: key.replace(/([A-Z])/g, '_$1').toLowerCase()
    return re.sub(r'([A-Z])', r'_\1', key).lower()


def json_value(value):
    """Serialize a field value the way node-postgres + res.json did."""
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, Decimal):
        # pg returns NUMERIC columns as strings
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    if isinstance(value, date):
        return value.isoformat()
    return value


def model_row(instance, **extra):
    """Serialize a model instance to a dict keyed by database column names,
    like the raw rows the Express controllers returned."""
    row = {}
    for field in instance._meta.concrete_fields:
        row[field.column] = json_value(getattr(instance, field.attname))
    row.update(extra)
    return row


def coerce_date(value):
    """Accept both 'YYYY-MM-DD' and full ISO datetime strings for DATE columns
    (Postgres accepted either from the Node backend)."""
    if isinstance(value, str) and 'T' in value:
        return value[:10]
    return value


def parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def get_pagination(request, default_limit=10):
    page = parse_int(request.query_params.get('page'), 1)
    limit = parse_int(request.query_params.get('limit'), default_limit)
    offset = (page - 1) * limit
    return page, limit, offset


def pagination_payload(page, limit, total):
    return {
        'page': page,
        'limit': limit,
        'total': total,
        'pages': math.ceil(total / limit) if limit else 0,
    }


def get_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT')


def log_activity(user_id, action, request=None, description=None, resource_type=None,
                 resource_id=None, success=True, error_message=None, metadata=None):
    try:
        ActivityLog.objects.create(
            user_id=user_id,
            action=action,
            description=description,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=get_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            success=success,
            error_message=error_message,
            metadata=metadata or {},
        )
    except Exception as exc:  # never let audit logging break a request
        print(f'Error logging activity: {exc}')


def format_user(user):
    """Matches formatUser in backend/src/controllers/authController.js."""
    return {
        'id': json_value(user.id),
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'uniqueId': user.unique_id,
        'phone': user.phone,
        'avatar': user.avatar,
        'isEmailVerified': user.is_email_verified,
        'accountStatus': user.account_status,
        'lastLogin': json_value(user.last_login),
        'createdAt': json_value(user.created_at),
        'updatedAt': json_value(user.updated_at),
    }


# ── Notification helpers (mirroring notificationController.js) ──

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
