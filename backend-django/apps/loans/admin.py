from django.contrib import admin

from .models import Loan


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ('lender', 'property', 'owner', 'principal', 'status', 'created_at')
    list_filter = ('status', 'basiq_status')
    search_fields = ('lender', 'loan_number')
