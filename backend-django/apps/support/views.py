"""
User-facing support ticket endpoints — same conventions as apps.properties/
apps.loans (owner-scoped, functional row serializers). Not wired into the
frontend/app/dashboard/tickets page yet (still a static mock) — this exists
so that page can be wired to real data unchanged, and so the admin panel's
cross-user ticket views (apps.admin_panel.views_support) have a real table.
Internal notes (TicketMessage.is_internal_note) are always excluded from
what a non-admin user sees.
"""
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.pagination import get_pagination, pagination_payload
from apps.common.utils import log_activity
from apps.common.views import ProtectedView

from .models import Ticket, TicketMessage
from .serializers import ticket_message_row, ticket_row


class TicketListView(ProtectedView):
    def get(self, request):
        qs = Ticket.objects.filter(user_id=request.user.id)
        if request.query_params.get('status'):
            qs = qs.filter(status=request.query_params['status'])

        page, limit, offset = get_pagination(request, default_limit=20)
        total = qs.count()
        tickets = qs.order_by('-created_at')[offset:offset + limit]

        return Response({
            'success': True,
            'data': {'tickets': [ticket_row(t) for t in tickets], 'pagination': pagination_payload(page, limit, total)},
        })

    def post(self, request):
        data = request.data
        subject = (data.get('subject') or '').strip()
        message = (data.get('message') or '').strip()

        if not subject:
            return error_response('Subject is required', 400)
        if not message:
            return error_response('Message is required', 400)

        ticket = Ticket.objects.create(
            user_id=request.user.id,
            subject=subject,
            category=data.get('category') or 'other',
            priority=data.get('priority') or 'medium',
        )
        TicketMessage.objects.create(ticket=ticket, author_id=request.user.id, body=message)

        log_activity(request.user.id, 'ticket_create', request=request,
                     resource_type='ticket', resource_id=ticket.id, success=True)

        return Response({
            'success': True,
            'data': {'ticket': ticket_row(ticket)},
            'message': 'Support ticket submitted',
        }, status=201)


class TicketDetailView(ProtectedView):
    def get(self, request, ticket_id):
        ticket = Ticket.objects.filter(id=ticket_id, user_id=request.user.id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        messages = TicketMessage.objects.filter(ticket_id=ticket_id, is_internal_note=False).order_by('created_at')

        row = ticket_row(ticket)
        row['messages'] = [ticket_message_row(m) for m in messages]

        return Response({'success': True, 'data': {'ticket': row}})


class TicketMessageCreateView(ProtectedView):
    def post(self, request, ticket_id):
        ticket = Ticket.objects.filter(id=ticket_id, user_id=request.user.id).first()
        if not ticket:
            return error_response('Ticket not found', 404)

        body = (request.data.get('message') or '').strip()
        if not body:
            return error_response('Message is required', 400)

        message = TicketMessage.objects.create(ticket=ticket, author_id=request.user.id, body=body)

        if ticket.status == 'resolved':
            ticket.status = 'open'
            ticket.save(update_fields=['status'])

        return Response({
            'success': True,
            'data': {'message': ticket_message_row(message)},
            'message': 'Reply sent',
        }, status=201)
