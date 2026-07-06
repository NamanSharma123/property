from django.contrib import admin

from .models import ActivityLog, Session, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'name', 'role', 'account_status', 'last_login', 'created_at')
    list_filter = ('role', 'account_status')
    search_fields = ('email', 'name', 'unique_id')
    exclude = ('password_hash',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_login')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'is_active', 'expires_at', 'last_activity')
    list_filter = ('is_active',)
    exclude = ('refresh_token',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'resource_type', 'success', 'created_at')
    list_filter = ('action', 'success')
    readonly_fields = [f.name for f in ActivityLog._meta.fields]
