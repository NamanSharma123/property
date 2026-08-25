"""
Admin-panel access control. Not a DRF permission class — this codebase
authenticates/authorizes by hand inside ProtectedView subclasses (see
apps.common.views.ProtectedView), so this follows the same shape.

Two admin-panel roles, both mapped onto the existing User.role field (no
schema change): role='admin' is the full Admin; role='manager' is Support
Admin (view-heavy, no destructive/billing/settings access); role='staff' is
a regular portal user with no admin-panel access at all.
"""
from apps.common.exceptions import ApiError

ADMIN_ROLE = 'admin'
SUPPORT_ROLE = 'manager'
ADMIN_PANEL_ROLES = (ADMIN_ROLE, SUPPORT_ROLE)


def require_admin_role(request, allow_support=True):
    """Raise ApiError(403) unless the authenticated user may use this admin
    endpoint. `allow_support=False` restricts it to full Admins only."""
    role = request.user.role
    if role == ADMIN_ROLE:
        return
    if allow_support and role == SUPPORT_ROLE:
        return
    raise ApiError('Admin access required', 403)


def is_full_admin(user):
    return user.role == ADMIN_ROLE
