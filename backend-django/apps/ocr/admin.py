from django.contrib import admin

from .models import Document, DocumentDuplicate, DocumentLineItem, ExtractedData


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'owner', 'status', 'document_type', 'created_at')
    list_filter = ('status', 'document_type')
    search_fields = ('file_name',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(DocumentLineItem)
class DocumentLineItemAdmin(admin.ModelAdmin):
    list_display = ('description', 'document', 'amount', 'item_type', 'is_converted')
    list_filter = ('item_type', 'is_converted')


@admin.register(ExtractedData)
class ExtractedDataAdmin(admin.ModelAdmin):
    list_display = ('field_name', 'field_value', 'document', 'is_validated')
    list_filter = ('is_validated',)


@admin.register(DocumentDuplicate)
class DocumentDuplicateAdmin(admin.ModelAdmin):
    list_display = ('file_hash', 'owner', 'detection_type', 'created_at')
