"""
User-scoped loan endpoints — same shape/conventions as apps.properties and
apps.transactions (owner-scoped queries, functional row serializers,
{success, data} envelopes). Not wired into any user-portal page yet (the
existing /dashboard/bank page is still a UI mock — see frontend README
notes); this exists so the admin panel's cross-user loan views
(apps.admin_panel) have a real table to manage, and so a future real
"Loans & Banking" user page can be wired to this API unchanged.
"""
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, log_activity, to_snake
from apps.common.views import ProtectedView
from apps.properties.models import Property

from .models import Loan
from .serializers import loan_row

ALLOWED_UPDATE_FIELDS = [
    'lender', 'loan_number', 'principal', 'current_balance', 'interest_rate',
    'monthly_repayment', 'offset_balance', 'redraw_available', 'start_date',
    'end_date', 'status', 'notes',
]
DATE_FIELDS = {'start_date', 'end_date'}


class LoanListView(ProtectedView):
    def get(self, request):
        qs = Loan.objects.filter(owner_id=request.user.id).select_related('property')

        if request.query_params.get('propertyId'):
            qs = qs.filter(property_id=request.query_params['propertyId'])
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])

        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        loans = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'loans': [loan_row(l) for l in loans],
                'pagination': pagination_payload(page, limit, total),
            },
        })

    def post(self, request):
        data = request.data
        property_id = data.get('propertyId')

        prop = Property.objects.filter(id=property_id, owner_id=request.user.id).first()
        if not prop:
            return error_response('Property not found or does not belong to you', 404)

        if not data.get('lender'):
            return error_response('Lender is required', 400)
        if not data.get('principal'):
            return error_response('Principal is required', 400)

        loan = Loan.objects.create(
            owner_id=request.user.id,
            property_id=property_id,
            lender=data.get('lender'),
            loan_number=data.get('loanNumber') or None,
            principal=data.get('principal'),
            current_balance=data.get('currentBalance') or data.get('principal'),
            interest_rate=data.get('interestRate') or None,
            monthly_repayment=data.get('monthlyRepayment') or None,
            offset_balance=data.get('offsetBalance') or None,
            redraw_available=data.get('redrawAvailable') or None,
            start_date=coerce_date(data.get('startDate')) or None,
            end_date=coerce_date(data.get('endDate')) or None,
            status=data.get('status') or 'active',
            notes=data.get('notes') or None,
        )

        log_activity(request.user.id, 'loan_create', request=request,
                     resource_type='loan', resource_id=loan.id, success=True)

        return Response({
            'success': True,
            'data': {'loan': loan_row(loan)},
            'message': 'Loan created successfully',
        }, status=201)


class LoanDetailView(ProtectedView):
    def get(self, request, loan_id):
        loan = Loan.objects.filter(id=loan_id, owner_id=request.user.id).select_related('property').first()
        if not loan:
            return error_response('Loan not found', 404)
        return Response({'success': True, 'data': {'loan': loan_row(loan)}})

    def put(self, request, loan_id):
        loan = Loan.objects.filter(id=loan_id, owner_id=request.user.id).first()
        if not loan:
            return error_response('Loan not found', 404)

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
            setattr(loan, field, value)
        loan.save()

        log_activity(request.user.id, 'loan_update', request=request,
                     resource_type='loan', resource_id=loan_id, success=True)

        return Response({
            'success': True,
            'data': {'loan': loan_row(loan)},
            'message': 'Loan updated successfully',
        })

    def delete(self, request, loan_id):
        deleted, _ = Loan.objects.filter(id=loan_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Loan not found', 404)

        log_activity(request.user.id, 'loan_delete', request=request,
                     resource_type='loan', resource_id=loan_id, success=True)

        return Response({'success': True, 'message': 'Loan deleted successfully'})
