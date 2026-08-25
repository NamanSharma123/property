"""
Shared helpers for the admin panel: audit logging (mirrors
apps.common.utils.log_activity, but writes AdminAuditLog instead of
ActivityLog) and the dashboard's month-bucketed aggregates.
"""
from datetime import date

from apps.common.utils import get_ip, get_user_agent


def _add_months(d, delta):
    """First-of-month `date` shifted by `delta` months (positive or negative).
    Pure stdlib — avoids adding python-dateutil as a new direct dependency
    for something this simple."""
    month_index = d.month - 1 + delta
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    return date(year, month, 1)


def log_admin_action(admin_user, action, request=None, entity_type=None, entity_id=None,
                      old_value=None, new_value=None):
    from .models import AdminAuditLog

    try:
        AdminAuditLog.objects.create(
            admin=admin_user,
            action=action,
            entity_type=entity_type or '',
            entity_id=str(entity_id) if entity_id is not None else None,
            old_value=old_value,
            new_value=new_value,
            ip_address=get_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
        )
    except Exception as exc:  # never let audit logging break a request
        print(f'Error logging admin action: {exc}')


def month_buckets(months=6):
    """Last `months` calendar months (oldest first) as (label, start, end) —
    end is exclusive, both are `date`s. Used for simple, DB-portable trend
    charts (filter+count per bucket) instead of relying on DB-specific date
    truncation functions."""
    this_month_start = date.today().replace(day=1)
    buckets = []
    for i in range(months - 1, -1, -1):
        start = _add_months(this_month_start, -i)
        end = _add_months(start, 1)
        buckets.append((start.strftime('%Y-%m'), start, end))
    return buckets


def monthly_counts(queryset, date_field, months=6):
    """[{month: 'YYYY-MM', count: N}, ...] for the last `months` months,
    counting rows of `queryset` whose `date_field` falls in each bucket."""
    results = []
    for label, start, end in month_buckets(months):
        filter_kwargs = {f'{date_field}__gte': start, f'{date_field}__lt': end}
        results.append({'month': label, 'count': queryset.filter(**filter_kwargs).count()})
    return results
