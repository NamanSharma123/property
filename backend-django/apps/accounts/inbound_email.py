"""
Generates each user's permanent inbound-email address for the OCR ingestion
pipeline (spec pattern: "<digits>@<domain>"), based on the user's phone
number — the digits are whatever they typed at signup, stripped of
formatting (spaces, +, dashes, parentheses). Falls back to digits derived
from the user's UUID only when no phone is available (e.g. legacy rows from
before phone was collected at signup, or the rare case where a phone number
is already in use by another account and would collide).
"""
import re

from django.conf import settings


def generate_inbound_email(phone=None, user_id=None):
    digits = re.sub(r'\D', '', phone or '')
    if not digits:
        if user_id is None:
            raise ValueError('generate_inbound_email requires a phone number or a user_id fallback')
        digits = str(int(user_id.hex if hasattr(user_id, 'hex') else str(user_id).replace('-', ''), 16))
    return f'{digits}@{settings.INBOUND_EMAIL_DOMAIN}'
