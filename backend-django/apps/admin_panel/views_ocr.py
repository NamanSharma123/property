"""
OCR Review Panel admin views (Pending Review / Processed / Failed tabs) on
top of apps.ocr.Document/OCRJob/ExtractedData/DocumentLineItem/Review, plus
the OCR Template registry (informational/toggleable — see
apps.ocr.models.OcrTemplate docstring for why it doesn't actually drive
parsing).

Listing/preview reuse apps.admin_panel.views_documents (AdminDocumentListView
filtered by ?status=, AdminDocumentViewUrlView) rather than duplicating them
— this module only adds what's OCR-review-specific: the extracted-field
detail view (scoped to the latest OCRJob, full attempt history alongside
it), approve/reject (+ bulk, each leaving a Review row), reprocess
(re-OCR — a new OCRJob attempt), and per-field corrections.
"""
from datetime import date as date_cls
from decimal import Decimal, InvalidOperation

from django.utils import timezone
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.utils import coerce_date, model_row, to_snake
from apps.ocr.models import Document, DocumentLineItem, ExtractedData, OCRJob, OcrTemplate, Review
from apps.properties.models import Property
from apps.transactions.models import Transaction
from apps.transactions.serializers import transaction_row

from .base import AdminProtectedView
from .utils import log_admin_action


class AdminOcrDocumentDetailView(AdminProtectedView):
    def get(self, request, document_id):
        document = Document.objects.select_related('owner', 'property').filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        jobs = list(OCRJob.objects.filter(document_id=document_id).order_by('-attempt_number'))
        latest_job = jobs[0] if jobs else None

        # Scoped to the latest attempt only — a document that's been
        # reprocessed would otherwise show every attempt's line items
        # mixed together. Pre-OCRJob rows (ocr_job is null) still show for
        # documents that predate this, or came from the direct-upload flow.
        if latest_job:
            extracted = ExtractedData.objects.filter(document_id=document_id, ocr_job=latest_job).order_by('field_name')
            line_items = DocumentLineItem.objects.filter(document_id=document_id, ocr_job=latest_job).order_by('line_number', 'created_at')
        else:
            extracted = ExtractedData.objects.filter(document_id=document_id, ocr_job__isnull=True).order_by('field_name')
            line_items = DocumentLineItem.objects.filter(document_id=document_id, ocr_job__isnull=True).order_by('line_number', 'created_at')

        row = model_row(
            document,
            owner_name=document.owner.name if document.owner_id else None,
            owner_email=document.owner.email if document.owner_id else None,
            property_name=document.property.name if document.property_id else None,
        )
        row['extractedData'] = [model_row(e) for e in extracted]
        row['lineItems'] = [model_row(li) for li in line_items]
        row['ocrJobs'] = [model_row(j) for j in jobs]
        row['reviews'] = [
            model_row(r, reviewer_name=r.reviewer.name if r.reviewer_id else None)
            for r in Review.objects.filter(document_id=document_id).select_related('reviewer').order_by('-created_at')
        ]

        return Response({'success': True, 'data': {'document': row}})


class AdminOcrReprocessView(AdminProtectedView):
    """POST /api/admin/ocr/documents/<id>/reprocess — re-OCR spec
    requirement: "an authorized user/admin to request re-OCR ... the new
    OCR attempt must create a new OCRJob". Runs a fresh OCR attempt against
    the same file and leaves the document 'pending' for review — deliberately
    does NOT auto-create a transaction the way the first automatic email
    pass can; a reprocess exists because the result was wrong, so a human
    reviews the new attempt (via approve/reject) before it's trusted."""

    def post(self, request, document_id):
        from apps.email_inbox.processing import run_ocr_extraction

        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        job = run_ocr_extraction(document, triggered_by=request.user, config=request.data.get('config') or {})

        Review.objects.create(
            document=document, ocr_job=job, reviewer=request.user,
            status='reprocess_requested', notes=request.data.get('reason') or None,
            reviewed_at=timezone.now(),
        )

        log_admin_action(request.user, 'ocr.reprocess', request=request, entity_type='document',
                          entity_id=document.id, new_value={'ocrJobId': str(job.id), 'attempt': job.attempt_number, 'status': job.status})

        return Response({
            'success': True,
            'data': {'document': model_row(document), 'ocrJob': model_row(job)},
            'message': f'Re-OCR attempt #{job.attempt_number} {job.status}' + (
                ' — review the new result before approving.' if job.status == 'completed' else f': {job.error_message}'
            ),
        })


def _create_transaction_from_document(document, request, corrections):
    """Approve-and-create-transaction: uses admin-corrected values where
    given, falling back to whatever the document already carries."""
    property_id = corrections.get('propertyId') or document.property_id
    if not property_id:
        return None, 'A property is required to create a transaction'

    prop = Property.objects.filter(id=property_id).first()
    if not prop:
        return None, 'Property not found'

    try:
        amount = Decimal(str(corrections.get('amount')))
    except (InvalidOperation, TypeError):
        return None, 'A valid amount is required to create a transaction'

    tx_date = coerce_date(corrections.get('date')) or date_cls.today().isoformat()

    transaction = Transaction.objects.create(
        owner_id=prop.owner_id,
        property_id=property_id,
        description=corrections.get('description') or document.file_name,
        amount=amount,
        date=tx_date,
        type=corrections.get('type') or 'expense',
        category_name=corrections.get('categoryName') or None,
        transaction_source='OCR Upload',
        status='pending',
        source_document_id=document.id,
        created_by_id=request.user.id,
    )
    return transaction, None


