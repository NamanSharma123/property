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
        qs = EmailMessage.objects.select_related('user', 'property', 'document').prefetch_related('attachments')

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
        msg = EmailMessage.objects.select_related('user', 'property', 'document').prefetch_related('attachments').filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)
        return Response({'success': True, 'data': {'emailMessage': email_message_row(msg)}})

    def delete(self, request, message_id):
        from .permissions import is_full_admin
        if not is_full_admin(request.user):
            return error_response('Admin access required', 403)
        msg = EmailMessage.objects.filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)

        snapshot = email_message_row(msg)
        msg.delete()

        log_admin_action(request.user, 'email.delete', request=request, entity_type='email_message',
                          entity_id=message_id, old_value=snapshot)

        return Response({'success': True, 'message': 'Email removed successfully'})


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
    attachment(s) into Document row(s), so they enter the normal OCR
    review flow (Documents list / OCR Review Panel) without running OCR.
    A manual fallback alongside the automatic pipeline in
    apps.email_inbox.processing (which does this AND runs OCR AND creates
    transactions in one step) — useful when an admin just wants the file
    filed as a document without touching the automated OCR job."""
    allow_support = False

    def post(self, request, message_id):
        msg = EmailMessage.objects.prefetch_related('attachments').filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)
        if not msg.user_id:
            return error_response('Map this message to a user before converting it', 400)

        attachments = list(msg.attachments.filter(document__isnull=True))
        if not attachments and not msg.attachment_url:
            return error_response('This message has no attachment to convert', 400)
        if not attachments and msg.document_id:
            return error_response('This message was already converted', 400)

        documents = []
        if attachments:
            for att in attachments:
                document = Document.objects.create(
                    owner_id=msg.user_id,
                    property_id=msg.property_id,
                    file_name=att.file_name or (msg.subject or 'email-attachment'),
                    file_url=att.file_url,
                    file_type=att.content_type or 'application/octet-stream',
                    file_size=att.file_size or 0,
                    status='pending',
                )
                att.document = document
                att.save(update_fields=['document'])
                documents.append(document)
        else:
            # Legacy rows with no EmailAttachment rows at all.
            document = Document.objects.create(
                owner_id=msg.user_id,
                property_id=msg.property_id,
                file_name=msg.attachment_name or (msg.subject or 'email-attachment'),
                file_url=msg.attachment_url,
                file_type='application/octet-stream',
                file_size=0,
                status='pending',
            )
            documents.append(document)

        if not msg.document_id:
            msg.document = documents[0]
        msg.status = 'processed'
        msg.save(update_fields=['document', 'status'])

        for document in documents:
            log_activity(msg.user_id, 'document_create_from_email', request=request,
                         resource_type='document', resource_id=document.id, success=True)
        log_admin_action(request.user, 'email.convert', request=request, entity_type='email_message',
                          entity_id=msg.id, new_value={'documentIds': [str(d.id) for d in documents]})

        return Response({
            'success': True,
            'data': {
                'emailMessage': email_message_row(msg),
                'documentId': str(documents[0].id),
                'documentIds': [str(d.id) for d in documents],
            },
            'message': f'Converted {len(documents)} attachment(s) to document(s) — they now appear in the Documents list and OCR Review Panel',
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

        if counts['total']:
            message = (
                f"Processed {counts['total']} email(s): "
                f"{counts['processed']} processed, {counts['needs_review']} need review, "
                f"{counts['failed']} failed."
            )
        elif counts['skipped']:
            # Req 1: this button only ever touches received/needs_review
            # messages — a nonzero skip count here means every selected row
            # was already processed/rejected/failed and was correctly left
            # alone, not silently reprocessed.
            message = f"{counts['skipped']} email(s) skipped — already processed or not eligible for OCR."
        else:
            message = 'No outstanding emails to process.'

        return Response({'success': True, 'data': counts, 'message': message})


class AdminEmailDeleteFromServerView(AdminProtectedView):
    """POST /api/admin/email-inbox/<id>/delete-from-server — Req 6. Removes
    the ORIGINAL raw email from the S3 bucket SES delivered it into (the
    "server"/inbox in this architecture — see ses_adapter.py; there's no
    IMAP/Gmail/Graph integration in this project, inbound mail only ever
    arrives via SES). Manual, admin-triggered — the safer of the two
    options the spec allows, since conditions for safe automatic deletion
    (and what counts as "large") vary per deployment and shouldn't be
    guessed at here.

    Conservative eligibility, enforced server-side (Req 13): only once the
    statement has reached a terminal, already-recorded outcome — either
    the email itself hard-failed OCR, or an admin rejected its document
    (Document.status='failed' is what AdminOcrRejectView sets) — so the
    application's own copy of whatever useful data existed is already
    captured before the source is removed. Deleting the source email does
    NOT touch the EmailMessage/Document/Transaction rows (Req 6 explicit
    requirement) — only source_deleted_at is set, as a record that the
    server copy is gone."""
    allow_support = False

    def post(self, request, message_id):
        import boto3
        from django.conf import settings
        from django.utils import timezone

        msg = EmailMessage.objects.select_related('document').filter(id=message_id).first()
        if not msg:
            return error_response('Email message not found', 404)

        if msg.source_deleted_at:
            return error_response('This email was already deleted from the server', 400)

        if not msg.source_s3_bucket or not msg.source_s3_key:
            return error_response(
                'No source location recorded for this email (it may predate this feature, or arrived via the test webhook, not SES) — nothing to delete.',
                400,
            )

        is_rejected_or_failed = msg.status == 'failed' or (msg.document_id and msg.document.status == 'failed')
        if not is_rejected_or_failed:
            return error_response(
                'Only a rejected or failed email can be deleted from the server — this one is still active '
                '(a human/the system may still need its original attachment).',
                400,
            )

        try:
            s3 = boto3.client('s3', region_name=settings.SES_INBOUND_S3_REGION)
            s3.delete_object(Bucket=msg.source_s3_bucket, Key=msg.source_s3_key)
        except Exception as exc:
            return error_response(f'Failed to delete from server: {exc}', 500)

        msg.source_deleted_at = timezone.now()
        msg.save(update_fields=['source_deleted_at'])

        log_admin_action(request.user, 'email.delete_from_server', request=request, entity_type='email_message',
                          entity_id=msg.id, new_value={'bucket': msg.source_s3_bucket, 'key': msg.source_s3_key})

        return Response({
            'success': True,
            'data': {'emailMessage': email_message_row(msg)},
            'message': 'Deleted the original email from the server. Your recorded document/transaction data is unaffected.',
        })
