"""
Shared role-based permission classes (equivalent of the Express `restrictTo`
middleware).
"""
from rest_framework.permissions import BasePermission

from .exceptions import ApiError


def restrict_to(*roles):
    """Usage: permission_classes = [restrict_to('admin', 'manager')]"""

    class RoleRequired(BasePermission):
        def has_permission(self, request, view):
            user = getattr(request, 'user', None)
            if user is None or user.role not in roles:
                raise ApiError('You do not have permission to perform this action', 403)
            return True

    return RoleRequired
