"""
Admin cross-user Support Ticket views. Unlike properties/transactions/
documents, this whole module is available to Support Admins (view, reply,
assign, close, internal notes) — "Support Tickets" is one of their
explicitly granted permissions in the spec, not just "view".
"""
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from rest_framework.response import Response

from apps.accounts.models import User
from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.support.models import Ticket, TicketMessage
from apps.support.serializers import ticket_message_row, ticket_row

from .base import AdminProtectedView
from .utils import log_admin_action


def _notify_user_of_reply(ticket, body):
    """Best-effort email notification (spec: "Email Notification"). Uses
    the same console-fallback EMAIL_BACKEND as password-reset — prints to
    the dev server console when no SMTP credentials are configured, so
    this never blocks the reply on having real email set up."""
    try:
        send_mail(
            subject=f'Re: {ticket.subject}',
            message=(
                f"Hi {ticket.user.name},\n\n"
                f"There's a new reply on your support ticket \"{ticket.subject}\":\n\n"
                f"{body}\n\n"
                f"View it at {settings.FRONTEND_URL}/dashboard/tickets"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ticket.user.email],
            fail_silently=True,
        )
    except Exception:
        pass


class AdminTicketListView(AdminProtectedView):
    def get(self, request):
        params = request.query_params
        qs = Ticket.objects.select_related('user', 'assigned_admin')

        if params.get('status'):
            qs = qs.filter(status=params['status'])
        if params.get('priority'):
            qs = qs.filter(priority=params['priority'])
        if params.get('category'):
            qs = qs.filter(category=params['category'])
        if params.get('assignedAdminId'):
            qs = qs.filter(assigned_admin_id=params['assignedAdminId'])
        if params.get('userId'):
            qs = qs.filter(user_id=params['userId'])
        if params.get('search'):
            search = params['search']
            qs = qs.filter(Q(subject__icontains=search) | Q(user__name__icontains=search) | Q(user__email__icontains=search))

        page, limit, offset = get_pagination(request, default_limit=25)
        total = qs.count()
        tickets = qs.order_by('-updated_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {'tickets': [ticket_row(t) for t in tickets], 'pagination': pagination_payload(page, limit, total)},
        })


class AdminTicketDetailView(AdminProtectedView):
    def get(self, request, ticket_id):
        ticket = Ticket.objects.select_related('user', 'assigned_admin').filter(id=ticket_id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        messages = TicketMessage.objects.filter(ticket_id=ticket_id).select_related('author').order_by('created_at')

        row = ticket_row(ticket)
        row['messages'] = [ticket_message_row(m) for m in messages]

        return Response({'success': True, 'data': {'ticket': row}})


class AdminTicketReplyView(AdminProtectedView):
    def post(self, request, ticket_id):
        ticket = Ticket.objects.select_related('user').filter(id=ticket_id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        body = (request.data.get('message') or '').strip()
        if not body:
            return error_response('Message is required', 400)

        message = TicketMessage.objects.create(ticket=ticket, author=request.user, body=body)

        if ticket.status in ('open', 'resolved'):
            ticket.status = 'in_progress'
            ticket.save(update_fields=['status'])

        _notify_user_of_reply(ticket, body)

        log_admin_action(request.user, 'ticket.reply', request=request, entity_type='ticket', entity_id=ticket.id)

        return Response({'success': True, 'data': {'message': ticket_message_row(message)}, 'message': 'Reply sent'}, status=201)


class AdminTicketInternalNoteView(AdminProtectedView):
    def post(self, request, ticket_id):
        ticket = Ticket.objects.filter(id=ticket_id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        body = (request.data.get('note') or '').strip()
        if not body:
            return error_response('note is required', 400)

        message = TicketMessage.objects.create(ticket=ticket, author=request.user, body=body, is_internal_note=True)

        log_admin_action(request.user, 'ticket.internal_note', request=request, entity_type='ticket', entity_id=ticket.id)

        return Response({'success': True, 'data': {'message': ticket_message_row(message)}, 'message': 'Internal note added'}, status=201)


class AdminTicketAssignView(AdminProtectedView):
    def post(self, request, ticket_id):
        ticket = Ticket.objects.filter(id=ticket_id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        admin_id = request.data.get('adminId')
        if admin_id and not User.objects.filter(id=admin_id, role__in=['admin', 'manager']).exists():
            return error_response('adminId must be an admin or support admin', 400)

        ticket.assigned_admin_id = admin_id or None
        ticket.save(update_fields=['assigned_admin'])

        log_admin_action(request.user, 'ticket.assign', request=request, entity_type='ticket',
                          entity_id=ticket.id, new_value={'assignedAdminId': admin_id})

        return Response({'success': True, 'data': {'ticket': ticket_row(ticket)}, 'message': 'Ticket assigned'})


class AdminTicketStatusView(AdminProtectedView):
    """POST /api/admin/support/tickets/<id>/status — {status}. Covers
    "Close" (status=closed) and reopening (status=open/in_progress)."""

    def post(self, request, ticket_id):
        ticket = Ticket.objects.filter(id=ticket_id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        new_status = request.data.get('status')
        if new_status not in dict(Ticket.STATUS_CHOICES):
            return error_response(f'Invalid status: {new_status}', 400)

        old_status = ticket.status
        ticket.status = new_status
        ticket.save(update_fields=['status'])

        log_admin_action(request.user, 'ticket.status_change', request=request, entity_type='ticket',
                          entity_id=ticket.id, old_value={'status': old_status}, new_value={'status': new_status})

        return Response({'success': True, 'data': {'ticket': ticket_row(ticket)}, 'message': f'Ticket {new_status}'})
