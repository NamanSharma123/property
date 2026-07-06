from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('description', 'property', 'type', 'amount', 'date', 'status')
    list_filter = ('type', 'status', 'transaction_source')
    search_fields = ('description', 'reference_number')
    readonly_fields = ('id', 'created_at', 'updated_at')
