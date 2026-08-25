"""
Admin Reports. One view dispatching on ?type= rather than 8 near-identical
endpoints — each report is a small aggregate query over existing tables,
filterable by user/property/date range. No PDF/Excel generation library is
in this stack; the frontend exports whatever table it renders as CSV
(Excel opens CSV natively), same pattern as the Transactions/Users pages.
"""
from django.db.models import Count, Sum
from rest_framework.response import Response

from apps.accounts.models import User
from apps.common.exceptions import error_response
from apps.common.utils import coerce_date
from apps.loans.models import Loan
from apps.ocr.models import Document
from apps.subscriptions.models import SubscriptionPayment
from apps.transactions.models import Transaction

from .base import AdminProtectedView


def _filtered_transactions(params):
    qs = Transaction.objects.all()
    if params.get('userId'):
        qs = qs.filter(owner_id=params['userId'])
    if params.get('propertyId'):
        qs = qs.filter(property_id=params['propertyId'])
    if params.get('startDate'):
        qs = qs.filter(date__gte=coerce_date(params['startDate']))
    if params.get('endDate'):
        qs = qs.filter(date__lte=coerce_date(params['endDate']))
    return qs


def _profit_loss(params):
    tx = _filtered_transactions(params)
    income = float(tx.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
    expense = float(tx.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)
    by_category = list(
        tx.filter(type='expense').values('category_name').annotate(total=Sum('amount')).order_by('-total')
    )
    return {
        'income': income,
        'expense': expense,
        'netProfit': income - expense,
        'expenseByCategory': [
            {'category': row['category_name'] or 'Uncategorized', 'amount': float(row['total'] or 0)}
            for row in by_category
        ],
    }


def _cash_flow(params):
    from .utils import month_buckets

    tx = _filtered_transactions(params)
    results = []
    for label, start, end in month_buckets(6):
        month_tx = tx.filter(date__gte=start, date__lt=end)
        income = float(month_tx.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
        expense = float(month_tx.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)
        results.append({'month': label, 'income': income, 'expense': expense, 'net': income - expense})
    return {'monthly': results}


def _expense_by_category(params):
    tx = _filtered_transactions(params).filter(type='expense')
    total = float(tx.aggregate(t=Sum('amount'))['t'] or 0)
    rows = tx.values('category_name').annotate(amount=Sum('amount')).order_by('-amount')
    return {
        'total': total,
        'categories': [
            {
                'category': row['category_name'] or 'Uncategorized',
                'amount': float(row['amount'] or 0),
                'percent': round(float(row['amount'] or 0) / total * 100, 1) if total else 0,
            }
            for row in rows
        ],
    }


def _income_by_property(params):
    tx = _filtered_transactions(params).filter(type='income').select_related('property', 'property__owner')
    rows = tx.values('property_id', 'property__name', 'property__owner__name').annotate(income=Sum('amount')).order_by('-income')
    return {
        'properties': [
            {
                'propertyId': str(row['property_id']),
                'propertyName': row['property__name'],
                'ownerName': row['property__owner__name'],
                'income': float(row['income'] or 0),
            }
            for row in rows
        ],
    }


def _loan_summary(params):
    qs = Loan.objects.select_related('property', 'owner')
    if params.get('userId'):
        qs = qs.filter(owner_id=params['userId'])
    if params.get('propertyId'):
        qs = qs.filter(property_id=params['propertyId'])

    totals = qs.aggregate(
        principal=Sum('principal'), balance=Sum('current_balance'), repayment=Sum('monthly_repayment'),
    )
    by_lender = list(qs.values('lender').annotate(count=Count('id'), balance=Sum('current_balance')).order_by('-balance'))

    return {
        'totalPrincipal': float(totals['principal'] or 0),
        'totalBalance': float(totals['balance'] or 0),
        'totalMonthlyRepayment': float(totals['repayment'] or 0),
        'byLender': [
            {'lender': row['lender'], 'count': row['count'], 'balance': float(row['balance'] or 0)}
            for row in by_lender
        ],
    }


def _ocr_report(params):
    qs = Document.objects.all()
    if params.get('userId'):
        qs = qs.filter(owner_id=params['userId'])
    if params.get('startDate'):
        qs = qs.filter(created_at__date__gte=coerce_date(params['startDate']))
    if params.get('endDate'):
        qs = qs.filter(created_at__date__lte=coerce_date(params['endDate']))

    total = qs.count()
    completed = qs.filter(status='completed').count()
    pending = qs.filter(status='pending').count()
    failed = qs.filter(status='failed').count()

    return {
        'totalDocuments': total,
        'completed': completed,
        'pending': pending,
        'failed': failed,
        'successRate': round(completed / total * 100, 1) if total else 0,
    }


def _user_report(params):
    total = User.objects.count()
    active = User.objects.filter(account_status='active').count()
    suspended = User.objects.filter(account_status='suspended').count()
    by_role = list(User.objects.values('role').annotate(count=Count('id')))

    return {
        'totalUsers': total,
        'activeUsers': active,
        'suspendedUsers': suspended,
        'byRole': [{'role': row['role'], 'count': row['count']} for row in by_role],
    }


def _subscription_report(params):
    from apps.subscriptions.models import Subscription

    total_revenue = float(SubscriptionPayment.objects.filter(status='paid').aggregate(t=Sum('amount'))['t'] or 0)
    by_plan = list(
        Subscription.objects.values('plan__name').annotate(subscribers=Count('id')).order_by('-subscribers')
    )
    return {
        'totalRevenue': total_revenue,
        'byPlan': [{'plan': row['plan__name'], 'subscribers': row['subscribers']} for row in by_plan],
    }


REPORTS = {
    'profit_loss': _profit_loss,
    'cash_flow': _cash_flow,
    'expense_by_category': _expense_by_category,
    'income_by_property': _income_by_property,
    'loan_summary': _loan_summary,
    'ocr_reports': _ocr_report,
    'user_reports': _user_report,
    'subscription_reports': _subscription_report,
}


class AdminReportsView(AdminProtectedView):
    # Not in the Support Admin's explicitly granted permission list — see
    # apps/admin_panel/views.py's dashboard, which Support Admins do see;
    # the drill-down Reports module stays Admin-only.
    allow_support = False

    def get(self, request):
        report_type = request.query_params.get('type')
        handler = REPORTS.get(report_type)
        if not handler:
            return error_response(f'Unknown report type. Choose one of: {", ".join(REPORTS)}', 400)

        data = handler(request.query_params)
        return Response({'success': True, 'data': {'type': report_type, 'report': data}})
