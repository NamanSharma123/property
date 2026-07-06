from django.urls import path

from . import views

urlpatterns = [
    path('expenses', views.ExpenseListView.as_view()),
    path('expenses/stats', views.ExpenseStatsView.as_view()),
    path('expenses/<uuid:expense_id>', views.ExpenseDetailView.as_view()),
]
