"""
Billing plans + per-user subscriptions. Net-new (nothing existing to port —
frontend/app/dashboard/subscription is a static UI mock; `stripe` is an
unused dependency in package.json). Admin-only in the UI (Support Admins
are explicitly barred from Billing/Subscription Management per the spec).
`stripe_customer_id`/`stripe_subscription_id` are placeholders reserved for
wiring a real Stripe integration later — nothing calls the Stripe API today.
"""
from django.conf import settings
from django.db import models

from apps.common.models import CreatedModel, TimeStampedModel


class SubscriptionPlan(TimeStampedModel):
    name = models.CharField(max_length=50, unique=True)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    users_allowed = models.IntegerField(default=1)
    ocr_limit = models.IntegerField(null=True, blank=True)  # null = unlimited
    is_active = models.BooleanField(default=True)
    description = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['monthly_price']

    def __str__(self):
        return self.name


class Subscription(TimeStampedModel):
    STATUS_CHOICES = [('active', 'active'), ('cancelled', 'cancelled'), ('expired', 'expired')]
    PAYMENT_STATUS_CHOICES = [('paid', 'paid'), ('pending', 'pending'), ('failed', 'failed')]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column='user_id')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, db_column='plan_id')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='paid')
    renewal_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=100, null=True, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'subscriptions'
        indexes = [
            models.Index(fields=['plan'], name='idx_subscriptions_plan_id'),
            models.Index(fields=['status'], name='idx_subscriptions_status'),
        ]

    def __str__(self):
        return f'{self.user_id} — {self.plan.name}'


class SubscriptionPayment(CreatedModel):
    STATUS_CHOICES = [('paid', 'paid'), ('failed', 'failed'), ('refunded', 'refunded')]
    METHOD_CHOICES = [('manual', 'manual'), ('stripe', 'stripe')]

    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, db_column='subscription_id', related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='paid')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='manual')
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, db_column='recorded_by', null=True, blank=True
    )

    class Meta:
        db_table = 'subscription_payments'
        indexes = [
            models.Index(fields=['subscription'], name='idx_sub_payments_sub_id'),
        ]
