"""
Expense endpoints — port of backend/src/controllers/expenseController.js.
"""
from datetime import date as date_cls

from django.db.models import Count, Sum
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, log_activity, model_row, to_snake
from apps.common.views import ProtectedView
from apps.properties.models import Property

from .models import Expense
from .serializers import expense_row

ALLOWED_UPDATE_FIELDS = [
    'description', 'amount', 'date', 'category_id', 'category_name', 'property_id',
    'status', 'vendor', 'receipt_url', 'attachments', 'payment_method',
    'reference_number', 'paid_date', 'is_recurring', 'recurring_frequency',
    'notes', 'is_tax_deductible', 'tax_category',
]

DATE_FIELDS = {'date', 'paid_date'}


def _apply_filters(qs, params):
    if params.get('status'):
        qs = qs.filter(status=params['status'])
    if params.get('propertyId'):
        qs = qs.filter(property_id=params['propertyId'])
    if params.get('categoryId'):
        qs = qs.filter(category_id=params['categoryId'])
    if params.get('startDate'):
        qs = qs.filter(date__gte=coerce_date(params['startDate']))
    if params.get('endDate'):
        qs = qs.filter(date__lte=coerce_date(params['endDate']))
    return qs


class ExpenseListView(ProtectedView):
    def get(self, request):
        qs = Expense.objects.filter(owner_id=request.user.id).select_related('property', 'category')
        qs = _apply_filters(qs, request.query_params)

        page, limit, offset = get_pagination(request)
        total = qs.count()
        expenses = qs.order_by('-date', '-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'expenses': [expense_row(e) for e in expenses],
                'pagination': pagination_payload(page, limit, total),
            },
        })

    def post(self, request):
        data = request.data
        property_id = data.get('propertyId')

        if not Property.objects.filter(id=property_id, owner_id=request.user.id).exists():
            return error_response('Property not found or does not belong to you', 400)

        expense = Expense.objects.create(
            owner_id=request.user.id,
            property_id=property_id,
            category_id=data.get('categoryId') or None,
            description=data.get('description'),
            amount=data.get('amount'),
            date=coerce_date(data.get('date')) or date_cls.today().isoformat(),
            category_name=data.get('categoryName') or None,
            status=data.get('status') or 'pending',
            vendor=data.get('vendor') or {},
            receipt_url=data.get('receiptUrl') or None,
            attachments=data.get('attachments') or [],
            payment_method=data.get('paymentMethod') or None,
            reference_number=data.get('referenceNumber') or None,
            paid_date=coerce_date(data.get('paidDate')) or None,
            is_recurring=data.get('isRecurring') or False,
            recurring_frequency=data.get('recurringFrequency') or None,
            notes=data.get('notes') or None,
            is_tax_deductible=data.get('isTaxDeductible') is not False,
            tax_category=data.get('taxCategory') or None,
            created_by_id=request.user.id,
        )

        log_activity(request.user.id, 'expense_create', request=request,
                     resource_type='expense', resource_id=expense.id, success=True)

        return Response({
            'success': True,
            'data': {'expense': model_row(expense)},
            'message': 'Expense created successfully',
        }, status=201)


class ExpenseDetailView(ProtectedView):
    def get(self, request, expense_id):
        expense = Expense.objects.filter(
            id=expense_id, owner_id=request.user.id
        ).select_related('property', 'category').first()
        if not expense:
            return error_response('Expense not found', 404)

        return Response({'success': True, 'data': {'expense': expense_row(expense)}})

    def put(self, request, expense_id):
        expense = Expense.objects.filter(id=expense_id, owner_id=request.user.id).first()
        if not expense:
            return error_response('Expense not found', 404)

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
            setattr(expense, field, value)
        expense.save()

        log_activity(request.user.id, 'expense_update', request=request,
                     resource_type='expense', resource_id=expense_id, success=True)

        return Response({
            'success': True,
            'data': {'expense': model_row(expense)},
            'message': 'Expense updated successfully',
        })

    def delete(self, request, expense_id):
        deleted, _ = Expense.objects.filter(id=expense_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Expense not found', 404)

        log_activity(request.user.id, 'expense_delete', request=request,
                     resource_type='expense', resource_id=expense_id, success=True)

        return Response({'success': True, 'message': 'Expense deleted successfully'})


class ExpenseStatsView(ProtectedView):
    def get(self, request):
        qs = Expense.objects.filter(owner_id=request.user.id)
        params = request.query_params
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('startDate'):
            qs = qs.filter(date__gte=coerce_date(params['startDate']))
        if params.get('endDate'):
            qs = qs.filter(date__lte=coerce_date(params['endDate']))

        status_rows = qs.values('status').annotate(count=Count('id'), total=Sum('amount'))
        category_rows = qs.values('category_name').annotate(
            count=Count('id'), total=Sum('amount')
        ).order_by('-total')

        by_status = {
            row['status']: {'count': row['count'], 'total': float(row['total'] or 0)}
            for row in status_rows
        }

        stats = {
            'byStatus': by_status,
            'byCategory': [
                {
                    'category': row['category_name'] or 'Uncategorized',
                    'count': row['count'],
                    'total': float(row['total'] or 0),
                }
                for row in category_rows
            ],
            'total': sum(v['total'] for v in by_status.values()),
        }

        return Response({'success': True, 'data': {'stats': stats}})
