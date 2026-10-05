from django.urls import path

from . import (
    views, views_categories, views_documents, views_email, views_loans, views_ocr,
    views_properties, views_reports, views_settings, views_subscriptions,
    views_support, views_transactions,
)

urlpatterns = [
    path('admin/dashboard', views.AdminDashboardView.as_view()),

    path('admin/users', views.AdminUserListView.as_view()),
    path('admin/users/<uuid:user_id>', views.AdminUserDetailView.as_view()),
    path('admin/users/<uuid:user_id>/suspend', views.AdminUserSuspendView.as_view()),
    path('admin/users/<uuid:user_id>/activate', views.AdminUserActivateView.as_view()),
    path('admin/users/<uuid:user_id>/reset-password', views.AdminUserResetPasswordView.as_view()),
    path('admin/users/<uuid:user_id>/properties', views.AdminUserPropertiesView.as_view()),
    path('admin/users/<uuid:user_id>/transactions', views.AdminUserTransactionsView.as_view()),
    path('admin/users/<uuid:user_id>/documents', views.AdminUserDocumentsView.as_view()),
    path('admin/users/<uuid:user_id>/loans', views.AdminUserLoansView.as_view()),
    path('admin/users/<uuid:user_id>/activity', views.AdminUserActivityView.as_view()),

    path('admin/properties', views_properties.AdminPropertyListView.as_view()),
    path('admin/properties/<uuid:property_id>', views_properties.AdminPropertyDetailView.as_view()),
    path('admin/properties/<uuid:property_id>/transfer-ownership', views_properties.AdminPropertyTransferOwnershipView.as_view()),
    path('admin/properties/<uuid:property_id>/merge', views_properties.AdminPropertyMergeView.as_view()),

    path('admin/transactions', views_transactions.AdminTransactionListView.as_view()),
    path('admin/transactions/<uuid:transaction_id>', views_transactions.AdminTransactionDetailView.as_view()),
    path('admin/transactions/bulk-category', views_transactions.AdminTransactionBulkCategoryView.as_view()),
    path('admin/transactions/bulk-property', views_transactions.AdminTransactionBulkPropertyView.as_view()),

    path('admin/documents', views_documents.AdminDocumentListView.as_view()),
    path('admin/documents/<uuid:document_id>', views_documents.AdminDocumentDetailView.as_view()),
    path('admin/documents/<uuid:document_id>/view-url', views_documents.AdminDocumentViewUrlView.as_view()),
    path('admin/documents/<uuid:document_id>/reprocess', views_documents.AdminDocumentReprocessView.as_view()),

    path('admin/loans', views_loans.AdminLoanListView.as_view()),
    path('admin/loans/<uuid:loan_id>', views_loans.AdminLoanDetailView.as_view()),

    # OCR Review Panel — Pending/Processed/Failed listing reuses
    # views_documents.AdminDocumentListView (?status=pending|completed|failed).
    path('admin/ocr/documents/<uuid:document_id>', views_ocr.AdminOcrDocumentDetailView.as_view()),
    path('admin/ocr/documents/<uuid:document_id>/approve', views_ocr.AdminOcrApproveView.as_view()),
    path('admin/ocr/documents/<uuid:document_id>/approve-line-items', views_ocr.AdminOcrApproveLineItemsView.as_view()),
    path('admin/ocr/documents/<uuid:document_id>/reject', views_ocr.AdminOcrRejectView.as_view()),
    path('admin/ocr/documents/<uuid:document_id>/reprocess', views_ocr.AdminOcrReprocessView.as_view()),
    path('admin/ocr/bulk-approve', views_ocr.AdminOcrBulkApproveView.as_view()),
    path('admin/ocr/bulk-reject', views_ocr.AdminOcrBulkRejectView.as_view()),
    path('admin/ocr/extracted-data/<uuid:extracted_id>', views_ocr.AdminExtractedDataUpdateView.as_view()),
    path('admin/ocr/templates', views_ocr.AdminOcrTemplateListView.as_view()),
    path('admin/ocr/templates/<uuid:template_id>', views_ocr.AdminOcrTemplateDetailView.as_view()),

    path('admin/email-inbox', views_email.AdminEmailInboxListView.as_view()),
    path('admin/email-inbox/run-job', views_email.AdminEmailRunJobView.as_view()),
    path('admin/email-inbox/<uuid:message_id>', views_email.AdminEmailDetailView.as_view()),
    path('admin/email-inbox/<uuid:message_id>/map', views_email.AdminEmailMapView.as_view()),
    path('admin/email-inbox/<uuid:message_id>/convert', views_email.AdminEmailConvertView.as_view()),
    path('admin/email-inbox/<uuid:message_id>/delete-from-server', views_email.AdminEmailDeleteFromServerView.as_view()),

    path('admin/support/tickets', views_support.AdminTicketListView.as_view()),
    path('admin/support/tickets/<uuid:ticket_id>', views_support.AdminTicketDetailView.as_view()),
    path('admin/support/tickets/<uuid:ticket_id>/reply', views_support.AdminTicketReplyView.as_view()),
    path('admin/support/tickets/<uuid:ticket_id>/internal-note', views_support.AdminTicketInternalNoteView.as_view()),
    path('admin/support/tickets/<uuid:ticket_id>/assign', views_support.AdminTicketAssignView.as_view()),
    path('admin/support/tickets/<uuid:ticket_id>/status', views_support.AdminTicketStatusView.as_view()),

    path('admin/subscriptions/plans', views_subscriptions.AdminSubscriptionPlanListView.as_view()),
    path('admin/subscriptions/plans/<uuid:plan_id>', views_subscriptions.AdminSubscriptionPlanDetailView.as_view()),
    path('admin/subscriptions', views_subscriptions.AdminSubscriptionListView.as_view()),
    path('admin/subscriptions/<uuid:subscription_id>', views_subscriptions.AdminSubscriptionDetailView.as_view()),
    path('admin/subscriptions/<uuid:subscription_id>/change-plan', views_subscriptions.AdminSubscriptionChangePlanView.as_view()),
    path('admin/subscriptions/<uuid:subscription_id>/cancel', views_subscriptions.AdminSubscriptionCancelView.as_view()),
    path('admin/subscriptions/<uuid:subscription_id>/record-payment', views_subscriptions.AdminSubscriptionRecordPaymentView.as_view()),

    path('admin/categories', views_categories.AdminCategoryListView.as_view()),
    path('admin/categories/<uuid:category_id>', views_categories.AdminCategoryDetailView.as_view()),
    path('admin/categories/<uuid:category_id>/merge', views_categories.AdminCategoryMergeView.as_view()),

    path('admin/reports', views_reports.AdminReportsView.as_view()),

    path('admin/settings', views_settings.AdminSettingsView.as_view()),

    path('admin/audit-logs', views.AdminAuditLogListView.as_view()),
]
