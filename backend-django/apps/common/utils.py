"""
Shared helpers: row serialization (matching the raw pg-row JSON the Express
backend returned), value coercion, request metadata, and activity logging.
"""
import re
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal


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


def get_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def get_user_agent(request):
    return request.META.get('HTTP_USER_AGENT')


def log_activity(user_id, action, request=None, description=None, resource_type=None,
                 resource_id=None, success=True, error_message=None, metadata=None):
    from apps.accounts.models import ActivityLog

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
