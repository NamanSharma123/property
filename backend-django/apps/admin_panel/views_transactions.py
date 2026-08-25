"""
Cross-user Transactions admin views. View is available to Support Admins;
every mutation (edit/delete/bulk actions) is Admin-only.
"""
from django.db.models import Q
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, model_row, to_snake
from apps.properties.models import Property
from apps.transactions.models import Transaction
from apps.transactions.serializers import transaction_row

from .base import AdminProtectedView
from .permissions import require_admin_role
from .utils import log_admin_action

ALLOWED_UPDATE_FIELDS = [
    'description', 'amount', 'date', 'type', 'category_id', 'category_name',
    'unit_label', 'status', 'payment_method', 'reference_number',
    'is_tax_deductible', 'tax_category', 'notes',
]
DATE_FIELDS = {'date'}


def _source_filter(qs, source):
    """source is one of 'ocr' | 'manual' | 'basiq' — maps onto the free-text
    transaction_source column the way the OCR/manual/Basiq pills in the
    wireframe distinguish them."""
    if source == 'ocr':
        return qs.filter(transaction_source__icontains='ocr')
    if source == 'manual':
        return qs.filter(transaction_source__icontains='manual')
    if source == 'basiq':
        return qs.filter(transaction_source__icontains='basiq')
    return qs


class AdminTransactionListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Transaction.objects.select_related('owner', 'property', 'tenant', 'category')

        if params.get('userId'):
            qs = qs.filter(owner_id=params['userId'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('categoryId'):
            qs = qs.filter(category_id=params['categoryId'])
        if params.get('type'):
            qs = qs.filter(type=params['type'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('source'):
            qs = _source_filter(qs, params['source'])
        if params.get('startDate'):
            qs = qs.filter(date__gte=coerce_date(params['startDate']))
        if params.get('endDate'):
            qs = qs.filter(date__lte=coerce_date(params['endDate']))
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(description__icontains=search) | Q(owner__name__icontains=search) | Q(owner__email__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        transactions = qs.order_by('-date', '-created_at')[offset:offset + limit]

        rows = []
        for t in transactions:
            row = transaction_row(t, signed=True)
            row['owner_name'] = t.owner.name if t.owner_id else None
            row['owner_email'] = t.owner.email if t.owner_id else None
            rows.append(row)

        return Response({
            'success': True,
            'data': {'transactions': rows, 'pagination': pagination_payload(page, limit, total)},
        })


class AdminTransactionDetailView(AdminProtectedView):
    allow_support = False

    def put(self, request, transaction_id):
        transaction = Transaction.objects.filter(id=transaction_id).first()
        if not transaction:
            return error_response('Transaction not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in ALLOWED_UPDATE_FIELDS:
                if snake_key in DATE_FIELDS:
                    value = coerce_date(value)
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        old_value = {field: getattr(transaction, field) for field in updates if hasattr(transaction, field)}
        for field, value in updates.items():
            setattr(transaction, field, value)
        transaction.save()

        log_admin_action(request.user, 'transaction.edit', request=request, entity_type='transaction',
                          entity_id=transaction.id, old_value=old_value, new_value=updates)

        return Response({
            'success': True,
            'data': {'transaction': transaction_row(transaction, signed=True)},
            'message': 'Transaction updated successfully',
        })

    def delete(self, request, transaction_id):
        transaction = Transaction.objects.filter(id=transaction_id).first()
        if not transaction:
            return error_response('Transaction not found', 404)

        snapshot = model_row(transaction)
        transaction.delete()

        log_admin_action(request.user, 'transaction.delete', request=request, entity_type='transaction',
                          entity_id=transaction_id, old_value=snapshot)

        return Response({'success': True, 'message': 'Transaction deleted successfully'})


class AdminTransactionBulkCategoryView(AdminProtectedView):
    allow_support = False

    def post(self, request):
        ids = request.data.get('ids') or []
        category_id = request.data.get('categoryId')
        category_name = request.data.get('categoryName')

        if not ids:
            return error_response('ids is required', 400)
        if not category_id and not category_name:
            return error_response('categoryId or categoryName is required', 400)

        updates = {}
        if category_id:
            updates['category_id'] = category_id
        if category_name:
            updates['category_name'] = category_name

        updated = Transaction.objects.filter(id__in=ids).update(**updates)

        log_admin_action(request.user, 'transaction.bulk_category', request=request, entity_type='transaction',
                          new_value={'ids': ids, **updates})

        return Response({'success': True, 'message': f'{updated} transaction(s) updated'})


class AdminTransactionBulkPropertyView(AdminProtectedView):
    allow_support = False

    def post(self, request):
        ids = request.data.get('ids') or []
        property_id = request.data.get('propertyId')

        if not ids:
            return error_response('ids is required', 400)
        if not property_id:
            return error_response('propertyId is required', 400)

        new_property = Property.objects.filter(id=property_id).first()
        if not new_property:
            return error_response('Property not found', 404)

        # Only reassign transactions that already belong to the new
        # property's owner — moving a transaction to a property owned by a
        # different user would silently orphan it from its own owner field.
        updated = Transaction.objects.filter(id__in=ids, owner_id=new_property.owner_id).update(property_id=property_id)
        skipped = len(ids) - updated

        log_admin_action(request.user, 'transaction.bulk_reassign_property', request=request, entity_type='transaction',
                          new_value={'ids': ids, 'propertyId': str(property_id)})

        message = f'{updated} transaction(s) reassigned'
        if skipped:
            message += f'; {skipped} skipped (different owner than the target property)'
        return Response({'success': True, 'message': message})
