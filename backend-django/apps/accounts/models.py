"""
User, Session and ActivityLog — mapped 1:1 onto the existing PostgreSQL
schema (backend/src/db/all-in-one.sql), same table and column names, so this
backend can run against the same database as the Node backend.
"""
from django.contrib.auth.base_user import AbstractBaseUser
from django.db import models
from django.utils.crypto import salted_hmac

from apps.common.models import CreatedModel, TimeStampedModel
from apps.common.security import hash_password, verify_password

from .managers import UserManager


class User(AbstractBaseUser, TimeStampedModel):
    ROLE_CHOICES = [('admin', 'admin'), ('manager', 'manager'), ('staff', 'staff')]
    STATUS_CHOICES = [('active', 'active'), ('suspended', 'suspended'), ('locked', 'locked')]

    # The Node backend stores raw argon2id hashes in password_hash; remove
    # Django's own password field (which would use a different format/column).
    password = None

    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    unique_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    avatar = models.TextField(null=True, blank=True)
    is_email_verified = models.BooleanField(default=False)
    account_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    login_attempts = models.IntegerField(default=0)
    lock_until = models.DateTimeField(null=True, blank=True)
    # last_login comes from AbstractBaseUser and matches the existing column
    password_changed_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email'], name='idx_users_email'),
            models.Index(fields=['unique_id'], name='idx_users_unique_id'),
        ]

    def __str__(self):
        return self.email

    # ── Password handling on the Node-compatible password_hash column ──

    def set_password(self, raw_password):
        self.password_hash = hash_password(raw_password)

    def check_password(self, raw_password):
        return verify_password(self.password_hash, raw_password)

    def set_unusable_password(self):
        self.password_hash = ''

    def has_usable_password(self):
        return bool(self.password_hash)

    def get_session_auth_hash(self):
        key_salt = 'django.contrib.auth.models.AbstractBaseUser.get_session_auth_hash'
        return salted_hmac(key_salt, self.password_hash, algorithm='sha256').hexdigest()

    # ── Flags derived from the existing schema (role / account_status) ──

    @property
    def is_active(self):
        return self.account_status == 'active'

    @property
    def is_staff(self):
        return self.role == 'admin'

    @property
    def is_superuser(self):
        return self.role == 'admin'

    def has_perm(self, perm, obj=None):
        return self.role == 'admin'

    def has_perms(self, perm_list, obj=None):
        return self.role == 'admin'

    def has_module_perms(self, app_label):
        return self.role == 'admin'


class Session(TimeStampedModel):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    refresh_token = models.CharField(max_length=255, unique=True)
    device_info = models.JSONField(default=dict)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now_add=True)
    location = models.JSONField(default=dict)

    class Meta:
        db_table = 'sessions'
        indexes = [
            models.Index(fields=['user'], name='idx_sessions_user_id'),
            models.Index(fields=['refresh_token'], name='idx_sessions_refresh_token'),
            models.Index(fields=['expires_at'], name='idx_sessions_expires_at'),
            models.Index(fields=['is_active'], name='idx_sessions_is_active'),
        ]


class ActivityLog(CreatedModel):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    action = models.CharField(max_length=50)
    description = models.CharField(max_length=500, null=True, blank=True)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)

    class Meta:
        db_table = 'activity_logs'
        indexes = [
            models.Index(fields=['user'], name='idx_activity_logs_user_id'),
            models.Index(fields=['action'], name='idx_activity_logs_action'),
            models.Index(fields=['-created_at'], name='idx_activity_logs_created_at'),
        ]
