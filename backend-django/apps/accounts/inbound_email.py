"""
Generates each user's permanent inbound-email address for the OCR ingestion
pipeline (spec pattern: "<digits>@<domain>", e.g. a phone number). Phone
isn't collected at signup today, so the digits are derived from the user's
UUID instead — that's always present and, being a UUID, never collides,
so this needs no uniqueness retry loop. If phone capture is added to signup
later, this can switch its source without changing the address shape or
breaking the "immutable once set" guarantee (still called once, at signup).
"""
from django.conf import settings


def generate_inbound_email(user_id):
    digits = str(int(user_id.hex if hasattr(user_id, 'hex') else str(user_id).replace('-', ''), 16))
    return f'{digits}@{settings.INBOUND_EMAIL_DOMAIN}'
