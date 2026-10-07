"""
Transaction endpoints — port of backend/src/controllers/transactionController.js.
"""
from datetime import date as date_cls
from decimal import Decimal, InvalidOperation

from django.db.models import Count, Q, Sum
from django.db.models.functions import ExtractMonth
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, log_activity, model_row, parse_int, to_snake
from apps.common.views import ProtectedView
from apps.properties.models import Property

from .models import Transaction
from .serializers import transaction_row

JOIN_EXTRAS = ('property', 'tenant', 'category', 'source_document')

ALLOWED_UPDATE_FIELDS = [
    'description', 'amount', 'date', 'type', 'category_id', 'category_name',
    'unit_label', 'property_id', 'tenant_id', 'status', 'payment_method',
    'reference_number', 'receipt_url', 'attachments', 'is_recurring',
    'recurring_frequency', 'recurring_end_date', 'notes', 'is_tax_deductible',
    'tax_category',
]

DATE_FIELDS = {'date', 'recurring_end_date'}


class TransactionListView(ProtectedView):
    def get(self, request):
        qs = Transaction.objects.filter(owner_id=request.user.id).select_related(*JOIN_EXTRAS)

        params = request.query_params
        if params.get('type'):
            qs = qs.filter(type=params['type'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('startDate'):
            qs = qs.filter(date__gte=coerce_date(params['startDate']))
        if params.get('endDate'):
            qs = qs.filter(date__lte=coerce_date(params['endDate']))

        page, limit, offset = get_pagination(request)
        total = qs.count()
        transactions = qs.order_by('-date', '-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'transactions': [transaction_row(t, signed=True) for t in transactions],
                'pagination': pagination_payload(page, limit, total),
            },
        })

    def post(self, request):
        data = request.data
        property_id = data.get('propertyId')

        prop = Property.objects.filter(id=property_id, owner_id=request.user.id).first()
        if not prop:
            return error_response('Property not found or does not belong to you', 404)

        tx_date = coerce_date(data.get('date')) or date_cls.today().isoformat()

        # Duplicate check: same property, amount, date, description, category and type
        try:
            dup_amount = Decimal(str(data.get('amount')))
        except (InvalidOperation, TypeError):
            dup_amount = None

        dup_qs = Transaction.objects.filter(
            property_id=property_id,
            date=tx_date,
            type=data.get('type'),
            owner_id=request.user.id,
        )
        if dup_amount is not None:
            dup_qs = dup_qs.filter(amount=dup_amount)

        dup_description = data.get('description') or ''
        dup_qs = dup_qs.filter(description=dup_description)

        dup_category = data.get('categoryName') or ''
        if dup_category:
            dup_qs = dup_qs.filter(category_name=dup_category)
        else:
            dup_qs = dup_qs.filter(Q(category_name='') | Q(category_name__isnull=True))

        # Different units can legitimately have identical-looking transactions
        # (e.g. the same rent amount on the same day for Unit A and Unit B).
        dup_unit = data.get('unitLabel') or ''
        if dup_unit:
            dup_qs = dup_qs.filter(unit_label=dup_unit)
        else:
            dup_qs = dup_qs.filter(Q(unit_label='') | Q(unit_label__isnull=True))

        duplicate = dup_qs.first()
        if duplicate:
            return error_response(
                'A duplicate transaction with the same details already exists.',
                409,
                duplicateId=str(duplicate.id),
            )

        transaction = Transaction.objects.create(
            owner_id=request.user.id,
            property_id=property_id,
            tenant_id=data.get('tenantId') or None,
            category_id=data.get('categoryId') or None,
            description=data.get('description'),
            amount=data.get('amount'),
            date=tx_date,
            type=data.get('type'),
            category_name=data.get('categoryName') or None,
            unit_label=data.get('unitLabel') or None,
            transaction_source=data.get('transactionSource') or 'Manual Entry',
            status=data.get('status') or 'pending',
            payment_method=data.get('paymentMethod') or None,
            reference_number=data.get('referenceNumber') or None,
            receipt_url=data.get('receiptUrl') or None,
            attachments=data.get('attachments') or [],
            is_recurring=data.get('isRecurring') or False,
            recurring_frequency=data.get('recurringFrequency') or None,
            recurring_end_date=coerce_date(data.get('recurringEndDate')) or None,
            notes=data.get('notes') or None,
            is_tax_deductible=data.get('isTaxDeductible') or False,
            tax_category=data.get('taxCategory') or None,
            created_by_id=request.user.id,
        )

        log_activity(request.user.id, 'transaction_create', request=request,
                     resource_type='transaction', resource_id=transaction.id, success=True)

        return Response({
            'success': True,
            'data': {'transaction': model_row(transaction)},
            'message': 'Transaction created successfully',
        }, status=201)


