from django.contrib import admin

from .models import AdminAuditLog, PlatformSetting


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ('admin', 'action', 'entity_type', 'entity_id', 'created_at')
    list_filter = ('action', 'entity_type')
    readonly_fields = [f.name for f in AdminAuditLog._meta.fields]


@admin.register(PlatformSetting)
class PlatformSettingAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'updated_by', 'updated_at')
