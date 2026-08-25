from django.urls import path

from . import views

urlpatterns = [
    path('loans', views.LoanListView.as_view()),
    path('loans/<uuid:loan_id>', views.LoanDetailView.as_view()),
]