class TransactionDetailView(ProtectedView):
    def get(self, request, transaction_id):
        transaction = Transaction.objects.filter(
            id=transaction_id, owner_id=request.user.id
        ).select_related(*JOIN_EXTRAS).first()
        if not transaction:
            return error_response('Transaction not found', 404)

        return Response({
            'success': True,
            'data': {'transaction': transaction_row(transaction)},
        })

    def put(self, request, transaction_id):
        transaction = Transaction.objects.filter(id=transaction_id, owner_id=request.user.id).first()
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

        for field, value in updates.items():
            setattr(transaction, field, value)
        transaction.save()

        log_activity(request.user.id, 'transaction_update', request=request,
                     resource_type='transaction', resource_id=transaction_id, success=True)

        return Response({
            'success': True,
            'data': {'transaction': model_row(transaction)},
            'message': 'Transaction updated successfully',
        })

    def delete(self, request, transaction_id):
        deleted, _ = Transaction.objects.filter(id=transaction_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Transaction not found', 404)

        log_activity(request.user.id, 'transaction_delete', request=request,
                     resource_type='transaction', resource_id=transaction_id, success=True)

        return Response({'success': True, 'message': 'Transaction deleted successfully'})


def _filtered_transactions(request):
    qs = Transaction.objects.filter(owner_id=request.user.id)
    params = request.query_params
    if params.get('propertyId'):
        qs = qs.filter(property_id=params['propertyId'])
    if params.get('startDate'):
        qs = qs.filter(date__gte=coerce_date(params['startDate']))
    if params.get('endDate'):
        qs = qs.filter(date__lte=coerce_date(params['endDate']))
    return qs


class TransactionStatsView(ProtectedView):
    def get(self, request):
        rows = _filtered_transactions(request).values('type', 'status').annotate(
            count=Count('id'), total=Sum('amount')
        )

        stats = {
            'income': {'total': 0, 'pending': 0, 'paid': 0, 'count': 0},
            'expense': {'total': 0, 'pending': 0, 'paid': 0, 'count': 0},
        }

        for row in rows:
            bucket = stats.get(row['type'])
            if bucket is None:
                continue
            total = float(row['total'] or 0)
            bucket['count'] += row['count']
            bucket['total'] += total
            if row['status'] == 'pending':
                bucket['pending'] += total
            elif row['status'] == 'paid':
                bucket['paid'] += total

        return Response({
            'success': True,
            'data': {
                'stats': stats,
                'netIncome': stats['income']['total'] - stats['expense']['total'],
            },
        })


class MonthlyBreakdownView(ProtectedView):
    def get(self, request):
        year = parse_int(request.query_params.get('year'), date_cls.today().year)

        qs = Transaction.objects.filter(owner_id=request.user.id, date__year=year)
        if request.query_params.get('propertyId'):
            qs = qs.filter(property_id=request.query_params['propertyId'])

        rows = qs.annotate(month=ExtractMonth('date')).values('month', 'type').annotate(
            total=Sum('amount'), count=Count('id')
        ).order_by('month')

        monthly = [{'month': i + 1, 'income': 0, 'expense': 0, 'net': 0} for i in range(12)]

        for row in rows:
            idx = row['month'] - 1
            total = float(row['total'] or 0)
            if row['type'] == 'income':
                monthly[idx]['income'] = total
            else:
                monthly[idx]['expense'] = total

        for month in monthly:
            month['net'] = month['income'] - month['expense']

        return Response({
            'success': True,
            'data': {'year': year, 'monthly': monthly},
        })
