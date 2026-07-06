from django.urls import path

from .views import auth, categories, expenses, notifications, ocr, pdf, properties, tenants, transactions

urlpatterns = [
    # Auth (backend/src/routes/authRoutes.js)
    path('auth/signup', auth.SignupView.as_view()),
    path('auth/login', auth.LoginView.as_view()),
    path('auth/logout', auth.LogoutView.as_view()),
    path('auth/refresh', auth.RefreshTokenView.as_view()),
    path('auth/me', auth.MeView.as_view()),
    path('auth/profile', auth.ProfileView.as_view()),
    path('auth/password', auth.ChangePasswordView.as_view()),
    path('auth/sessions', auth.SessionsView.as_view()),
    path('auth/sessions/<uuid:session_id>', auth.RevokeSessionView.as_view()),
    path('auth/verify-password', auth.VerifyPasswordView.as_view()),
    path('auth/account', auth.DeleteAccountView.as_view()),

    # Properties
    path('properties', properties.PropertyListView.as_view()),
    path('properties/stats', properties.PropertyStatsView.as_view()),
    path('properties/<uuid:property_id>', properties.PropertyDetailView.as_view()),

    # Transactions
    path('transactions', transactions.TransactionListView.as_view()),
    path('transactions/stats', transactions.TransactionStatsView.as_view()),
    path('transactions/monthly', transactions.MonthlyBreakdownView.as_view()),
    path('transactions/<uuid:transaction_id>', transactions.TransactionDetailView.as_view()),

    # Tenants
    path('tenants', tenants.TenantListView.as_view()),
    path('tenants/stats', tenants.TenantStatsView.as_view()),
    path('tenants/<uuid:tenant_id>', tenants.TenantDetailView.as_view()),

    # Expenses
    path('expenses', expenses.ExpenseListView.as_view()),
    path('expenses/stats', expenses.ExpenseStatsView.as_view()),
    path('expenses/<uuid:expense_id>', expenses.ExpenseDetailView.as_view()),

    # Categories
    path('categories', categories.CategoryListView.as_view()),
    path('categories/<uuid:category_id>', categories.CategoryDetailView.as_view()),

    # Notifications
    path('notifications', notifications.NotificationListView.as_view()),
    path('notifications/read-all', notifications.MarkAllAsReadView.as_view()),
    path('notifications/<uuid:notification_id>/read', notifications.MarkAsReadView.as_view()),
    path('notifications/<uuid:notification_id>', notifications.NotificationDetailView.as_view()),

    # OCR
    path('ocr/extract', pdf.ExtractTextView.as_view()),
    path('ocr/extract-pdf', pdf.ExtractPDFTextView.as_view()),
    path('ocr/upload', ocr.UploadDocumentView.as_view()),
    path('ocr/process', ocr.ProcessDocumentView.as_view()),
    path('ocr/documents', ocr.DocumentListView.as_view()),
    path('ocr/document/<uuid:document_id>', ocr.DocumentDetailView.as_view()),
    path('ocr/convert-to-transactions', ocr.ConvertToTransactionsView.as_view()),
    path('ocr/correct/<uuid:extracted_id>', ocr.CorrectExtractedDataView.as_view()),
]
