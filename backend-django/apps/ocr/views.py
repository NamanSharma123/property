"""
OCR endpoints — port of backend/src/controllers/ocrController.js (document
lifecycle) and backend/src/controllers/pdfController.js (text extraction).

- PDFs: text extraction with pypdf (equivalent of pdf-parse), with a
  pdfplumber layout-aware parser tried first for known statement formats
  (see statement_parser.py) and a PyMuPDF render + OCR fallback for scanned
  PDFs with no extractable text.
- Images: OCR with pytesseract, with an OpenCV preprocessing pass (denoise +
  adaptive threshold + deskew) for better accuracy on scans/photos. Requires
  the Tesseract binary; see README.
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

from . import statement_parser
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


def _extract_pdf_text_via_ocr(data, dpi=300):
    """Render each page of a scanned PDF to an image and OCR it (PyMuPDF + pytesseract)."""
    import fitz  # PyMuPDF
    from PIL import Image

    full_text = []
    doc = fitz.open(stream=data, filetype='pdf')
    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    for page in doc:
        pix = page.get_pixmap(matrix=matrix)
        img_bytes = pix.tobytes('png')
        text, _confidence = _extract_image_text(img_bytes)
        full_text.append(text)

    page_count = doc.page_count
    doc.close()
    return '\n'.join(full_text), page_count


def _preprocess_for_ocr(pil_image):
    """OpenCV cleanup pipeline: grayscale -> denoise -> adaptive threshold -> deskew."""
    import cv2
    import numpy as np

    arr = np.array(pil_image.convert('RGB'))
    cv_image = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)

    gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31, 11,
    )

    coords = np.column_stack(np.where(thresh < 255))
    if coords.size == 0:
        corrected = thresh
    else:
        angle = cv2.minAreaRect(coords)[-1]
        angle = -(90 + angle) if angle < -45 else -angle
        if abs(angle) < 0.5:
            corrected = thresh
        else:
            (h, w) = thresh.shape[:2]
            center = (w // 2, h // 2)
            m = cv2.getRotationMatrix2D(center, angle, 1.0)
            corrected = cv2.warpAffine(
                thresh, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE,
            )

    return Image.fromarray(corrected)


def _extract_image_text(data):
    import pytesseract
    from PIL import Image

    image = Image.open(io.BytesIO(data))
    try:
        ocr_input = _preprocess_for_ocr(image)
    except Exception:
        ocr_input = image  # fall back to raw image if OpenCV preprocessing fails

    config = '--oem 3 --psm 6'  # assume a uniform block of text
    ocr = pytesseract.image_to_data(ocr_input, lang='eng', output_type=pytesseract.Output.DICT, config=config)

    confidences = []
    for word, conf in zip(ocr['text'], ocr['conf']):
        if word.strip():
            try:
                conf = float(conf)
            except (TypeError, ValueError):
                continue
            if conf >= 0:
                confidences.append(conf)

    text = pytesseract.image_to_string(ocr_input, lang='eng', config=config)
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
        layout_result = None

        try:
            if uploaded.content_type == 'application/pdf':
                method = 'pdf-parse'
                text, page_count = _extract_pdf_text(data)

                if not text or len(text.strip()) < 10:
                    # Likely a scanned PDF with no extractable text — render pages
                    # to images and OCR them before giving up.
                    ocr_text, page_count = _extract_pdf_text_via_ocr(data)
                    if ocr_text and len(ocr_text.strip()) >= 10:
                        text = ocr_text
                        method = 'pdf-ocr'
                    else:
                        return Response({
                            'success': True,
                            'isScanned': True,
                            'text': '',
                            'pageCount': page_count,
                            'method': method,
                            'message': 'This PDF appears to be scanned and OCR could not extract readable text. Please try a clearer scan.',
                        })
                else:
                    # Digital PDF with extractable text — try the layout-aware
                    # multi-format statement parser first, it's far more accurate
                    # for known real-estate statement layouts (see statement_parser.py).
                    try:
                        transactions, period, prop_addr = statement_parser.extract_transactions_pdf(io.BytesIO(data))
                        if transactions:
                            layout_result = statement_parser.to_properties_shape(transactions, period, prop_addr)
                            method = 'pdfplumber-layout'
                    except Exception:
                        layout_result = None
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
        result = layout_result or extract_data(cleaned_text)

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

        data = uploaded.read()
        try:
            text, page_count = _extract_pdf_text(data)
        except Exception as exc:
            return error_response(f'Failed to process PDF: {exc}', 500)

        if not text or len(text.strip()) < 20:
            try:
                ocr_text, page_count = _extract_pdf_text_via_ocr(data)
            except Exception:
                ocr_text = ''
            if not ocr_text or len(ocr_text.strip()) < 20:
                return Response({
                    'success': True,
                    'isScanned': True,
                    'text': '',
                    'pageCount': page_count,
                    'message': 'PDF appears to be scanned and OCR could not extract readable text. Please try a clearer scan.',
                })
            text = ocr_text

        layout_result = None
        try:
            transactions, period, prop_addr = statement_parser.extract_transactions_pdf(io.BytesIO(data))
            if transactions:
                layout_result = statement_parser.to_properties_shape(transactions, period, prop_addr)
        except Exception:
            layout_result = None

        result = layout_result or extract_data(text.strip())

        return Response({
            'success': True,
            'isScanned': False,
            'text': text.strip(),
            'pageCount': page_count,
            'extractedData': result,
        })


_UPLOAD_CATEGORIES = {
    'documents': 'documents',            # OCR statements/receipts attached to transactions
    'loan-documents': 'loan-documents',  # loan agreements attached to a property's bank/loan entry
}


class UploadFileView(ProtectedView):
    """
    POST /api/ocr/upload-file — field name `file`, optional field `category`
    (one of _UPLOAD_CATEGORIES, defaults to "documents"). Stores the raw
    uploaded file in S3 under a category-specific prefix and returns its URL
    — e.g. for attaching to a transaction as `receiptUrl`, or to a property's
    loan entry as its loan document. Unlike UploadDocumentView (which expects
    a fileUrl already computed elsewhere), this is the endpoint that actually
    does the upload.
    """

    def post(self, request):
        import uuid

        import boto3
        from django.conf import settings

        uploaded = request.FILES.get('file')
        if not uploaded:
            return error_response('No file uploaded', 400)

        invalid = _validate_upload(uploaded)
        if invalid:
            return invalid

        if not settings.DOCUMENTS_S3_BUCKET:
            return error_response('Document storage is not configured', 503)

        category = _UPLOAD_CATEGORIES.get(request.data.get('category'), 'documents')

        ext = (uploaded.name.rsplit('.', 1)[-1] if '.' in uploaded.name else 'bin').lower()
        key = f'{category}/{request.user.id}/{uuid.uuid4()}.{ext}'

        try:
            s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
            s3.upload_fileobj(
                uploaded,
                settings.DOCUMENTS_S3_BUCKET,
                key,
                ExtraArgs={'ContentType': uploaded.content_type},
            )
        except Exception as exc:
            return error_response(f'Failed to store document: {exc}', 500)

        url = f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/{key}'

        return Response({
            'success': True,
            'data': {
                'url': url,
                'fileName': uploaded.name,
                'fileSize': uploaded.size,
                'fileType': uploaded.content_type,
            },
        }, status=201)


class DocumentViewUrlView(ProtectedView):
    """
    GET /api/ocr/document-url?url=<stored s3 https url>

    The bucket is private, so the plain https URLs saved on transactions/
    loan entries by UploadFileView aren't directly browsable — they 404/403
    with AccessDenied. This exchanges one of those stored URLs for a
    short-lived presigned GET URL, after checking the key's user-id path
    segment matches the requesting user (owner-only, since the key itself
    is the only auth this endpoint has to go on).
    """

    def get(self, request):
        import boto3
        from django.conf import settings

        stored_url = request.query_params.get('url', '')
        expected_prefix = f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/'
        if not stored_url.startswith(expected_prefix):
            return error_response('Invalid document url', 400)

        key = stored_url[len(expected_prefix):].split('?', 1)[0]
        parts = key.split('/')
        if len(parts) != 3 or parts[0] not in _UPLOAD_CATEGORIES or parts[1] != str(request.user.id):
            return error_response('Document not found', 404)

        s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.DOCUMENTS_S3_BUCKET, 'Key': key},
            ExpiresIn=300,
        )
        return Response({'success': True, 'data': {'url': presigned_url}})
