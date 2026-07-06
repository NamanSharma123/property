"""
Tenant row serialization with the computed lease fields the Express
controller added (leaseStatus, daysUntilLeaseEnd).
"""
from datetime import datetime, timezone

from apps.common.utils import model_row


def lease_computed_fields(tenant):
    now = datetime.now(timezone.utc)
    lease_end = datetime(tenant.lease_end.year, tenant.lease_end.month, tenant.lease_end.day,
                         tzinfo=timezone.utc)
    lease_start = datetime(tenant.lease_start.year, tenant.lease_start.month, tenant.lease_start.day,
                           tzinfo=timezone.utc)

    if lease_end < now:
        lease_status = 'expired'
    elif lease_start > now:
        lease_status = 'upcoming'
    else:
        lease_status = 'active'

    days_until_lease_end = -(-int((lease_end - now).total_seconds()) // 86400)  # ceil
    return lease_status, days_until_lease_end


def tenant_row(tenant, include_property_name=True):
    extras = {}
    if include_property_name:
        extras['property_name'] = tenant.property.name if tenant.property_id else None
    lease_status, days_left = lease_computed_fields(tenant)
    extras['leaseStatus'] = lease_status
    extras['daysUntilLeaseEnd'] = days_left
    return model_row(tenant, **extras)
