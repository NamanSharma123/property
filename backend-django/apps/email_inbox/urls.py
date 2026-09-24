from django.urls import path

from . import ses_adapter, views

urlpatterns = [
    path('email/inbound', views.EmailInboundWebhookView.as_view()),
    # The URL to give the SNS topic's HTTPS subscription — see ses_adapter.py.
    path('email/ses-inbound', ses_adapter.SESInboundNotificationView.as_view()),
]
