"""
Root routing — Django admin at /admin/, everything else mounted under /api/
with the exact same paths as the Express backend, plus /health.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.utils import timezone


def health(request):
    return JsonResponse({
        'success': True,
        'message': 'Server is running',
        'timestamp': timezone.now().isoformat().replace('+00:00', 'Z'),
        'database': 'PostgreSQL (Supabase)',
    })


def not_found(request, exception=None):
    return JsonResponse(
        {'success': False, 'error': f'Route {request.path} not found'},
        status=404,
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health', health),
    # Each app's urls.py is included flat under /api/
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.properties.urls')),
    path('api/', include('apps.transactions.urls')),
    path('api/', include('apps.tenants.urls')),
    path('api/', include('apps.expenses.urls')),
    path('api/', include('apps.categories.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.ocr.urls')),
    # Catch-all JSON 404, matching the Express notFound handler
    re_path(r'^.*$', not_found),
]

handler404 = not_found
