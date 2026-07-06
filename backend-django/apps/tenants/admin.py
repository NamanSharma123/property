from django.contrib import admin

from .models import Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'property', 'status', 'monthly_rent', 'lease_start', 'lease_end')
    list_filter = ('status',)
    search_fields = ('name', 'email')
    readonly_fields = ('id', 'created_at', 'updated_at')
