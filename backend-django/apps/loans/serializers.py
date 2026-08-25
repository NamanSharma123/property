from apps.common.utils import model_row


def loan_row(loan, **extra):
    row = model_row(
        loan,
        property_name=loan.property.name if loan.property_id else None,
        property_address=loan.property.full_address if loan.property_id else None,
    )
    row.update(extra)
    return row
