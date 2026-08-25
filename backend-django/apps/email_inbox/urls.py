from django.urls import path

from . import views

urlpatterns = [
    path('email/inbound', views.EmailInboundWebhookView.as_view()),
]
