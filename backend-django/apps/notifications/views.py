"""
Notification endpoints — port of backend/src/controllers/notificationController.js.
"""
from rest_framework.response import Response

from apps.common.exceptions import error_response
from apps.common.utils import model_row, parse_int
from apps.common.views import ProtectedView

from .models import Notification


class NotificationListView(ProtectedView):
    def get(self, request):
        limit = parse_int(request.query_params.get('limit'), 20)
        unread_only = request.query_params.get('unreadOnly') == 'true'

        qs = Notification.objects.filter(user_id=request.user.id)
        if unread_only:
            qs = qs.filter(is_read=False)

        notifications = qs.order_by('-created_at')[:limit]
        unread_count = Notification.objects.filter(user_id=request.user.id, is_read=False).count()

        return Response({
            'success': True,
            'data': {
                'notifications': [model_row(n) for n in notifications],
                'unreadCount': unread_count,
            },
        })


class MarkAsReadView(ProtectedView):
    def put(self, request, notification_id):
        notification = Notification.objects.filter(
            id=notification_id, user_id=request.user.id
        ).first()
        if not notification:
            return error_response('Notification not found', 404)

        notification.is_read = True
        notification.save(update_fields=['is_read'])

        return Response({
            'success': True,
            'data': {'notification': model_row(notification)},
            'message': 'Notification marked as read',
        })


class MarkAllAsReadView(ProtectedView):
    def put(self, request):
        Notification.objects.filter(user_id=request.user.id, is_read=False).update(is_read=True)
        return Response({'success': True, 'message': 'All notifications marked as read'})


class NotificationDetailView(ProtectedView):
    def delete(self, request, notification_id):
        deleted, _ = Notification.objects.filter(
            id=notification_id, user_id=request.user.id
        ).delete()
        if not deleted:
            return error_response('Notification not found', 404)

        return Response({'success': True, 'message': 'Notification deleted'})
