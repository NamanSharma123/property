"""
Admin views over apps.email_inbox.EmailMessage — the "Email Processing
Module" tab inside the OCR Review Panel page. See apps/email_inbox/views.py
for the inbound webhook these rows come from.
"""
from django.db.models import Q
from rest_framework.response import Response

from apps.accounts.models import User
from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import log_activity
from apps.email_inbox.models import EmailMessage
from apps.email_inbox.processing import process_pending_messages
from apps.email_inbox.serializers import email_message_row
from apps.ocr.models import Document
from apps.properties.models import Property

from .base import AdminProtectedView
from .utils import log_admin_action


class AdminEmailInboxListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = EmailMessage.objects.select_related('user', 'property')

        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('userId'):
            qs = qs.filter(user_id=params['userId'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(sender__icontains=search) | Q(subject__icontains=search) | Q(receiver__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        messages = qs.order_by('-received_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {
                'emailMessages': [email_message_row(m) for m in messages],
                'pagination': pagination_payload(page, limit, total),
            },
        })


class AdminEmailDetailView(AdminProtectedView):
    def get(self, request, message_id):
        msg = EmailMessage.objects.select_related('user', 'property').filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)
        return Response({'success': True, 'data': {'emailMessage': email_message_row(msg)}})


class AdminEmailMapView(AdminProtectedView):
    """POST /api/admin/email-inbox/<id>/map — {userId?, propertyId?}. Lets
    an admin manually attach a message to a user/property when the
    receiver address didn't resolve automatically (or was wrong)."""
    allow_support = False

    def post(self, request, message_id):
        msg = EmailMessage.objects.filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)

        user_id = request.data.get('userId')
        property_id = request.data.get('propertyId')
        if not user_id and not property_id:
            return error_response('userId or propertyId is required', 400)

        if user_id:
            if not User.objects.filter(id=user_id).exists():
                return error_response('User not found', 404)
            msg.user_id = user_id
        if property_id:
            if not Property.objects.filter(id=property_id).exists():
                return error_response('Property not found', 404)
            msg.property_id = property_id

        if msg.status == 'needs_review' and msg.user_id:
            msg.status = 'received'
        msg.save()

        log_admin_action(request.user, 'email.map', request=request, entity_type='email_message',
                          entity_id=msg.id, new_value={'userId': user_id, 'propertyId': property_id})

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg)},
            'message': 'Email mapped',
        })


class AdminEmailConvertView(AdminProtectedView):
    """POST /api/admin/email-inbox/<id>/convert — turns a mapped message's
    attachment into a Document, so it enters the normal OCR review flow
    (Documents list / OCR Review Panel) instead of a separate pipeline."""
    allow_support = False

    def post(self, request, message_id):
        msg = EmailMessage.objects.filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)
        if not msg.user_id:
            return error_response('Map this message to a user before converting it', 400)
        if not msg.attachment_url:
            return error_response('This message has no attachment to convert', 400)
        if msg.document_id:
            return error_response('This message was already converted', 400)

        document = Document.objects.create(
            owner_id=msg.user_id,
            property_id=msg.property_id,
            file_name=msg.attachment_name or (msg.subject or 'email-attachment'),
            file_url=msg.attachment_url,
            file_type='application/octet-stream',
            file_size=0,
            status='pending',
        )
        msg.document = document
        msg.status = 'processed'
        msg.save(update_fields=['document', 'status'])

        log_activity(msg.user_id, 'document_create_from_email', request=request,
                     resource_type='document', resource_id=document.id, success=True)
        log_admin_action(request.user, 'email.convert', request=request, entity_type='email_message',
                          entity_id=msg.id, new_value={'documentId': str(document.id)})

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg), 'documentId': str(document.id)},
            'message': 'Converted to a document — it now appears in the Documents list and OCR Review Panel',
        })


class AdminEmailRunJobView(AdminProtectedView):
    """POST /api/admin/email-inbox/run-job — {ids?}. Unique Email ID spec
    point 5: "Admin should be allowed to run the OCR job for all user on
    demand". Runs apps.email_inbox.processing synchronously against every
    outstanding message (or just `ids`, for retrying specific rows), doing
    on-request what the periodic Celery task (apps.email_inbox.tasks) would
    otherwise do hourly — this works today without a deployed worker."""
    allow_support = False

    def post(self, request):
        ids = request.data.get('ids') or None
        counts = process_pending_messages(message_ids=ids)

        log_admin_action(request.user, 'email.run_ocr_job', request=request, entity_type='email_message',
                          new_value=counts)

        return Response({
            'success': True,
            'data': counts,
            'message': (
                f"Processed {counts['total']} email(s): "
                f"{counts['processed']} processed, {counts['needs_review']} need review, "
                f"{counts['failed']} failed."
            ) if counts['total'] else 'No outstanding emails to process.',
        })
