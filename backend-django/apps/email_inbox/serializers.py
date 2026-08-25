from apps.common.utils import model_row


def email_message_row(msg, **extra):
    row = model_row(
        msg,
        user_name=msg.user.name if msg.user_id else None,
        user_email=msg.user.email if msg.user_id else None,
        property_name=msg.property.name if msg.property_id else None,
    )
    row.update(extra)
    return row
