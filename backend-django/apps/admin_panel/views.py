"""
Admin panel Phase 1: dashboard, Users module (list/detail/edit/suspend/
activate/delete/reset-password + the 4 real user-detail tabs), audit logs.
Cross-user views on the existing properties/transactions/documents/
activity tables — nothing duplicated, see apps/admin_panel/models.py.
"""
from datetime import date

from django.db.models import Count, Q, Sum
from rest_framework.response import Response

from apps.accounts.models import ActivityLog, User
from apps.accounts.views import send_password_reset_email
from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, json_value, model_row, to_snake
from apps.loans.models import Loan
from apps.loans.serializers import loan_row
from apps.ocr.models import Document
from apps.properties.models import Property
from apps.support.models import Ticket
from apps.transactions.models import Transaction
from apps.transactions.serializers import transaction_row

from .base import AdminProtectedView
from .models import AdminAuditLog
from .permissions import require_admin_role
from .serializers import activity_log_row, audit_log_row, user_row
from .utils import log_admin_action, month_buckets, monthly_counts
from .views_subscriptions import subscription_revenue_this_month

USER_COUNT_ANNOTATIONS = dict(
    properties_count=Count('property', distinct=True),
    transactions_count=Count('transaction', distinct=True),
    documents_count=Count('document', distinct=True),
)

ALLOWED_USER_UPDATE_FIELDS = ['name', 'phone', 'avatar']
ADMIN_ONLY_USER_FIELDS = ['role']


# ───────────────────────── Dashboard ─────────────────────────

def _ocr_success_rate_trend():
    results = []
    for label, start, end in month_buckets(6):
        qs = Document.objects.filter(created_at__gte=start, created_at__lt=end)
        total = qs.count()
        completed = qs.filter(status='completed').count()
        results.append({
            'month': label,
            'total': total,
            'completed': completed,
            'rate': round((completed / total) * 100, 1) if total else 0,
        })
    return results


def _recent_activity_feed(limit=20):
    events = []
    for u in User.objects.order_by('-created_at')[:limit]:
        events.append({
            'type': 'user_registered', 'title': f'{u.name} registered',
            'subtitle': u.email, 'timestamp': json_value(u.created_at), 'entityId': str(u.id),
        })
    for p in Property.objects.select_related('owner').order_by('-created_at')[:limit]:
        events.append({
            'type': 'property_added', 'title': f'Property added: {p.name}',
            'subtitle': p.owner.name if p.owner_id else None,
            'timestamp': json_value(p.created_at), 'entityId': str(p.id),
        })
    for t in Transaction.objects.select_related('owner').order_by('-created_at')[:limit]:
        events.append({
            'type': 'transaction_edited', 'title': f'Transaction: {t.description}',
            'subtitle': t.owner.name if t.owner_id else None,
            'timestamp': json_value(t.created_at), 'entityId': str(t.id),
        })
    for d in Document.objects.select_related('owner').order_by('-created_at')[:limit]:
        events.append({
            'type': 'ocr_processed', 'title': f'Document uploaded: {d.file_name}',
            'subtitle': d.owner.name if d.owner_id else None,
            'timestamp': json_value(d.created_at), 'entityId': str(d.id),
        })
    for tk in Ticket.objects.select_related('user').order_by('-created_at')[:limit]:
        events.append({
            'type': 'support_ticket_created', 'title': f'Support ticket: {tk.subject}',
            'subtitle': tk.user.name if tk.user_id else None,
            'timestamp': json_value(tk.created_at), 'entityId': str(tk.id),
        })
    events.sort(key=lambda e: e['timestamp'], reverse=True)
    return events[:limit]


