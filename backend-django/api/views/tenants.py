"""
Tenant endpoints — port of backend/src/controllers/tenantController.js.
"""
from datetime import datetime, timezone

from django.db.models import Count, Q, Sum
from rest_framework.response import Response

from ..exceptions import error_response
from ..models import Property, Tenant, Transaction
from ..utils import (
    coerce_date,
    get_pagination,
    log_activity,
    model_row,
    pagination_payload,
    to_snake,
)
from .base import ProtectedView

ALLOWED_UPDATE_FIELDS = [
    'name', 'email', 'phone', 'property_id', 'unit', 'lease_start', 'lease_end',
    'monthly_rent', 'security_deposit', 'rent_due_day', 'status',
    'emergency_contact', 'documents', 'move_in_date', 'move_out_date', 'notes',
]

DATE_FIELDS = {'lease_start', 'lease_end', 'move_in_date', 'move_out_date'}


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


def update_property_occupancy(property_id):
    active_count = Tenant.objects.filter(property_id=property_id, status='active').count()
    Property.objects.filter(id=property_id).update(occupancy=active_count)


class TenantListView(ProtectedView):
    def get(self, request):
        qs = Tenant.objects.filter(owner_id=request.user.id).select_related('property')

        params = request.query_params
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search))

        page, limit, offset = get_pagination(request)
        total = qs.count()
        tenants = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'tenants': [tenant_row(t) for t in tenants],
                'pagination': pagination_payload(page, limit, total),
            },
        })

    def post(self, request):
        data = request.data
        property_id = data.get('propertyId')

        if not Property.objects.filter(id=property_id, owner_id=request.user.id).exists():
            return error_response('Property not found or does not belong to you', 400)

        tenant = Tenant.objects.create(
            owner_id=request.user.id,
            property_id=property_id,
            name=data.get('name'),
            email=data.get('email') or None,
            phone=data.get('phone') or None,
            unit=data.get('unit') or '1',
            lease_start=coerce_date(data.get('leaseStart')),
            lease_end=coerce_date(data.get('leaseEnd')),
            monthly_rent=data.get('monthlyRent'),
            security_deposit=data.get('securityDeposit') or 0,
            rent_due_day=data.get('rentDueDay') or 1,
            status=data.get('status') or 'pending',
            emergency_contact=data.get('emergencyContact') or {},
            documents=data.get('documents') or [],
            move_in_date=coerce_date(data.get('moveInDate')) or None,
            move_out_date=coerce_date(data.get('moveOutDate')) or None,
            notes=data.get('notes') or None,
        )

        update_property_occupancy(property_id)

        log_activity(request.user.id, 'tenant_create', request=request,
                     resource_type='tenant', resource_id=tenant.id, success=True)

        return Response({
            'success': True,
            'data': {'tenant': model_row(tenant)},
            'message': 'Tenant created successfully',
        }, status=201)


class TenantDetailView(ProtectedView):
    def get(self, request, tenant_id):
        tenant = Tenant.objects.filter(
            id=tenant_id, owner_id=request.user.id
        ).select_related('property').first()
        if not tenant:
            return error_response('Tenant not found', 404)

        payments = Transaction.objects.filter(
            tenant_id=tenant_id, type='income'
        ).order_by('-date')[:10]

        row = tenant_row(tenant)
        row['paymentHistory'] = [model_row(p) for p in payments]

        return Response({'success': True, 'data': {'tenant': row}})

    def put(self, request, tenant_id):
        tenant = Tenant.objects.filter(id=tenant_id, owner_id=request.user.id).first()
        if not tenant:
            return error_response('Tenant not found', 404)

        old_property_id = tenant.property_id

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in ALLOWED_UPDATE_FIELDS:
                if snake_key in DATE_FIELDS:
                    value = coerce_date(value)
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        for field, value in updates.items():
            setattr(tenant, field, value)
        tenant.save()

        # Update property occupancy if status or property changed
        new_property_id = request.data.get('propertyId')
        if request.data.get('status') or new_property_id:
            update_property_occupancy(old_property_id)
            if new_property_id and str(new_property_id) != str(old_property_id):
                update_property_occupancy(new_property_id)

        log_activity(request.user.id, 'tenant_update', request=request,
                     resource_type='tenant', resource_id=tenant_id, success=True)

        return Response({
            'success': True,
            'data': {'tenant': model_row(tenant)},
            'message': 'Tenant updated successfully',
        })

    def delete(self, request, tenant_id):
        tenant = Tenant.objects.filter(id=tenant_id, owner_id=request.user.id).first()
        if not tenant:
            return error_response('Tenant not found', 404)

        property_id = tenant.property_id
        tenant.delete()
        update_property_occupancy(property_id)

        log_activity(request.user.id, 'tenant_delete', request=request,
                     resource_type='tenant', resource_id=tenant_id, success=True)

        return Response({'success': True, 'message': 'Tenant deleted successfully'})


class TenantStatsView(ProtectedView):
    def get(self, request):
        qs = Tenant.objects.filter(owner_id=request.user.id)
        if request.query_params.get('propertyId'):
            qs = qs.filter(property_id=request.query_params['propertyId'])

        status_counts = {
            row['status']: row['count']
            for row in qs.values('status').annotate(count=Count('id'))
        }

        totals = qs.aggregate(
            total_tenants=Count('id'),
            total_monthly_rent=Sum('monthly_rent'),
            total_security_deposits=Sum('security_deposit'),
        )

        return Response({
            'success': True,
            'data': {
                'stats': {
                    'totalTenants': totals['total_tenants'] or 0,
                    'totalMonthlyRent': float(totals['total_monthly_rent'] or 0),
                    'totalSecurityDeposits': float(totals['total_security_deposits'] or 0),
                    'byStatus': status_counts,
                },
            },
        })
