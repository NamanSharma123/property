"""
Expense row serialization with the joined names the Express controller
returned.
"""
from apps.common.utils import model_row


def expense_row(e):
    return model_row(
        e,
        property_name=e.property.name if e.property_id else None,
        category_display_name=e.category.name if e.category_id else None,
    )
