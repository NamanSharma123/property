from apps.common.utils import model_row


def email_attachment_row(att):
    return model_row(att)


def email_message_row(msg, include_attachments=True, **extra):
    row = model_row(
        msg,
        user_name=msg.user.name if msg.user_id else None,
        user_email=msg.user.email if msg.user_id else None,
        property_name=msg.property.name if msg.property_id else None,
        # So the admin UI can decide whether "Delete from server" (Req 6)
        # should be offered without a second request — document.status
        # 'failed' means an admin rejected it, which (along with the
        # email's own status='failed') is what makes a source email
        # eligible for deletion. See AdminEmailDeleteFromServerView.
        document_status=msg.document.status if msg.document_id else None,
    )
    if include_attachments:
        row['attachments'] = [email_attachment_row(a) for a in msg.attachments.all()]
    row.update(extra)
    return row
