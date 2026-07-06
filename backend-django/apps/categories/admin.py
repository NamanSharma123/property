from django.contrib import admin

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'is_system', 'is_active', 'owner')
    list_filter = ('type', 'is_system', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('id', 'created_at', 'updated_at')
