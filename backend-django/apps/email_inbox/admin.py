from django.contrib import admin

from .models import EmailMessage


@admin.register(EmailMessage)
class EmailMessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'receiver', 'user', 'status', 'received_at')
    list_filter = ('status',)
    search_fields = ('sender', 'receiver', 'subject')
    readonly_fields = ('id', 'created_at', 'updated_at')
