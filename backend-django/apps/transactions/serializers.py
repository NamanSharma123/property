"""
Transaction row serialization with the joined names and signedAmount virtual
field the Express controller returned.
"""
from apps.common.utils import model_row


def transaction_row(t, signed=False):
    row = model_row(
        t,
        property_name=t.property.name if t.property_id else None,
        property_type=t.property.type if t.property_id else None,
        property_sub_type=t.property.sub_type if t.property_id else None,
        tenant_name=t.tenant.name if t.tenant_id else None,
        category_display_name=t.category.name if t.category_id else None,
    )
    if signed:
        amount = float(t.amount)
        row['signedAmount'] = -abs(amount) if t.type == 'expense' else abs(amount)
    return row
