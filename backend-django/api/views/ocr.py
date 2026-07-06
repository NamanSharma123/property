"""
OCR document endpoints — port of backend/src/controllers/ocrController.js.
"""
import hashlib
from datetime import date as date_cls

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.response import Response

from ..exceptions import error_response
from ..models import (
    Document,
    DocumentDuplicate,
    DocumentLineItem,
    ExtractedData,
    Property,
    Transaction,
)
from ..utils import model_row, parse_int
from .base import ProtectedView

ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']


class UploadDocumentView(ProtectedView):
    def post(self, request):
        data = request.data
        file_name = data.get('fileName')
        file_url = data.get('fileUrl')
        file_type = data.get('fileType')
        file_size = data.get('fileSize')

        if not all([file_name, file_url, file_type, file_size]):
            return error_response('Missing required fields: fileName, fileUrl, fileType, fileSize', 400)

        if file_type not in ALLOWED_TYPES:
            return error_response('Invalid file type. Allowed: JPEG, PNG, PDF', 400)

        file_hash = hashlib.sha256((file_url + file_name).encode()).hexdigest()

        duplicate = DocumentDuplicate.objects.filter(
            file_hash=file_hash, owner_id=request.user.id
        ).select_related('original_document').first()
        if duplicate:
            return Response({
                'success': False,
                'error': 'Duplicate document detected',
                'original_document': {
                    'id': str(duplicate.id),
                    'original_document_id': str(duplicate.original_document_id),
                    'file_name': duplicate.original_document.file_name,
                },
            }, status=409)

        document = Document.objects.create(
            owner_id=request.user.id,
            property_id=data.get('propertyId') or None,
            file_name=file_name,
            file_url=file_url,
            file_type=file_type,
            file_size=file_size,
            status='pending',
        )

        DocumentDuplicate.objects.create(
            owner_id=request.user.id,
            file_hash=file_hash,
            document_signature={'fileName': file_name, 'fileSize': file_size},
            original_document=document,
            detection_type='exact-hash',
        )

        return Response({
            'success': True,
            'message': 'Document uploaded successfully',
            'document': model_row(document),
        }, status=201)


class ProcessDocumentView(ProtectedView):
    def post(self, request):
        data = request.data
        document_id = data.get('documentId')

        document = Document.objects.filter(id=document_id, owner_id=request.user.id).first()
        if not document:
            return error_response('Document not found or access denied', 404)

        try:
            ocr_confidence = data.get('ocrConfidence')
            now = timezone.now()
            Document.objects.filter(id=document_id).update(
                status='completed',
                ocr_raw_text=data.get('ocrRawText'),
                ocr_confidence=ocr_confidence,
                document_type=data.get('documentType') or 'unknown',
                processing_started_at=now,
                processing_completed_at=now,
            )

            extracted = data.get('extractedData')
            if isinstance(extracted, dict):
                for field_name, field_value in extracted.items():
                    if field_value is not None:
                        ExtractedData.objects.create(
                            document_id=document_id,
                            field_name=field_name,
                            field_value=str(field_value),
                            confidence=ocr_confidence,
                            data_type='string',
                        )

            line_items = data.get('lineItems')
            if isinstance(line_items, list):
                for item in line_items:
                    try:
                        amount = float(item.get('amount') or 0)
                    except (TypeError, ValueError):
                        amount = 0
                    try:
                        included_tax = float(item.get('includedTax'))
                    except (TypeError, ValueError):
                        included_tax = None

                    DocumentLineItem.objects.create(
                        document_id=document_id,
                        property_name=item.get('propertyName') or None,
                        description=item.get('description'),
                        category=item.get('category') or None,
                        amount=amount,
                        item_type=item.get('itemType') or 'expense',
                        included_tax=included_tax,
                        confidence=item.get('confidence') or ocr_confidence,
                    )

            return Response({
                'success': True,
                'message': 'Document processed successfully',
                'documentId': document_id,
            })
        except Exception as exc:
            Document.objects.filter(id=document_id).update(
                status='failed', error_message=str(exc)
            )
            return error_response('Failed to process document', 500)


