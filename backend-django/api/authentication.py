"""
JWT authentication matching the Node backend exactly:
- Access tokens: HS256 JWT with payload {userId, iat, exp}, signed with JWT_SECRET.
- Refresh tokens: 128-char hex strings stored in the sessions table.
- Error responses mirror backend/src/middleware/authMiddleware.js.
"""
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from django.conf import settings
from rest_framework import authentication

from .exceptions import ApiError
from .models import User

password_hasher = PasswordHasher()


def hash_password(password):
    return password_hasher.hash(password)


def verify_password(password_hash, password):
    """Returns True/False like the Node argon2.verify usage (never raises)."""
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def generate_access_token(user_id):
    now = datetime.now(timezone.utc)
    payload = {
        'userId': str(user_id),
        'iat': int(now.timestamp()),
        'exp': int((now + timedelta(minutes=settings.JWT_EXPIRES_IN_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm='HS256')


def generate_refresh_token():
    # Node: crypto.randomBytes(64).toString('hex') -> 128 hex chars
    return secrets.token_hex(64)


def authenticate_token(token):
    """Verify a JWT and return the active User, raising ApiError like the Node middleware."""
    try:
        decoded = jwt.decode(token, settings.JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise ApiError('Token expired', 401, code='TOKEN_EXPIRED')
    except jwt.InvalidTokenError:
        raise ApiError('Invalid token', 401)

    user = User.objects.filter(id=decoded.get('userId')).first()
    if not user:
        raise ApiError('User not found', 401)

    if user.account_status != 'active':
        raise ApiError(f'Account is {user.account_status}', 403)

    if user.password_changed_at:
        changed_ts = int(user.password_changed_at.timestamp())
        if decoded.get('iat', 0) < changed_ts:
            raise ApiError('Password recently changed. Please log in again.', 401)

    return user


class JWTAuthentication(authentication.BaseAuthentication):
    """DRF authentication class equivalent to the Express `protect` middleware."""

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer'):
            raise ApiError('Not authorized - No token provided', 401)

        parts = auth_header.split(' ')
        if len(parts) < 2 or not parts[1]:
            raise ApiError('Not authorized - No token provided', 401)

        user = authenticate_token(parts[1])
        return (user, None)
