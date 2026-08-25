from apps.common.utils import model_row


def ticket_row(ticket, **extra):
    row = model_row(
        ticket,
        user_name=ticket.user.name if ticket.user_id else None,
        user_email=ticket.user.email if ticket.user_id else None,
        assigned_admin_name=ticket.assigned_admin.name if ticket.assigned_admin_id else None,
    )
    row.update(extra)
    return row


def ticket_message_row(message):
    return model_row(message, author_name=message.author.name if message.author_id else None)
