from django.contrib import admin

from .models import Ticket, TicketMessage


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('subject', 'user', 'status', 'priority', 'assigned_admin', 'created_at')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('subject',)


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'author', 'is_internal_note', 'created_at')
    list_filter = ('is_internal_note',)
