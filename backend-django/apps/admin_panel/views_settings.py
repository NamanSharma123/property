"""
Settings page backend. Two parts, deliberately kept separate:

- Editable key/value settings (apps.admin_panel.models.PlatformSetting) —
  the non-secret ones: company branding, theme accent, logo, support
  email, default trial days.
- Read-only integration status — whether the S3/SES/inbound-email/Basiq/
  Postal-API config this app actually reads (env vars in
  config/settings/base.py) is present, without ever returning the secret
  values themselves. Basiq and a Postal API integration don't exist in
  this codebase at all yet (see Shelly_CRM/README.md phases) — reported
  honestly as "not built" rather than faked as configured/unconfigured.
"""
from django.conf import settings
from rest_framework.response import Response

from apps.common.exceptions import error_response

from .base import AdminProtectedView
from .models import PlatformSetting
from .utils import log_admin_action

EDITABLE_DEFAULTS = {
    'company_name': 'Properly',
    'support_email': settings.DEFAULT_FROM_EMAIL,
    'theme_accent_color': '#4f46e5',
    'logo_url': '',
    'default_trial_days': '14',
}


def _integration_status():
    return [
        {
            'key': 'aws_s3', 'label': 'AWS S3 (Document Vault)',
            'configured': bool(settings.DOCUMENTS_S3_BUCKET),
            'detail': settings.DOCUMENTS_S3_BUCKET or 'DOCUMENTS_S3_BUCKET not set',
        },
        {
            'key': 'smtp', 'label': 'SMTP (email sending)',
            'configured': bool(settings.EMAIL_HOST_PASSWORD),
            'detail': 'Configured' if settings.EMAIL_HOST_PASSWORD else 'Falling back to console (dev-only) output',
        },
        {
            'key': 'inbound_email', 'label': 'AWS SES inbound email',
            'configured': bool(settings.INBOUND_EMAIL_WEBHOOK_SECRET),
            'detail': f'Domain: {settings.INBOUND_EMAIL_DOMAIN} — webhook secret ' +
                      ('set' if settings.INBOUND_EMAIL_WEBHOOK_SECRET else 'not set (endpoint closed)'),
        },
        {
            'key': 'ocr_api', 'label': 'OCR extraction',
            'configured': True,
            'detail': 'Runs client-side (Tesseract in-browser) — no server-side API key needed',
        },
        {
            'key': 'postal_api', 'label': 'Postal / address-lookup API',
            'configured': False,
            'detail': 'Not built yet',
        },
        {
            'key': 'basiq', 'label': 'Basiq open banking',
            'configured': False,
            'detail': 'Not built yet — reserved fields exist on Loan (basiq_status)',
        },
        {
            'key': 'stripe', 'label': 'Stripe billing',
            'configured': False,
            'detail': 'Dependency installed, not wired to any endpoint',
        },
    ]


class AdminSettingsView(AdminProtectedView):
    allow_support = False

    def get(self, request):
        stored = {row.key: row.value for row in PlatformSetting.objects.all()}
        editable = {key: stored.get(key, default) for key, default in EDITABLE_DEFAULTS.items()}

        return Response({
            'success': True,
            'data': {'settings': editable, 'integrations': _integration_status()},
        })

    def put(self, request):
        updates = {k: v for k, v in request.data.items() if k in EDITABLE_DEFAULTS}
        if not updates:
            return error_response(f'No valid settings in body. Allowed: {", ".join(EDITABLE_DEFAULTS)}', 400)

        for key, value in updates.items():
            PlatformSetting.objects.update_or_create(
                key=key, defaults={'value': str(value), 'updated_by': request.user}
            )

        log_admin_action(request.user, 'settings.update', request=request, entity_type='platform_setting',
                          new_value=updates)

        stored = {row.key: row.value for row in PlatformSetting.objects.all()}
        editable = {key: stored.get(key, default) for key, default in EDITABLE_DEFAULTS.items()}

        return Response({'success': True, 'data': {'settings': editable}, 'message': 'Settings saved'})
