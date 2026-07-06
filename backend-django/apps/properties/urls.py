from django.urls import path

from . import views

urlpatterns = [
    path('properties', views.PropertyListView.as_view()),
    path('properties/stats', views.PropertyStatsView.as_view()),
    path('properties/<uuid:property_id>', views.PropertyDetailView.as_view()),
]
