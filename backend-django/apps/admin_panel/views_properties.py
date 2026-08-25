"""
Cross-user Properties admin views. Admins can view/edit/delete/transfer/
merge any property; Support Admins can view only (matches the Phase 1
permission matrix — GET stays allow_support=True at the class level,
every mutating method calls require_admin_role(allow_support=False)).
"""
from django.db import transaction as db_transaction
from django.db.models import Q
from rest_framework.response import Response

from apps.accounts.models import ActivityLog, User
from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import model_row, to_snake
from apps.depreciation.models import DepreciationSchedule
from apps.loans.models import Loan
from apps.loans.serializers import loan_row
from apps.ocr.models import Document
from apps.properties.models import Property
from apps.properties.serializers import build_full_address, map_property_type
from apps.transactions.models import Transaction

from .base import AdminProtectedView
from .permissions import require_admin_role
from .serializers import activity_log_row, property_admin_row
from .utils import log_admin_action

ALLOWED_UPDATE_FIELDS = [
    'name', 'address', 'type', 'sub_type', 'units', 'occupancy',
    'purchase_price', 'purchase_date', 'current_value', 'monthly_rent',
    'year_built', 'square_feet', 'lot_size', 'bedrooms', 'bathrooms',
    'status', 'notes',
]


class AdminPropertyListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Property.objects.select_related('owner')

        if params.get('search'):
            search = params['search']
            qs = qs.filter(
                Q(name__icontains=search) | Q(full_address__icontains=search) |
                Q(owner__name__icontains=search) | Q(owner__email__icontains=search)
            )
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('type'):
            qs = qs.filter(type=params['type'])
        if params.get('userId'):
            qs = qs.filter(owner_id=params['userId'])

        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        properties = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'properties': [property_admin_row(p) for p in properties],
                'pagination': pagination_payload(page, limit, total),
            },
        })


class AdminPropertyDetailView(AdminProtectedView):
    def get(self, request, property_id):
        prop = Property.objects.select_related('owner').filter(id=property_id).first()
        if not prop:
            return error_response('Property not found', 404)

        loans = Loan.objects.filter(property_id=property_id).order_by('-created_at')
        depreciation = DepreciationSchedule.objects.filter(property_id=property_id).order_by('-created_at')
        activity = ActivityLog.objects.filter(resource_type='property', resource_id=property_id).order_by('-created_at')[:15]

        row = property_admin_row(prop)
        row['loans'] = [loan_row(l) for l in loans]
        row['transactionsCount'] = Transaction.objects.filter(property_id=property_id).count()
        row['documentsCount'] = Document.objects.filter(property_id=property_id).count()
        row['depreciationSchedulesCount'] = depreciation.count()
        row['activity'] = [activity_log_row(a) for a in activity]

        return Response({'success': True, 'data': {'property': row}})

    def put(self, request, property_id):
        require_admin_role(request, allow_support=False)

        prop = Property.objects.filter(id=property_id).first()
        if not prop:
            return error_response('Property not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key not in ALLOWED_UPDATE_FIELDS:
                continue
            if snake_key == 'type':
                value = map_property_type(value)
            updates[snake_key] = value

        if isinstance(request.data.get('address'), dict):
            updates['full_address'] = build_full_address(request.data['address'])
            updates['address'] = request.data['address']

        if not updates:
            return error_response('No valid fields to update', 400)

        old_value = {field: getattr(prop, field) for field in updates if hasattr(prop, field)}
        for field, value in updates.items():
            setattr(prop, field, value)
        prop.save()

        log_admin_action(request.user, 'property.edit', request=request, entity_type='property',
                          entity_id=prop.id, old_value=old_value, new_value=updates)

        return Response({
            'success': True,
            'data': {'property': property_admin_row(prop)},
            'message': 'Property updated successfully',
        })

    def delete(self, request, property_id):
        require_admin_role(request, allow_support=False)

        prop = Property.objects.filter(id=property_id).first()
        if not prop:
            return error_response('Property not found', 404)

        snapshot = model_row(prop)
        prop.delete()

        log_admin_action(request.user, 'property.delete', request=request, entity_type='property',
                          entity_id=property_id, old_value=snapshot)

        return Response({'success': True, 'message': 'Property deleted successfully'})


class AdminPropertyTransferOwnershipView(AdminProtectedView):
    allow_support = False

    def post(self, request, property_id):
        new_owner_id = request.data.get('newOwnerId')
        if not new_owner_id:
            return error_response('newOwnerId is required', 400)

        prop = Property.objects.filter(id=property_id).first()
        if not prop:
            return error_response('Property not found', 404)

        new_owner = User.objects.filter(id=new_owner_id).first()
        if not new_owner:
            return error_response('New owner not found', 404)

        old_owner_id = prop.owner_id
        if str(old_owner_id) == str(new_owner_id):
            return error_response('Property already belongs to that user', 400)

        with db_transaction.atomic():
            prop.owner_id = new_owner_id
            prop.save(update_fields=['owner_id'])
            # Everything owned "through" this property moves with it, so the
            # new owner sees a consistent portfolio (not a property with
            # someone else's transactions/documents/loans attached).
            Transaction.objects.filter(property_id=property_id, owner_id=old_owner_id).update(owner_id=new_owner_id)
            Document.objects.filter(property_id=property_id, owner_id=old_owner_id).update(owner_id=new_owner_id)
            Loan.objects.filter(property_id=property_id, owner_id=old_owner_id).update(owner_id=new_owner_id)

        log_admin_action(request.user, 'property.transfer_ownership', request=request, entity_type='property',
                          entity_id=property_id, old_value={'ownerId': str(old_owner_id)},
                          new_value={'ownerId': str(new_owner_id)})

        return Response({
            'success': True,
            'data': {'property': property_admin_row(Property.objects.select_related('owner').get(id=property_id))},
            'message': f'Property transferred to {new_owner.name}',
        })


class AdminPropertyMergeView(AdminProtectedView):
    """POST /api/admin/properties/<id>/merge — {duplicatePropertyId}. Moves
    every transaction/document/loan/depreciation schedule off the duplicate
    and onto this property, then deletes the duplicate. Used when a user
    (or OCR) accidentally created the same property twice."""
    allow_support = False

    def post(self, request, property_id):
        duplicate_id = request.data.get('duplicatePropertyId')
        if not duplicate_id:
            return error_response('duplicatePropertyId is required', 400)
        if str(duplicate_id) == str(property_id):
            return error_response('Cannot merge a property into itself', 400)

        primary = Property.objects.filter(id=property_id).first()
        duplicate = Property.objects.filter(id=duplicate_id).first()
        if not primary or not duplicate:
            return error_response('Property not found', 404)

        with db_transaction.atomic():
            Transaction.objects.filter(property_id=duplicate_id).update(property_id=property_id)
            Document.objects.filter(property_id=duplicate_id).update(property_id=property_id)
            Loan.objects.filter(property_id=duplicate_id).update(property_id=property_id)
            DepreciationSchedule.objects.filter(property_id=duplicate_id).update(property_id=property_id)
            duplicate_snapshot = model_row(duplicate)
            duplicate.delete()

        log_admin_action(request.user, 'property.merge', request=request, entity_type='property',
                          entity_id=property_id, old_value={'mergedDuplicate': duplicate_snapshot})

        return Response({
            'success': True,
            'data': {'property': property_admin_row(Property.objects.select_related('owner').get(id=property_id))},
            'message': 'Properties merged successfully',
        })
