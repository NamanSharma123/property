"""
Cross-user Document Vault admin views, on top of apps.ocr.Document (no
separate "documents" table — see Phase 1 plan notes on why).
"""
from django.db.models import Q
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import model_row
from apps.ocr.models import Document

from .base import AdminProtectedView
from .utils import log_admin_action


class AdminDocumentListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Document.objects.select_related('owner', 'property')

        if params.get('userId'):
            qs = qs.filter(owner_id=params['userId'])
        if params.get('propertyId'):
            qs = qs.filter(property_id=params['propertyId'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('documentType'):
            qs = qs.filter(document_type=params['documentType'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(file_name__icontains=search) | Q(owner__name__icontains=search) | Q(owner__email__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        documents = qs.order_by('-created_at')[offset:offset + limit]

        rows = [
            model_row(
                d,
                owner_name=d.owner.name if d.owner_id else None,
                owner_email=d.owner.email if d.owner_id else None,
                property_name=d.property.name if d.property_id else None,
            )
            for d in documents
        ]

        return Response({
            'success': True,
            'data': {'documents': rows, 'pagination': pagination_payload(page, limit, total)},
        })


class AdminDocumentDetailView(AdminProtectedView):
    allow_support = False

    def delete(self, request, document_id):
        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        snapshot = model_row(document)
        document.delete()

        log_admin_action(request.user, 'document.delete', request=request, entity_type='document',
                          entity_id=document_id, old_value=snapshot)

        return Response({'success': True, 'message': 'Document deleted successfully'})


class AdminDocumentViewUrlView(AdminProtectedView):
    """GET /api/admin/documents/<id>/view-url — presigns the document's own
    stored S3 URL (looked up from the DB row, not trusted from the client),
    so an admin can preview/download any user's document. The user-facing
    apps.ocr.views.DocumentViewUrlView can't be reused here as-is — it only
    presigns keys whose embedded user-id segment matches request.user.id,
    which is exactly wrong for an admin looking at someone else's file."""

    def get(self, request, document_id):
        import boto3
        from django.conf import settings

        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        if not settings.DOCUMENTS_S3_BUCKET:
            return error_response('Document storage is not configured', 503)

        expected_prefix = f'https://{settings.DOCUMENTS_S3_BUCKET}.s3.{settings.DOCUMENTS_S3_REGION}.amazonaws.com/'
        if not document.file_url.startswith(expected_prefix):
            return error_response('Document is not stored in S3', 400)

        key = document.file_url[len(expected_prefix):].split('?', 1)[0]

        try:
            s3 = boto3.client('s3', region_name=settings.DOCUMENTS_S3_REGION)
            presigned_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.DOCUMENTS_S3_BUCKET, 'Key': key},
                ExpiresIn=300,
            )
        except Exception as exc:
            return error_response(f'Failed to generate preview link: {exc}', 500)

        return Response({'success': True, 'data': {'url': presigned_url}})


class AdminDocumentReprocessView(AdminProtectedView):
    """POST /api/admin/documents/<id>/reprocess. OCR extraction itself runs
    client-side (Tesseract, in the browser — see apps.ocr.views for where
    results get posted back), so there is no server-side pipeline this can
    invoke synchronously. This resets the document to 'pending' and clears
    its prior OCR output, so it's picked up again the next time it's opened
    for extraction (and shows up in the OCR Review Panel once that's built
    in Phase 3) — it does not perform new OCR itself."""
    allow_support = False

    def post(self, request, document_id):
        document = Document.objects.filter(id=document_id).first()
        if not document:
            return error_response('Document not found', 404)

        old_status = document.status
        document.status = 'pending'
        document.ocr_raw_text = None
        document.ocr_confidence = None
        document.error_message = None
        document.processing_started_at = None
        document.processing_completed_at = None
        document.save(update_fields=[
            'status', 'ocr_raw_text', 'ocr_confidence', 'error_message',
            'processing_started_at', 'processing_completed_at',
        ])

        log_admin_action(request.user, 'document.reprocess', request=request, entity_type='document',
                          entity_id=document_id, old_value={'status': old_status}, new_value={'status': 'pending'})

        return Response({
            'success': True,
            'data': {'document': model_row(document)},
            'message': 'Document queued for reprocessing',
        })
