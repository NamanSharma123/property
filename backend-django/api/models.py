"""
Models mapped 1:1 onto the existing PostgreSQL schema
(backend/src/db/all-in-one.sql), same table and column names, so the Django
backend can run against the same database as the Node backend.
"""
import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models


class User(models.Model):
    ROLE_CHOICES = [('admin', 'admin'), ('manager', 'manager'), ('staff', 'staff')]
    STATUS_CHOICES = [('active', 'active'), ('suspended', 'suspended'), ('locked', 'locked')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
    last_login = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email'], name='idx_users_email'),
            models.Index(fields=['unique_id'], name='idx_users_unique_id'),
        ]

    # Required so DRF permission checks treat this as a logged-in user
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    refresh_token = models.CharField(max_length=255, unique=True)
    device_info = models.JSONField(default=dict)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField()
    last_activity = models.DateTimeField(auto_now_add=True)
    location = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sessions'
        indexes = [
            models.Index(fields=['user'], name='idx_sessions_user_id'),
            models.Index(fields=['refresh_token'], name='idx_sessions_refresh_token'),
            models.Index(fields=['expires_at'], name='idx_sessions_expires_at'),
            models.Index(fields=['is_active'], name='idx_sessions_is_active'),
        ]


class Property(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    name = models.CharField(max_length=200)
    address = models.JSONField(default=dict)
    full_address = models.TextField(null=True, blank=True)
    type = models.CharField(max_length=50, default='residential')
    sub_type = models.CharField(max_length=50, null=True, blank=True)
    units = models.IntegerField(default=1)
    occupancy = models.IntegerField(default=0)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    year_built = models.IntegerField(null=True, blank=True)
    square_feet = models.IntegerField(null=True, blank=True)
    lot_size = models.IntegerField(null=True, blank=True)
    bedrooms = models.IntegerField(null=True, blank=True)
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    amenities = ArrayField(models.TextField(), null=True, blank=True, default=list)
    description = models.TextField(null=True, blank=True)
    images = models.JSONField(default=list)
    status = models.CharField(max_length=20, default='active')
    tax_id = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    loan_details = models.JSONField(default=dict)
    ownership_details = models.JSONField(default=dict)
    ownership = models.CharField(max_length=100, null=True, blank=True)
    has_depreciation = models.BooleanField(default=False)
    usage = models.CharField(max_length=50, null=True, blank=True)
    abn = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'properties'
        indexes = [
            models.Index(fields=['owner'], name='idx_properties_owner_id'),
            models.Index(fields=['status'], name='idx_properties_status'),
        ]


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id', null=True, blank=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20)
    description = models.CharField(max_length=500, null=True, blank=True)
    icon = models.CharField(max_length=50, null=True, blank=True)
    color = models.CharField(max_length=20, default='#6B7280')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, db_column='parent_id', null=True, blank=True)
    is_system = models.BooleanField(default=False)
    tax_code = models.CharField(max_length=50, null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'categories'
        indexes = [
            models.Index(fields=['type'], name='idx_categories_type'),
            models.Index(fields=['owner'], name='idx_categories_owner_id'),
            models.Index(fields=['is_system'], name='idx_categories_is_system'),
        ]


class Tenant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    name = models.CharField(max_length=100)
    email = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    unit = models.CharField(max_length=50, default='1')
    lease_start = models.DateField()
    lease_end = models.DateField()
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rent_due_day = models.IntegerField(default=1)
    status = models.CharField(max_length=20, default='pending')
    emergency_contact = models.JSONField(default=dict)
    documents = models.JSONField(default=list)
    move_in_date = models.DateField(null=True, blank=True)
    move_out_date = models.DateField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        indexes = [
            models.Index(fields=['owner'], name='idx_tenants_owner_id'),
            models.Index(fields=['property'], name='idx_tenants_property_id'),
            models.Index(fields=['status'], name='idx_tenants_status'),
            models.Index(fields=['email'], name='idx_tenants_email'),
        ]


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    tenant = models.ForeignKey(Tenant, on_delete=models.SET_NULL, db_column='tenant_id', null=True, blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, db_column='category_id', null=True, blank=True)
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    type = models.CharField(max_length=20)
    category_name = models.CharField(max_length=100, null=True, blank=True)
    transaction_source = models.CharField(max_length=50, default='Manual Entry')
    status = models.CharField(max_length=20, default='pending')
    payment_method = models.CharField(max_length=30, null=True, blank=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    receipt_url = models.TextField(null=True, blank=True)
    attachments = models.JSONField(default=list)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, null=True, blank=True)
    recurring_end_date = models.DateField(null=True, blank=True)
    parent_transaction = models.ForeignKey(
        'self', on_delete=models.SET_NULL, db_column='parent_transaction_id', null=True, blank=True
    )
    source_document = models.ForeignKey(
        'Document', on_delete=models.SET_NULL, db_column='source_document_id',
        null=True, blank=True, related_name='transactions'
    )
    notes = models.TextField(null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=False)
    tax_category = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column='created_by',
        null=True, blank=True, related_name='created_transactions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transactions'
        indexes = [
            models.Index(fields=['owner'], name='idx_transactions_owner_id'),
            models.Index(fields=['property'], name='idx_transactions_property_id'),
            models.Index(fields=['tenant'], name='idx_transactions_tenant_id'),
            models.Index(fields=['-date'], name='idx_transactions_date'),
            models.Index(fields=['type', 'status'], name='idx_transactions_type_status'),
        ]


class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, db_column='category_id', null=True, blank=True)
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    category_name = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')
    vendor = models.JSONField(default=dict)
    receipt_url = models.TextField(null=True, blank=True)
    attachments = models.JSONField(default=list)
    payment_method = models.CharField(max_length=30, null=True, blank=True)
    reference_number = models.CharField(max_length=100, null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(max_length=20, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    is_tax_deductible = models.BooleanField(default=True)
    tax_category = models.CharField(max_length=100, null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column='created_by',
        null=True, blank=True, related_name='created_expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'expenses'
        indexes = [
            models.Index(fields=['owner'], name='idx_expenses_owner_id'),
            models.Index(fields=['property'], name='idx_expenses_property_id'),
            models.Index(fields=['-date'], name='idx_expenses_date'),
            models.Index(fields=['status'], name='idx_expenses_status'),
        ]


class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    action = models.CharField(max_length=50)
    description = models.CharField(max_length=500, null=True, blank=True)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    resource_id = models.UUIDField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        indexes = [
            models.Index(fields=['user'], name='idx_activity_logs_user_id'),
            models.Index(fields=['action'], name='idx_activity_logs_action'),
            models.Index(fields=['-created_at'], name='idx_activity_logs_created_at'),
        ]


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='user_id')
    type = models.CharField(max_length=50)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user'], name='idx_notifications_user_id'),
            models.Index(fields=['is_read'], name='idx_notifications_is_read'),
            models.Index(fields=['-created_at'], name='idx_notif_created_at'),
        ]


# ── OCR document tables (used by backend/src/controllers/ocrController.js) ──

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    property = models.ForeignKey(
        Property, on_delete=models.SET_NULL, db_column='property_id', null=True, blank=True
    )
    file_name = models.CharField(max_length=255)
    file_url = models.TextField()
    file_type = models.CharField(max_length=100)
    file_size = models.BigIntegerField()
    status = models.CharField(max_length=20, default='pending')
    document_type = models.CharField(max_length=50, null=True, blank=True)
    ocr_raw_text = models.TextField(null=True, blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        indexes = [
            models.Index(fields=['owner'], name='idx_documents_owner_id'),
            models.Index(fields=['status'], name='idx_documents_status'),
        ]


class DocumentDuplicate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, db_column='owner_id')
    file_hash = models.CharField(max_length=64)
    document_signature = models.JSONField(default=dict)
    original_document = models.ForeignKey(
        Document, on_delete=models.CASCADE, db_column='original_document_id'
    )
    detection_type = models.CharField(max_length=30, default='exact-hash')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_duplicates'
        indexes = [
            models.Index(fields=['owner', 'file_hash'], name='idx_doc_dup_owner_hash'),
        ]


class ExtractedData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id')
    field_name = models.CharField(max_length=100)
    field_value = models.TextField(null=True, blank=True)
    original_value = models.TextField(null=True, blank=True)
    corrected_value = models.TextField(null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    data_type = models.CharField(max_length=30, default='string')
    is_validated = models.BooleanField(default=False)
    validation_status = models.CharField(max_length=30, null=True, blank=True)
    corrected_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, db_column='corrected_by',
        null=True, blank=True, related_name='corrected_extractions'
    )
    corrected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'extracted_data'
        indexes = [
            models.Index(fields=['document'], name='idx_extracted_doc_id'),
        ]


class DocumentLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, db_column='document_id')
    line_number = models.IntegerField(null=True, blank=True)
    property_name = models.CharField(max_length=200, null=True, blank=True)
    description = models.TextField()
    category = models.CharField(max_length=100, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    item_type = models.CharField(max_length=20, default='expense')
    included_tax = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    is_converted = models.BooleanField(default=False)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.SET_NULL, db_column='transaction_id', null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_line_items'
        indexes = [
            models.Index(fields=['document'], name='idx_line_items_doc_id'),
        ]
