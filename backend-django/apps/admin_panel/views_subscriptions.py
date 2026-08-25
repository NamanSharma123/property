"""
Admin Subscription/Billing management. Entirely Admin-only — Support Admins
are explicitly barred from "Billing, Settings or Subscription Management"
per the spec, so every view here sets allow_support = False.
"""
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import coerce_date, to_snake
from apps.subscriptions.models import Subscription, SubscriptionPayment, SubscriptionPlan
from apps.subscriptions.serializers import payment_row, plan_row, subscription_row

from .base import AdminProtectedView
from .utils import log_admin_action

PLAN_UPDATE_FIELDS = ['name', 'monthly_price', 'users_allowed', 'ocr_limit', 'is_active', 'description']


class AdminSubscriptionPlanListView(AdminProtectedView):
    allow_support = False

    def get(self, request):
        plans = SubscriptionPlan.objects.all()
        return Response({'success': True, 'data': {'plans': [plan_row(p) for p in plans]}})


class AdminSubscriptionPlanDetailView(AdminProtectedView):
    allow_support = False

    def put(self, request, plan_id):
        plan = SubscriptionPlan.objects.filter(id=plan_id).first()
        if not plan:
            return error_response('Plan not found', 404)

        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in PLAN_UPDATE_FIELDS:
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        for field, value in updates.items():
            setattr(plan, field, value)
        plan.save()

        log_admin_action(request.user, 'subscription_plan.edit', request=request, entity_type='subscription_plan',
                          entity_id=plan.id, new_value=updates)

        return Response({'success': True, 'data': {'plan': plan_row(plan)}, 'message': 'Plan updated'})


class AdminSubscriptionListView(AdminProtectedView):
    allow_support = False

    def get(self, request):
        params = request.query_params
        qs = Subscription.objects.select_related('user', 'plan')

        if params.get('planId'):
            qs = qs.filter(plan_id=params['planId'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('paymentStatus'):
            qs = qs.filter(payment_status=params['paymentStatus'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(user__name__icontains=search) | Q(user__email__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        subs = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {'subscriptions': [subscription_row(s) for s in subs], 'pagination': pagination_payload(page, limit, total)},
        })


class AdminSubscriptionDetailView(AdminProtectedView):
    allow_support = False

    def get(self, request, subscription_id):
        sub = Subscription.objects.select_related('user', 'plan').filter(id=subscription_id).first()
        if not sub:
            return error_response('Subscription not found', 404)

        payments = sub.payments.order_by('-created_at')
        row = subscription_row(sub)
        row['payments'] = [payment_row(p) for p in payments]

        return Response({'success': True, 'data': {'subscription': row}})


class AdminSubscriptionChangePlanView(AdminProtectedView):
    """POST /api/admin/subscriptions/<id>/change-plan — {planId}. Covers
    both Upgrade and Downgrade (same operation either direction)."""
    allow_support = False

    def post(self, request, subscription_id):
        sub = Subscription.objects.filter(id=subscription_id).first()
        if not sub:
            return error_response('Subscription not found', 404)

        plan_id = request.data.get('planId')
        plan = SubscriptionPlan.objects.filter(id=plan_id).first()
        if not plan:
            return error_response('Plan not found', 404)

        old_plan_id = sub.plan_id
        sub.plan = plan
        sub.status = 'active'
        sub.save(update_fields=['plan', 'status'])

        log_admin_action(request.user, 'subscription.change_plan', request=request, entity_type='subscription',
                          entity_id=sub.id, old_value={'planId': str(old_plan_id)}, new_value={'planId': str(plan.id)})

        return Response({
            'success': True,
            'data': {'subscription': subscription_row(Subscription.objects.select_related('user', 'plan').get(id=sub.id))},
            'message': f'Moved to the {plan.name} plan',
        })


class AdminSubscriptionCancelView(AdminProtectedView):
    allow_support = False

    def post(self, request, subscription_id):
        sub = Subscription.objects.filter(id=subscription_id).first()
        if not sub:
            return error_response('Subscription not found', 404)

        sub.status = 'cancelled'
        sub.save(update_fields=['status'])

        log_admin_action(request.user, 'subscription.cancel', request=request, entity_type='subscription', entity_id=sub.id)

        return Response({'success': True, 'data': {'subscription': subscription_row(sub)}, 'message': 'Subscription cancelled'})


class AdminSubscriptionRecordPaymentView(AdminProtectedView):
    """POST /api/admin/subscriptions/<id>/record-payment — manual payment
    entry (spec: "Manual Payment"). {amount, method?, notes?}."""
    allow_support = False

    def post(self, request, subscription_id):
        sub = Subscription.objects.filter(id=subscription_id).first()
        if not sub:
            return error_response('Subscription not found', 404)

        amount = request.data.get('amount')
        if not amount:
            return error_response('amount is required', 400)

        payment = SubscriptionPayment.objects.create(
            subscription=sub,
            amount=amount,
            status='paid',
            method=request.data.get('method') or 'manual',
            paid_at=coerce_date(request.data.get('paidAt')) or timezone.now(),
            notes=request.data.get('notes') or None,
            recorded_by=request.user,
        )
        sub.payment_status = 'paid'
        sub.save(update_fields=['payment_status'])

        log_admin_action(request.user, 'subscription.record_payment', request=request, entity_type='subscription',
                          entity_id=sub.id, new_value={'amount': str(amount)})

        return Response({
            'success': True,
            'data': {'payment': payment_row(payment)},
            'message': 'Payment recorded',
        }, status=201)


def subscription_revenue_this_month():
    """Used by the admin dashboard's "Subscription Revenue" card."""
    month_start = timezone.now().date().replace(day=1)
    total = SubscriptionPayment.objects.filter(
        status='paid', created_at__date__gte=month_start
    ).aggregate(t=Sum('amount'))['t']
    return float(total or 0)
