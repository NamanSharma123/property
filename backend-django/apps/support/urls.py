from django.urls import path

from . import views

urlpatterns = [
    path('tickets', views.TicketListView.as_view()),
    path('tickets/<uuid:ticket_id>', views.TicketDetailView.as_view()),
    path('tickets/<uuid:ticket_id>/messages', views.TicketMessageCreateView.as_view()),
]