class DocumentListView(ProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Document.objects.filter(owner_id=request.user.id).select_related('property')

        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('documentType'):
            qs = qs.filter(document_type=params['documentType'])

        limit = parse_int(params.get('limit'), 50)
        offset = parse_int(params.get('offset'), 0)
        documents = qs.order_by('-created_at')[offset:offset + limit]

        rows = [
            model_row(d, property_name=d.property.name if d.property_id else None)
            for d in documents
        ]

        return Response({
            'success': True,
            'documents': rows,
            'count': len(rows),
        })


class DocumentDetailView(ProtectedView):
    def get(self, request, document_id):
        document = Document.objects.filter(
            id=document_id, owner_id=request.user.id
        ).select_related('property').first()
        if not document:
            return error_response('Document not found', 404)

        extracted = ExtractedData.objects.filter(document_id=document_id).order_by('created_at')
        line_items = DocumentLineItem.objects.filter(document_id=document_id).order_by(
            'line_number', 'created_at'
        )

        row = model_row(
            document,
            property_name=document.property.name if document.property_id else None,
            extractedData=[model_row(e) for e in extracted],
            lineItems=[model_row(li) for li in line_items],
        )

        return Response({'success': True, 'document': row})

    def delete(self, request, document_id):
        deleted, _ = Document.objects.filter(id=document_id, owner_id=request.user.id).delete()
        if not deleted:
            return error_response('Document not found', 404)

        return Response({'success': True, 'message': 'Document deleted successfully'})


class ConvertToTransactionsView(ProtectedView):
    def post(self, request):
        data = request.data
        document_id = data.get('documentId')
        line_item_ids = data.get('lineItemIds') or []
        statement_date = data.get('statementDate')

        document = Document.objects.filter(id=document_id, owner_id=request.user.id).first()
        if not document:
            return error_response('Document not found', 404)

        created_transactions = []

        try:
            with db_transaction.atomic():
                line_items = DocumentLineItem.objects.filter(
                    document_id=document_id, id__in=line_item_ids, is_converted=False
                )

                for line_item in line_items:
                    property_id = document.property_id

                    if not property_id and line_item.property_name:
                        prop = Property.objects.filter(
                            owner_id=request.user.id,
                            name__iexact=line_item.property_name,
                        ).first()
                        if prop:
                            property_id = prop.id

                    if not property_id:
                        continue

                    tx = Transaction.objects.create(
                        owner_id=request.user.id,
                        property_id=property_id,
                        description=line_item.description,
                        amount=line_item.amount,
                        date=statement_date or date_cls.today().isoformat(),
                        type=line_item.item_type or 'expense',
                        category_name=line_item.category,
                        transaction_source='OCR Upload',
                        status='pending',
                        source_document_id=document_id,
                        created_by_id=request.user.id,
                    )
                    created_transactions.append(tx)

                    DocumentLineItem.objects.filter(id=line_item.id).update(
                        is_converted=True, transaction_id=tx.id
                    )
        except Exception:
            return error_response('Failed to convert line items to transactions', 500)

        return Response({
            'success': True,
            'message': f'Successfully converted {len(created_transactions)} line items to transactions',
            'transactions': [model_row(t) for t in created_transactions],
        })


class CorrectExtractedDataView(ProtectedView):
    def put(self, request, extracted_id):
        corrected_value = request.data.get('correctedValue')

        record = ExtractedData.objects.filter(id=extracted_id).select_related('document').first()
        if not record or record.document.owner_id != request.user.id:
            return error_response('Extracted data not found or access denied', 404)

        record.original_value = record.original_value or record.field_value
        record.corrected_value = corrected_value
        record.field_value = corrected_value
        record.is_validated = True
        record.validation_status = 'corrected'
        record.corrected_by_id = request.user.id
        record.corrected_at = timezone.now()
        record.save()

        return Response({'success': True, 'message': 'Data corrected successfully'})
