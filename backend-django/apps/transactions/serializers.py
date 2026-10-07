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
        # The statement this transaction was OCR'd from (emailed or uploaded)
        # — lets the user-side "View" show the original file, not only a
        # manually attached receipt_url.
        source_document_url=t.source_document.file_url if t.source_document_id else None,
        source_document_name=t.source_document.file_name if t.source_document_id else None,
    )
    if signed:
        amount = float(t.amount)
        row['signedAmount'] = -abs(amount) if t.type == 'expense' else abs(amount)
    return row
