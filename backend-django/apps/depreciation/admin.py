from django.contrib import admin

from .models import DepreciationSchedule, DepreciationScheduleYear


@admin.register(DepreciationSchedule)
class DepreciationScheduleAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'property', 'owner', 'provider', 'status', 'created_at')
    list_filter = ('status', 'provider')
    search_fields = ('file_name',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(DepreciationScheduleYear)
class DepreciationScheduleYearAdmin(admin.ModelAdmin):
    list_display = ('schedule', 'method', 'financial_date', 'division_40_amount', 'division_43_amount', 'total_amount')
    list_filter = ('method',)
