from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('description', 'property', 'amount', 'date', 'status')
    list_filter = ('status',)
    search_fields = ('description', 'reference_number')
    readonly_fields = ('id', 'created_at', 'updated_at')
