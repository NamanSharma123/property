from django.urls import path

from . import views

urlpatterns = [
    path('transactions', views.TransactionListView.as_view()),
    path('transactions/stats', views.TransactionStatsView.as_view()),
    path('transactions/monthly', views.MonthlyBreakdownView.as_view()),
    path('transactions/<uuid:transaction_id>', views.TransactionDetailView.as_view()),
]
