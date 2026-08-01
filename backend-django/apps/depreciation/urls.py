from django.urls import path

from . import views

urlpatterns = [
    path('depreciation/upload', views.DepreciationUploadView.as_view()),
    path('depreciation/schedules', views.DepreciationScheduleListView.as_view()),
    path('depreciation/schedule/<uuid:schedule_id>', views.DepreciationScheduleDetailView.as_view()),
]
