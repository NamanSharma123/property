from django.urls import path

from . import views

urlpatterns = [
    path('tenants', views.TenantListView.as_view()),
    path('tenants/stats', views.TenantStatsView.as_view()),
    path('tenants/<uuid:tenant_id>', views.TenantDetailView.as_view()),
]
