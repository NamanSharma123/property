"""
Creating a DepreciationSchedule from a parsed PDF — shared by the property
page's upload (views.DepreciationUploadView) and the email pipeline, where a
statement whose subject says "Depreciation" runs this parser instead of the
rental-statement transaction parser (apps.email_inbox.processing) and lands
in the property's Depreciation section rather than as transactions.
"""
from .models import DepreciationSchedule, DepreciationScheduleYear
from . import schedule_parser


def has_rows(parsed):
    return bool(parsed and (parsed['diminishing_value'] or parsed['prime_cost']))


def _property_signature(prop, include_name=False):
    street = (prop.address or {}).get('street', '') if isinstance(prop.address, dict) else ''
    return (
        schedule_parser.address_signature(street)
        or schedule_parser.address_signature(prop.full_address or '')
        or (schedule_parser.address_signature(prop.name or '') if include_name else None)
    )


def address_mismatch(parsed, prop, include_name=False):
    """The report's own stated address vs the property it's being filed
    under. Returns an error message on a confident mismatch (both sides
    parsed to an address and they disagree), else None — an unrecognised
    address on either side doesn't block it. include_name also reads an
    address out of the property's name (often just its address) when it
    has no structured address — used by the email flow."""
    if not (parsed and parsed['address']):
        return None
    prop_signature = _property_signature(prop, include_name=include_name)
    if prop_signature and parsed['address'][:2] != prop_signature[:2]:
        return (
            f"This report is for \"{parsed['address'][2]}\", not the selected property "
            f"\"{prop.name}\". Select the matching property and try again."
        )
    return None


def match_property(properties, parsed):
    """The one property among `properties` whose address matches the
    report's stated address, or None."""
    if not (parsed and parsed['address']):
        return None
    matches = [
        p for p in properties
        if (_property_signature(p, include_name=True) or (None, None))[:2] == parsed['address'][:2]
    ]
    return matches[0] if len(matches) == 1 else None


def create_schedule(owner_id, prop, file_name, file_url, file_size, parsed, parse_error=None):
    """Stores the schedule + its per-year rows and flags the property as
    having depreciation. Returns (schedule, years)."""
    rows_found = has_rows(parsed)
    schedule = DepreciationSchedule.objects.create(
        owner_id=owner_id,
        property=prop,
        file_name=file_name,
        file_url=file_url,
        file_size=file_size or 0,
        provider=parsed['provider'] if parsed else None,
        status='parsed' if rows_found else 'failed',
        error_message=None if rows_found else (
            parse_error or 'Could not find a recognised depreciation schedule table in this PDF.'
        ),
    )

    years = []
    if parsed:
        for method, rows in (
            ('diminishing_value', parsed['diminishing_value']),
            ('prime_cost', parsed['prime_cost']),
        ):
            for order, row in enumerate(rows):
                years.append(DepreciationScheduleYear(
                    schedule=schedule,
                    method=method,
                    financial_date=row['financial_date'],
                    division_40_amount=row['division_40_amount'],
                    division_43_amount=row['division_43_amount'],
                    total_amount=row['total_amount'],
                    sort_order=order,
                ))
    if years:
        DepreciationScheduleYear.objects.bulk_create(years)

    if rows_found:
        prop.has_depreciation = True
        prop.save()

    return schedule, years