class AdminDashboardView(AdminProtectedView):
    def get(self, request):
        today = date.today()
        month_start = today.replace(day=1)

        month_tx = Transaction.objects.filter(date__gte=month_start)
        monthly_income = month_tx.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
        monthly_expense = month_tx.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0

        cards = {
            'totalUsers': User.objects.count(),
            'activeUsers': User.objects.filter(account_status='active').count(),
            'suspendedUsers': User.objects.filter(account_status='suspended').count(),
            'totalProperties': Property.objects.count(),
            'totalTransactions': Transaction.objects.count(),
            'ocrProcessedToday': Document.objects.filter(created_at__date=today).count(),
            'ocrPendingReview': Document.objects.filter(status='pending').count(),
            'monthlyIncome': float(monthly_income),
            'monthlyExpense': float(monthly_expense),
            'totalLoans': Loan.objects.count(),
            'subscriptionRevenue': subscription_revenue_this_month(),
            'pendingSupportTickets': Ticket.objects.filter(status__in=['open', 'in_progress']).count(),
        }

        charts = {
            'userRegistrationTrend': monthly_counts(User.objects.all(), 'created_at'),
            'transactionTrend': monthly_counts(Transaction.objects.all(), 'created_at'),
            'propertyGrowth': monthly_counts(Property.objects.all(), 'created_at'),
            'ocrSuccessRate': _ocr_success_rate_trend(),
        }

        return Response({
            'success': True,
            'data': {'cards': cards, 'charts': charts, 'recentActivity': _recent_activity_feed()},
        })


# ───────────────────────── Users ─────────────────────────

class AdminUserListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = User.objects.annotate(**USER_COUNT_ANNOTATIONS)

        search = params.get('search')
        if search:
            prop_owner_ids = list(
                Property.objects.filter(full_address__icontains=search).values_list('owner_id', flat=True)
            )
            qs = qs.filter(
                Q(name__icontains=search) | Q(email__icontains=search) |
                Q(phone__icontains=search) | Q(unique_id__icontains=search) |
                Q(inbound_email__icontains=search) | Q(id__in=prop_owner_ids)
            )

        if params.get('status'):
            qs = qs.filter(account_status=params['status'])
        if params.get('role'):
            qs = qs.filter(role=params['role'])

        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        users = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'users': [user_row(u) for u in users],
                'pagination': pagination_payload(page, limit, total),
            },
        })


class AdminUserDetailView(AdminProtectedView):
    def get(self, request, user_id):
        user = User.objects.filter(id=user_id).annotate(**USER_COUNT_ANNOTATIONS).first()
        if not user:
            return error_response('User not found', 404)
        return Response({'success': True, 'data': {'user': user_row(user)}})

    def put(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return error_response('User not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in ALLOWED_USER_UPDATE_FIELDS:
                updates[snake_key] = value
            elif snake_key in ADMIN_ONLY_USER_FIELDS:
                require_admin_role(request, allow_support=False)
                if value not in dict(User.ROLE_CHOICES):
                    return error_response(f'Invalid role: {value}', 400)
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        old_value = {field: getattr(user, field) for field in updates}
        for field, value in updates.items():
            setattr(user, field, value)
        user.save()

        log_admin_action(request.user, 'user.edit', request=request, entity_type='user',
                          entity_id=user.id, old_value=old_value, new_value=updates)

        return Response({
            'success': True,
            'data': {'user': user_row(User.objects.annotate(**USER_COUNT_ANNOTATIONS).get(id=user.id))},
            'message': 'User updated successfully',
        })

    def delete(self, request, user_id):
        require_admin_role(request, allow_support=False)

        if str(request.user.id) == str(user_id):
            return error_response('You cannot delete your own account', 400)
        if not request.data.get('confirm'):
            return error_response('Set {"confirm": true} in the request body to confirm deletion', 400)

        user = User.objects.filter(id=user_id).first()
        if not user:
            return error_response('User not found', 404)

        snapshot = user_row(user)
        user.delete()

        log_admin_action(request.user, 'user.delete', request=request, entity_type='user',
                          entity_id=user_id, old_value=snapshot)

        return Response({'success': True, 'message': 'User deleted successfully'})


def _set_user_status(request, user_id, new_status):
    if str(request.user.id) == str(user_id) and new_status != 'active':
        return error_response('You cannot change the status of your own account', 400)

    user = User.objects.filter(id=user_id).first()
    if not user:
        return error_response('User not found', 404)

    old_status = user.account_status
    user.account_status = new_status
    user.save(update_fields=['account_status'])

    log_admin_action(request.user, f'user.{new_status}', request=request, entity_type='user',
                      entity_id=user.id, old_value={'accountStatus': old_status},
                      new_value={'accountStatus': new_status})

    return Response({
        'success': True,
        'data': {'user': user_row(User.objects.annotate(**USER_COUNT_ANNOTATIONS).get(id=user.id))},
        'message': f'User {new_status}',
    })


class AdminUserSuspendView(AdminProtectedView):
    def post(self, request, user_id):
        return _set_user_status(request, user_id, 'suspended')


class AdminUserActivateView(AdminProtectedView):
    def post(self, request, user_id):
        return _set_user_status(request, user_id, 'active')


class AdminUserResetPasswordView(AdminProtectedView):
    allow_support = False

    def post(self, request, user_id):
        user = User.objects.filter(id=user_id).first()
        if not user:
            return error_response('User not found', 404)

        sent = send_password_reset_email(user, request=request, triggered_by_admin=True)

        log_admin_action(request.user, 'user.reset_password', request=request,
                          entity_type='user', entity_id=user.id)

        if not sent:
            return error_response('User found, but the reset email could not be sent — check email configuration', 500)

        return Response({'success': True, 'message': f'Password reset email sent to {user.email}'})


class AdminUserPropertiesView(AdminProtectedView):
    def get(self, request, user_id):
        if not User.objects.filter(id=user_id).exists():
            return error_response('User not found', 404)

        qs = Property.objects.filter(owner_id=user_id)
        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        properties = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'properties': [model_row(p) for p in properties],
                'pagination': pagination_payload(page, limit, total),
            },
        })


