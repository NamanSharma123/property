"""
OCR endpoints — port of backend/src/controllers/ocrController.js (document
lifecycle) and backend/src/controllers/pdfController.js (text extraction).

- PDFs: text extraction with pypdf (equivalent of pdf-parse).
- Images: OCR with pytesseract (requires the Tesseract binary; see README).
"""
import hashlib
import io
import re
from datetime import date as date_cls

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.utils import model_row, parse_int
from apps.common.views import ProtectedView
from apps.properties.models import Property
from apps.transactions.models import Transaction

from .models import Document, DocumentDuplicate, DocumentLineItem, ExtractedData
from .parser import extract_data

ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']

ALLOWED_FILE_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB, same as the multer limit


# ── Document lifecycle (ocrController.js) ──

class UploadDocumentView(ProtectedView):
    def post(self, request):
        data = request.data
        file_name = data.get('fileName')
        file_url = data.get('fileUrl')
        file_type = data.get('fileType')
        file_size = data.get('fileSize')

        if not all([file_name, file_url, file_type, file_size]):
            return error_response('Missing required fields: fileName, fileUrl, fileType, fileSize', 400)

        if file_type not in ALLOWED_UPLOAD_TYPES:
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


# ── Text extraction (pdfController.js) ──

def _validate_upload(uploaded):
    if uploaded.content_type not in ALLOWED_FILE_MIMES:
        return error_response('Only PDF and image files are allowed', 400)
    if uploaded.size > MAX_FILE_SIZE:
        return error_response('File too large (max 20MB)', 400)
    return None


def _extract_pdf_text(data):
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    text = '\n'.join((page.extract_text() or '') for page in reader.pages)
    return text, len(reader.pages)


def _extract_image_text(data):
    import pytesseract
    from PIL import Image

    image = Image.open(io.BytesIO(data))
    ocr = pytesseract.image_to_data(image, lang='eng', output_type=pytesseract.Output.DICT)

    confidences = []
    for word, conf in zip(ocr['text'], ocr['conf']):
        if word.strip():
            try:
                conf = float(conf)
            except (TypeError, ValueError):
                continue
            if conf >= 0:
                confidences.append(conf)

    text = pytesseract.image_to_string(image, lang='eng')
    confidence = sum(confidences) / len(confidences) if confidences else 0
    return text, confidence


def _clean_text(text):
    text = text.replace('\r\n', '\n').replace('\t', ' ')
    text = re.sub(r' {3,}', '  ', text)
    return text.strip()


class ExtractTextView(ProtectedView):
    """POST /api/ocr/extract — field name `file` (PDF or image)."""

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return error_response('No file uploaded', 400)

        invalid = _validate_upload(uploaded)
        if invalid:
            return invalid

        data = uploaded.read()
        confidence = 90
        page_count = 1

        try:
            if uploaded.content_type == 'application/pdf':
                method = 'pdf-parse'
                text, page_count = _extract_pdf_text(data)

                if not text or len(text.strip()) < 10:
                    return Response({
                        'success': True,
                        'isScanned': True,
                        'text': '',
                        'pageCount': page_count,
                        'method': method,
                        'message': 'This PDF appears to be scanned. Please convert it to images (PNG/JPG) for OCR processing.',
                    })
            else:
                method = 'tesseract'
                text, confidence = _extract_image_text(data)

                if not text or len(text.strip()) < 10:
                    return Response({
                        'success': False,
                        'error': 'Could not extract text from image. Please ensure the image is clear and readable.',
                        'confidence': confidence,
                    })
        except Exception as exc:
            return error_response(f'Text extraction failed: {exc}', 500)

        cleaned_text = _clean_text(text)
        result = extract_data(cleaned_text)

        total_money_in = 0.0
        total_money_out = 0.0
        for prop in result['properties']:
            for item in prop['lineItems']:
                if item['moneyIn']:
                    total_money_in += float(item['moneyIn'])
                if item['moneyOut']:
                    total_money_out += float(item['moneyOut'])

        transaction_count = sum(len(p['lineItems']) for p in result['properties'])

        return Response({
            'success': True,
            'isScanned': False,
            'text': cleaned_text,
            'pageCount': page_count,
            'method': method,
            'originalFilename': uploaded.name,
            'confidence': confidence,
            'extractedData': {
                'agencyName': result['agencyName'],
                'folioNumber': result['folioNumber'],
                'statementPeriod': result['statementPeriod'],
                'properties': result['properties'],
                'totalMoneyIn': f'{total_money_in:.2f}',
                'totalMoneyOut': f'{total_money_out:.2f}',
            },
            'vendor': result['agencyName'] or 'Unknown Vendor',
            'amount': f'{total_money_out:.2f}',
            'category': 'Uncategorized',
            'expenseDate': result['statementPeriod']['to'] or result['statementPeriod']['from'] or '',
            'property': result['properties'][0]['propertyName'] if result['properties'] else '',
            'propertyType': '',
            'description': '',
            'transactionCount': transaction_count,
        })


class ExtractPDFTextView(ProtectedView):
    """POST /api/ocr/extract-pdf — field name `pdf` (backward compatibility)."""

    def post(self, request):
        uploaded = request.FILES.get('pdf')
        if not uploaded:
            return error_response('No PDF file uploaded', 400)

        invalid = _validate_upload(uploaded)
        if invalid:
            return invalid

        try:
            text, page_count = _extract_pdf_text(uploaded.read())
        except Exception as exc:
            return error_response(f'Failed to process PDF: {exc}', 500)

        if not text or len(text.strip()) < 20:
            return Response({
                'success': True,
                'isScanned': True,
                'text': '',
                'pageCount': page_count,
                'message': 'PDF appears to be scanned (no extractable text). Please convert to images for OCR.',
            })

        result = extract_data(text.strip())

        return Response({
            'success': True,
            'isScanned': False,
            'text': text.strip(),
            'pageCount': page_count,
            'extractedData': result,
        })
