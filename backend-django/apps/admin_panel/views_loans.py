"""
Cross-user Loans admin views, on top of apps.loans.Loan.
"""
from django.db.models import Q
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, model_row, to_snake
from apps.loans.models import Loan
from apps.loans.serializers import loan_row
from apps.properties.models import Property

from .base import AdminProtectedView
from .permissions import require_admin_role
from .utils import log_admin_action

ALLOWED_UPDATE_FIELDS = [
    'lender', 'loan_number', 'principal', 'current_balance', 'interest_rate',
    'monthly_repayment', 'offset_balance', 'redraw_available', 'start_date',
    'end_date', 'status', 'notes',
]
DATE_FIELDS = {'start_date', 'end_date'}


class AdminLoanListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Loan.objects.select_related('owner', 'property')

        if params.get('userId'):
            qs = qs.filter(owner_id=params['userId'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(lender__icontains=search) | Q(owner__name__icontains=search) | Q(owner__email__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        loans = qs.order_by('-created_at')[offset:offset + limit]

        rows = []
        for loan in loans:
            row = loan_row(loan)
            row['owner_name'] = loan.owner.name if loan.owner_id else None
            row['owner_email'] = loan.owner.email if loan.owner_id else None
            rows.append(row)

        return Response({
            'success': True,
            'data': {'loans': rows, 'pagination': pagination_payload(page, limit, total)},
        })

    def post(self, request):
        require_admin_role(request, allow_support=False)

        data = request.data
        property_id = data.get('propertyId')
        prop = Property.objects.filter(id=property_id).first()
        if not prop:
            return error_response('Property not found', 404)
        if not data.get('lender'):
            return error_response('Lender is required', 400)
        if not data.get('principal'):
            return error_response('Principal is required', 400)

        loan = Loan.objects.create(
            owner_id=prop.owner_id,
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

        log_admin_action(request.user, 'loan.create', request=request, entity_type='loan', entity_id=loan.id)

        return Response({
            'success': True,
            'data': {'loan': loan_row(loan)},
            'message': 'Loan created successfully',
        }, status=201)


class AdminLoanDetailView(AdminProtectedView):
    allow_support = False

    def put(self, request, loan_id):
        loan = Loan.objects.filter(id=loan_id).first()
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

        old_value = {field: getattr(loan, field) for field in updates if hasattr(loan, field)}
        for field, value in updates.items():
            setattr(loan, field, value)
        loan.save()

        log_admin_action(request.user, 'loan.edit', request=request, entity_type='loan',
                          entity_id=loan.id, old_value=old_value, new_value=updates)

        return Response({
            'success': True,
            'data': {'loan': loan_row(loan)},
            'message': 'Loan updated successfully',
        })

    def delete(self, request, loan_id):
        loan = Loan.objects.filter(id=loan_id).first()
        if not loan:
            return error_response('Loan not found', 404)

        snapshot = model_row(loan)
        loan.delete()

        log_admin_action(request.user, 'loan.delete', request=request, entity_type='loan',
                          entity_id=loan_id, old_value=snapshot)

        return Response({'success': True, 'message': 'Loan deleted successfully'})
