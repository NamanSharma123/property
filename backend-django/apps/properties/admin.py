from django.contrib import admin

from .models import Property


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'type', 'status', 'units', 'occupancy', 'created_at')
    list_filter = ('type', 'status')
    search_fields = ('name', 'full_address')
    readonly_fields = ('id', 'created_at', 'updated_at')
