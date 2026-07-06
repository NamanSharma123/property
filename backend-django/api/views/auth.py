"""
Auth endpoints — port of backend/src/controllers/authController.js and the
signup/login/password validators from backend/src/middleware/validators.js.
"""
import re
import time
import random
from datetime import timedelta

from django.conf import settings
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.response import Response

from ..authentication import (
    generate_access_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
from ..exceptions import error_response
from ..models import Session, User
from ..utils import format_user, get_ip, get_user_agent, log_activity, notify_welcome
from .base import ProtectedView, PublicView

BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz'


def _to_base36(number):
    if number == 0:
        return '0'
    digits = []
    while number:
        number, rem = divmod(number, 36)
        digits.append(BASE36[rem])
    return ''.join(reversed(digits))


def generate_unique_id(role):
    prefix = role.upper()[:3]
    timestamp = _to_base36(int(time.time() * 1000)).upper()
    rand = ''.join(random.choices(BASE36, k=4)).upper()
    return f'{prefix}-{timestamp}-{rand}'


def _validation_error(errors):
    return Response(
        {'success': False, 'error': 'Validation failed', 'errors': errors},
        status=400,
    )


def _validate_password_strength(value, errors, field='password'):
    policy = settings.PASSWORD_POLICY
    if len(value) < policy['min_length']:
        errors.append({'field': field, 'message': f"Password must be at least {policy['min_length']} characters"})
        return
    if policy['require_uppercase'] and not re.search(r'[A-Z]', value):
        errors.append({'field': field, 'message': 'Password must contain at least one uppercase letter'})
    if policy['require_lowercase'] and not re.search(r'[a-z]', value):
        errors.append({'field': field, 'message': 'Password must contain at least one lowercase letter'})
    if policy['require_numbers'] and not re.search(r'\d', value):
        errors.append({'field': field, 'message': 'Password must contain at least one number'})
    if policy['require_special_chars'] and not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        errors.append({'field': field, 'message': 'Password must contain at least one special character'})


def _create_session(user, refresh_token, request):
    expires_at = timezone.now() + timedelta(days=settings.SESSION_REFRESH_DAYS)
    Session.objects.create(
        user=user,
        refresh_token=refresh_token,
        device_info={'userAgent': get_user_agent(request)},
        ip_address=get_ip(request),
        expires_at=expires_at,
    )


class SignupView(PublicView):
    def post(self, request):
        data = request.data
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        role = data.get('role') or 'staff'

        errors = []
        if not name:
            errors.append({'field': 'name', 'message': 'Name is required'})
        elif not (2 <= len(name) <= 100):
            errors.append({'field': 'name', 'message': 'Name must be between 2 and 100 characters'})

        if not email:
            errors.append({'field': 'email', 'message': 'Email is required'})
        else:
            try:
                validate_email(email)
            except ValidationError:
                errors.append({'field': 'email', 'message': 'Please enter a valid email'})

        if not password:
            errors.append({'field': 'password', 'message': 'Password is required'})
        else:
            _validate_password_strength(password, errors)

        if errors:
            return _validation_error(errors)

        if User.objects.filter(email=email).exists():
            return error_response('Email already registered', 400)

        user = User.objects.create(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            unique_id=generate_unique_id(role),
            account_status='active',
        )

        access_token = generate_access_token(user.id)
        refresh_token = generate_refresh_token()
        _create_session(user, refresh_token, request)

        log_activity(user.id, 'signup', request=request, success=True)
        notify_welcome(user.id, name)

        return Response({
            'success': True,
            'data': {
                'user': format_user(user),
                'accessToken': access_token,
                'refreshToken': refresh_token,
            },
            'message': 'Account created successfully',
        }, status=201)


class LoginView(PublicView):
    def post(self, request):
        data = request.data
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''

        errors = []
        if not email:
            errors.append({'field': 'email', 'message': 'Email is required'})
        else:
            try:
                validate_email(email)
            except ValidationError:
                errors.append({'field': 'email', 'message': 'Please enter a valid email'})
        if not password:
            errors.append({'field': 'password', 'message': 'Password is required'})
        if errors:
            return _validation_error(errors)

        user = User.objects.filter(email=email).first()
        if not user:
            return error_response('Invalid email or password', 401)

        if user.lock_until and user.lock_until > timezone.now():
            log_activity(user.id, 'login_failed', request=request, description='Account is locked',
                         success=False, error_message='Account locked')
            return error_response('Account is temporarily locked. Please try again later.', 423)

        if user.account_status != 'active':
            return error_response(f'Account is {user.account_status}. Please contact support.', 403)

        if not verify_password(user.password_hash, password):
            new_attempts = (user.login_attempts or 0) + 1
            lock_until = timezone.now() + timedelta(minutes=15) if new_attempts >= 5 else None
            User.objects.filter(id=user.id).update(login_attempts=new_attempts, lock_until=lock_until)
            log_activity(user.id, 'login_failed', request=request, description='Invalid password',
                         success=False, error_message='Invalid password')
            return error_response('Invalid email or password', 401)

        User.objects.filter(id=user.id).update(
            login_attempts=0, lock_until=None, last_login=timezone.now()
        )
        user.refresh_from_db()

        access_token = generate_access_token(user.id)
        refresh_token = generate_refresh_token()
        _create_session(user, refresh_token, request)

        log_activity(user.id, 'login', request=request, success=True)

        return Response({
            'success': True,
            'data': {
                'user': format_user(user),
                'accessToken': access_token,
                'refreshToken': refresh_token,
            },
            'message': 'Logged in successfully',
        })


class LogoutView(ProtectedView):
    def post(self, request):
        refresh_token = request.data.get('refreshToken')
        if refresh_token:
            Session.objects.filter(refresh_token=refresh_token).update(is_active=False)
        log_activity(request.user.id, 'logout', request=request, success=True)
        return Response({'success': True, 'message': 'Logged out successfully'})


class RefreshTokenView(PublicView):
    def post(self, request):
        refresh_token = request.data.get('refreshToken')
        if not refresh_token:
            return error_response('No refresh token provided', 401)

        session = Session.objects.filter(
            refresh_token=refresh_token, is_active=True, expires_at__gt=timezone.now()
        ).first()
        if not session:
            return error_response('Invalid or expired refresh token', 401)

        user = User.objects.filter(id=session.user_id).first()
        if not user or user.account_status != 'active':
            Session.objects.filter(id=session.id).update(is_active=False)
            return error_response('User not found or inactive', 401)

        access_token = generate_access_token(user.id)
        Session.objects.filter(id=session.id).update(last_activity=timezone.now())

        return Response({
            'success': True,
            'data': {
                'accessToken': access_token,
                'user': format_user(user),
            },
        })


class MeView(ProtectedView):
    def get(self, request):
        return Response({
            'success': True,
            'data': {'user': format_user(request.user)},
        })


class ProfileView(ProtectedView):
    def put(self, request):
        user = request.user
        for field in ('name', 'phone', 'avatar'):
            value = request.data.get(field)
            if value is not None:
                setattr(user, field, value)
        user.save()

        log_activity(user.id, 'profile_update', request=request, success=True)

        return Response({
            'success': True,
            'data': {'user': format_user(user)},
            'message': 'Profile updated successfully',
        })


class ChangePasswordView(ProtectedView):
    def put(self, request):
        current_password = request.data.get('currentPassword') or ''
        new_password = request.data.get('newPassword') or ''

        errors = []
        if not current_password:
            errors.append({'field': 'currentPassword', 'message': 'Current password is required'})
        if not new_password:
            errors.append({'field': 'newPassword', 'message': 'New password is required'})
        else:
            if len(new_password) < settings.PASSWORD_POLICY['min_length']:
                errors.append({
                    'field': 'newPassword',
                    'message': f"Password must be at least {settings.PASSWORD_POLICY['min_length']} characters",
                })
            if new_password == current_password:
                errors.append({
                    'field': 'newPassword',
                    'message': 'New password must be different from current password',
                })
        if errors:
            return _validation_error(errors)

        user = request.user
        if not verify_password(user.password_hash, current_password):
            return error_response('Current password is incorrect', 400)

        User.objects.filter(id=user.id).update(
            password_hash=hash_password(new_password),
            password_changed_at=timezone.now(),
        )

        current_refresh_token = request.data.get('currentRefreshToken')
        if current_refresh_token:
            Session.objects.filter(user_id=user.id).exclude(
                refresh_token=current_refresh_token
            ).update(is_active=False)

        log_activity(user.id, 'password_change', request=request, success=True)

        return Response({'success': True, 'message': 'Password changed successfully'})


class SessionsView(ProtectedView):
    def get(self, request):
        sessions = Session.objects.filter(
            user_id=request.user.id, is_active=True, expires_at__gt=timezone.now()
        ).order_by('-last_activity')

        return Response({
            'success': True,
            'data': {
                'sessions': [
                    {
                        'id': str(s.id),
                        'deviceInfo': s.device_info,
                        'ipAddress': s.ip_address,
                        'lastActivity': s.last_activity.isoformat().replace('+00:00', 'Z') if s.last_activity else None,
                        'createdAt': s.created_at.isoformat().replace('+00:00', 'Z') if s.created_at else None,
                    }
                    for s in sessions
                ],
            },
        })

    def delete(self, request):
        # Revoke all sessions except current
        current_refresh_token = request.data.get('currentRefreshToken') or ''
        Session.objects.filter(user_id=request.user.id).exclude(
            refresh_token=current_refresh_token
        ).update(is_active=False)
        return Response({'success': True, 'message': 'All other sessions revoked successfully'})


class RevokeSessionView(ProtectedView):
    def delete(self, request, session_id):
        updated = Session.objects.filter(id=session_id, user_id=request.user.id).update(is_active=False)
        if not updated:
            return error_response('Session not found', 404)
        return Response({'success': True, 'message': 'Session revoked successfully'})


class VerifyPasswordView(ProtectedView):
    def post(self, request):
        password = request.data.get('password')
        if not password:
            return error_response('Password is required', 400)

        user = request.user
        if not verify_password(user.password_hash, password):
            log_activity(user.id, 'password_verification_failed', request=request,
                         description='Failed password verification for sensitive operation', success=False)
            return error_response('Invalid password', 401)

        log_activity(user.id, 'password_verified', request=request,
                     description='Password verified for sensitive operation', success=True)
        return Response({'success': True, 'message': 'Password verified successfully'})


class DeleteAccountView(ProtectedView):
    def delete(self, request):
        password = request.data.get('password')
        if not password:
            return error_response('Password is required to delete account', 400)

        user = request.user
        if not verify_password(user.password_hash, password):
            return error_response('Incorrect password', 401)

        log_activity(user.id, 'account_deleted', request=request,
                     description='User permanently deleted their account',
                     resource_type='user', resource_id=user.id, success=True)

        User.objects.filter(id=user.id).delete()

        return Response({'success': True, 'message': 'Account deleted successfully'})
