from apps.common.views import ProtectedView

from .permissions import require_admin_role


class AdminProtectedView(ProtectedView):
    """Base for every /api/admin/* view: authenticates via the same JWT the
    user portal uses (ProtectedView), then requires request.user.role to be
    an admin-panel role. Set `allow_support = False` on a subclass to
    restrict it to full Admins (role='admin'), locking out Support Admins
    (role='manager') — used for delete/reset-password/audit-logs/settings.
    """
    allow_support = True

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        require_admin_role(request, allow_support=self.allow_support)
