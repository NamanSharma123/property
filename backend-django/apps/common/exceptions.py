"""
Error handling that reproduces the Express error-response shape:
{"success": false, "error": "<message>"} plus optional extra keys.
"""
import traceback

from django.conf import settings
from rest_framework import exceptions as drf_exceptions
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class ApiError(Exception):
    """Raise anywhere in a view to return the Node-style error payload."""

    def __init__(self, message, status_code=500, **extra):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.extra = extra


def error_response(message, status_code, **extra):
    payload = {'success': False, 'error': message}
    payload.update(extra)
    return Response(payload, status=status_code)


def exception_handler(exc, context):
    if isinstance(exc, ApiError):
        return error_response(exc.message, exc.status_code, **exc.extra)

    if isinstance(exc, drf_exceptions.ParseError):
        return error_response('Invalid request body', 400)

    if isinstance(exc, (drf_exceptions.NotAuthenticated, drf_exceptions.AuthenticationFailed)):
        return error_response('Not authorized - No token provided', 401)

    if isinstance(exc, drf_exceptions.MethodNotAllowed):
        return error_response(str(exc.detail), 405)

    response = drf_exception_handler(exc, context)
    if response is not None:
        detail = response.data.get('detail', 'Server Error') if isinstance(response.data, dict) else 'Server Error'
        return error_response(str(detail), response.status_code)

    # Unhandled exception -> 500, matching the Express errorHandler
    payload = {'success': False, 'error': str(exc) or 'Server Error'}
    if settings.DEBUG:
        payload['stack'] = traceback.format_exc()
    return Response(payload, status=500)