class AdminOcrApproveView(AdminProtectedView):
    """POST /api/admin/ocr/documents/<id>/approve — {createTransaction?,
    propertyId?, categoryName?, amount?, date?, description?, type?}.
    Support Admins get this too — "OCR Review Panel" is one of their
    explicitly granted permissions in the spec, unlike edit/delete on
    properties/transactions/documents."""

    def post(self, request, document_id):
        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        transaction = None
        if request.data.get('createTransaction'):
            transaction, err = _create_transaction_from_document(document, request, request.data)
            if err:
                return error_response(err, 400)

        document.status = 'completed'
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save(update_fields=['status', 'reviewed_by', 'reviewed_at'])

        latest_job = OCRJob.objects.filter(document=document).order_by('-attempt_number').first()
        Review.objects.create(
            document=document, ocr_job=latest_job, reviewer=request.user,
            status='approved', reviewed_at=timezone.now(),
        )

        log_admin_action(request.user, 'ocr.approve', request=request, entity_type='document',
                          entity_id=document.id, new_value={'transactionCreated': bool(transaction)})

        return Response({
            'success': True,
            'data': {
                'document': model_row(document),
                'transaction': transaction_row(transaction) if transaction else None,
            },
            'message': 'Document approved' + (' and transaction created' if transaction else ''),
        })


class AdminOcrRejectView(AdminProtectedView):
    """POST /api/admin/ocr/documents/<id>/reject — {reason?}."""

    def post(self, request, document_id):
        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        reason = request.data.get('reason') or 'Rejected in admin review'
        document.status = 'failed'
        document.error_message = reason
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save(update_fields=['status', 'error_message', 'reviewed_by', 'reviewed_at'])

        latest_job = OCRJob.objects.filter(document=document).order_by('-attempt_number').first()
        Review.objects.create(
            document=document, ocr_job=latest_job, reviewer=request.user,
            status='rejected', notes=reason, reviewed_at=timezone.now(),
        )

        log_admin_action(request.user, 'ocr.reject', request=request, entity_type='document', entity_id=document.id)

        return Response({'success': True, 'data': {'document': model_row(document)}, 'message': 'Document rejected'})


class AdminOcrBulkApproveView(AdminProtectedView):
    def post(self, request):
        ids = request.data.get('ids') or []
        if not ids:
            return error_response('ids is required', 400)

        updated = Document.objects.filter(id__in=ids).update(
            status='completed', reviewed_by=request.user, reviewed_at=timezone.now()
        )
        Review.objects.bulk_create([
            Review(document_id=doc_id, reviewer=request.user, status='approved', reviewed_at=timezone.now())
            for doc_id in ids
        ])
        log_admin_action(request.user, 'ocr.bulk_approve', request=request, entity_type='document', new_value={'ids': ids})
        return Response({'success': True, 'message': f'{updated} document(s) approved'})


class AdminOcrBulkRejectView(AdminProtectedView):
    def post(self, request):
        ids = request.data.get('ids') or []
        if not ids:
            return error_response('ids is required', 400)

        updated = Document.objects.filter(id__in=ids).update(
            status='failed', reviewed_by=request.user, reviewed_at=timezone.now()
        )
        Review.objects.bulk_create([
            Review(document_id=doc_id, reviewer=request.user, status='rejected', reviewed_at=timezone.now())
            for doc_id in ids
        ])
        log_admin_action(request.user, 'ocr.bulk_reject', request=request, entity_type='document', new_value={'ids': ids})
        return Response({'success': True, 'message': f'{updated} document(s) rejected'})


class AdminExtractedDataUpdateView(AdminProtectedView):
    """PUT /api/admin/ocr/extracted-data/<id> — {value}. Admin correction
    on a single OCR field, matching the wireframe's editable-extracted-
    values panel."""

    def put(self, request, extracted_id):
        field = ExtractedData.objects.filter(id=extracted_id).first()
        if not field:
            return error_response('Extracted field not found', 404)

        new_value = request.data.get('value')
        if new_value is None:
            return error_response('value is required', 400)

        field.corrected_value = str(new_value)
        field.is_validated = True
        field.validation_status = 'corrected'
        field.corrected_by = request.user
        field.corrected_at = timezone.now()
        field.save(update_fields=['corrected_value', 'is_validated', 'validation_status', 'corrected_by', 'corrected_at'])

        log_admin_action(request.user, 'ocr.correct_field', request=request, entity_type='extracted_data',
                          entity_id=field.id, new_value={'field': field.field_name, 'value': new_value})

        return Response({'success': True, 'data': {'extractedData': model_row(field)}, 'message': 'Field corrected'})


# ───────────────────────── OCR templates ─────────────────────────

class AdminOcrTemplateListView(AdminProtectedView):
    def get(self, request):
        templates = OcrTemplate.objects.all()
        return Response({'success': True, 'data': {'templates': [model_row(t) for t in templates]}})


class AdminOcrTemplateDetailView(AdminProtectedView):
    allow_support = False

    def put(self, request, template_id):
        template = OcrTemplate.objects.filter(id=template_id).first()
        if not template:
            return error_response('Template not found', 404)

        allowed = ['status', 'confidence_threshold', 'version', 'description']
        updates = {}
        for key, value in request.data.items():
            snake_key = to_snake(key)
            if snake_key in allowed:
                updates[snake_key] = value

        if not updates:
            return error_response('No valid fields to update', 400)

        for field, value in updates.items():
            setattr(template, field, value)
        template.save()

        log_admin_action(request.user, 'ocr.template_edit', request=request, entity_type='ocr_template',
                          entity_id=template.id, new_value=updates)

        return Response({'success': True, 'data': {'template': model_row(template)}, 'message': 'Template updated'})
