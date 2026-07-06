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
    path('health', health),
    path('api/', include('api.urls')),
    # Catch-all JSON 404, matching the Express notFound handler
    re_path(r'^.*$', not_found),
]

handler404 = not_found
