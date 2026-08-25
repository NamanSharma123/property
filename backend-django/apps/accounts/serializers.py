"""
Response serialization for auth endpoints (matches formatUser and the
sessions payload in backend/src/controllers/authController.js).
"""
from apps.common.utils import json_value


def format_user(user):
    return {
        'id': json_value(user.id),
        'name': user.name,
        'email': user.email,
        'role': user.role,
        'uniqueId': user.unique_id,
        'inboundEmail': user.inbound_email,
        'phone': user.phone,
        'avatar': user.avatar,
        'isEmailVerified': user.is_email_verified,
        'accountStatus': user.account_status,
        'lastLogin': json_value(user.last_login),
        'createdAt': json_value(user.created_at),
        'updatedAt': json_value(user.updated_at),
    }


def format_session(session):
    return {
        'id': json_value(session.id),
        'deviceInfo': session.device_info,
        'ipAddress': session.ip_address,
        'lastActivity': json_value(session.last_activity),
        'createdAt': json_value(session.created_at),
    }