class AdminUserTransactionsView(AdminProtectedView):
    def get(self, request, user_id):
        if not User.objects.filter(id=user_id).exists():
            return error_response('User not found', 404)

        qs = Transaction.objects.filter(owner_id=user_id).select_related('property', 'tenant', 'category')
        params = request.query_params
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('type'):
            qs = qs.filter(type=params['type'])
        if params.get('categoryId'):
            qs = qs.filter(category_id=params['categoryId'])
        if params.get('startDate'):
            qs = qs.filter(date__gte=coerce_date(params['startDate']))
        if params.get('endDate'):
            qs = qs.filter(date__lte=coerce_date(params['endDate']))

        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        transactions = qs.order_by('-date', '-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'transactions': [transaction_row(t, signed=True) for t in transactions],
                'pagination': pagination_payload(page, limit, total),
            },
        })


class AdminUserDocumentsView(AdminProtectedView):
    def get(self, request, user_id):
        if not User.objects.filter(id=user_id).exists():
            return error_response('User not found', 404)

        qs = Document.objects.filter(owner_id=user_id).select_related('property')
        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        documents = qs.order_by('-created_at')[offset:offset + limit]
        rows = [model_row(d, property_name=d.property.name if d.property_id else None) for d in documents]

        return Response({
            'success': True,
            'data': {'documents': rows, 'pagination': pagination_payload(page, limit, total)},
        })


class AdminUserActivityView(AdminProtectedView):
    def get(self, request, user_id):
        if not User.objects.filter(id=user_id).exists():
            return error_response('User not found', 404)

        qs = ActivityLog.objects.filter(user_id=user_id)
        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        logs = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {'activity': [activity_log_row(a) for a in logs], 'pagination': pagination_payload(page, limit, total)},
        })


class AdminUserLoansView(AdminProtectedView):
    def get(self, request, user_id):
        if not User.objects.filter(id=user_id).exists():
            return error_response('User not found', 404)

        qs = Loan.objects.filter(owner_id=user_id).select_related('property')
        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        loans = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {'loans': [loan_row(l) for l in loans], 'pagination': pagination_payload(page, limit, total)},
        })


# ───────────────────────── Audit logs ─────────────────────────

class AdminAuditLogListView(AdminProtectedView):
    allow_support = False

    def get(self, request):
        qs = AdminAuditLog.objects.select_related('admin')
        params = request.query_params
        if params.get('adminId'):
            qs = qs.filter(admin_id=params['adminId'])
        if params.get('action'):
            qs = qs.filter(action=params['action'])
        if params.get('entityType'):
            qs = qs.filter(entity_type=params['entityType'])
        if params.get('startDate'):
            qs = qs.filter(created_at__date__gte=coerce_date(params['startDate']))
        if params.get('endDate'):
            qs = qs.filter(created_at__date__lte=coerce_date(params['endDate']))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        entries = qs[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'auditLogs': [audit_log_row(e) for e in entries],
                'pagination': pagination_payload(page, limit, total),
            },
        })
