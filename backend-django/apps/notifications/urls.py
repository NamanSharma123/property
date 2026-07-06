from django.urls import path

from . import views

urlpatterns = [
    path('notifications', views.NotificationListView.as_view()),
    path('notifications/read-all', views.MarkAllAsReadView.as_view()),
    path('notifications/<uuid:notification_id>/read', views.MarkAsReadView.as_view()),
    path('notifications/<uuid:notification_id>', views.NotificationDetailView.as_view()),
]
