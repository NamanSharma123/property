from django.contrib import admin

from .models import Subscription, SubscriptionPayment, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'monthly_price', 'users_allowed', 'ocr_limit', 'is_active')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status', 'payment_status', 'renewal_date')
    list_filter = ('status', 'payment_status', 'plan')


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'amount', 'status', 'method', 'created_at')
    list_filter = ('status', 'method')
