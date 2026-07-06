"""
File text-extraction endpoints — port of backend/src/controllers/pdfController.js.

- PDFs: text extraction with pypdf (no OCR).
- Images: OCR with pytesseract (requires the Tesseract binary to be installed;
  see README).
"""
import io
import re

from rest_framework.response import Response

from ..exceptions import error_response
from ..ocr_parser import extract_data
from .base import ProtectedView

ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
]

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB, same as the multer limit


def _validate_upload(uploaded):
    if uploaded is None:
        return None
    if uploaded.content_type not in ALLOWED_MIMES:
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

    words = []
    confidences = []
    for word, conf in zip(ocr['text'], ocr['conf']):
        if word.strip():
            words.append(word)
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
