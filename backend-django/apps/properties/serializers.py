"""
Input normalization for property payloads (port of mapPropertyType and the
full-address generation in backend/src/controllers/propertyController.js).
"""
import re

VALID_TYPES = ['residential', 'commercial', 'industrial', 'mixed-use', 'land']

TYPE_MAP = {
    'Residential - Investment': 'residential',
    'Residential - Owner Occupied': 'residential',
    'Commercial - Investment': 'commercial',
    'Commercial - Owner Occupied': 'commercial',
    'Industrial': 'industrial',
    'Mixed-Use': 'mixed-use',
    'Land': 'land',
    'residential - investment': 'residential',
    'residential - owner occupied': 'residential',
    'commercial - investment': 'commercial',
    'commercial - owner occupied': 'commercial',
    'industrial': 'industrial',
    'mixed-use': 'mixed-use',
    'land': 'land',
    'residential-investment': 'residential',
    'residential-owner': 'residential',
    'commercial-investment': 'commercial',
    'commercial-owner': 'commercial',
    'residential': 'residential',
    'commercial': 'commercial',
}


def map_property_type(frontend_type):
    if not frontend_type:
        return 'residential'
    normalized = str(frontend_type).strip()
    if normalized in TYPE_MAP:
        return TYPE_MAP[normalized]
    base_type = re.split(r'[\s-]', normalized)[0].lower()
    if base_type in VALID_TYPES:
        return base_type
    return 'residential'


def build_full_address(address):
    if not isinstance(address, dict):
        return ''
    # Strip stray trailing commas/whitespace from each part so dirty input
    # (e.g. a street already saved as "41 Swanson St,") never produces "St,,".
    street = str(address.get('street') or '').strip().rstrip(',').strip()
    city = str(address.get('city') or '').strip().rstrip(',').strip()
    tail = f"{address.get('state', '')} {address.get('zipCode', '')}".strip()
    return ', '.join(part for part in (street, city, tail) if part)
