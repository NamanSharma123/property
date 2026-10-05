/**
 * Admin panel API client — same request/response conventions as lib/api.ts
 * (reuses its adminFetch(), which already handles the Bearer token + 401
 * refresh-and-retry), just pointed at the /api/admin/* namespace.
 */
import { adminFetch, ApiResponse } from './api';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    uniqueId: string;
    inboundEmail: string | null;
    phone: string | null;
    avatar: string | null;
    isEmailVerified: boolean;
    accountStatus: 'active' | 'suspended' | 'locked';
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
    propertiesCount?: number;
    transactionsCount?: number;
    documentsCount?: number;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface DashboardData {
    cards: {
        totalUsers: number;
        activeUsers: number;
        suspendedUsers: number;
        totalProperties: number;
        totalTransactions: number;
        ocrProcessedToday: number;
        ocrPendingReview: number;
        monthlyIncome: number;
        monthlyExpense: number;
        totalLoans: number;
        subscriptionRevenue: number;
        pendingSupportTickets: number;
    };
    charts: {
        userRegistrationTrend: { month: string; count: number }[];
        transactionTrend: { month: string; count: number }[];
        propertyGrowth: { month: string; count: number }[];
        ocrSuccessRate: { month: string; total: number; completed: number; rate: number }[];
    };
    recentActivity: {
        type: string;
        title: string;
        subtitle?: string | null;
        timestamp: string;
        entityId: string;
    }[];
}

export interface AuditLogEntry {
    id: string;
    created_at: string;
    admin_id: string | null;
    admin_name: string | null;
    admin_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
}

export interface ActivityLogEntry {
    id: string;
    created_at: string;
    user_id: string;
    action: string;
    description: string | null;
    resource_type: string | null;
    resource_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    error_message: string | null;
    metadata: Record<string, unknown>;
}

export interface AdminProperty {
    id: string;
    owner_id: string;
    owner_name: string | null;
    owner_email: string | null;
    name: string;
    full_address: string | null;
    type: string;
    status: string;
    purchase_price: string | null;
    purchase_date: string | null;
    current_value: string | null;
    monthlyIncome: number;
    monthlyExpense: number;
    netCashFlow: number;
    loanBalance: number;
    created_at: string;
    // Detail-only fields
    loans?: AdminLoan[];
    transactionsCount?: number;
    documentsCount?: number;
    depreciationSchedulesCount?: number;
    activity?: ActivityLogEntry[];
}

export interface AdminTransaction {
    id: string;
    owner_id: string;
    owner_name: string | null;
    owner_email: string | null;
    property_id: string;
    property_name: string | null;
    category_display_name: string | null;
    category_name: string | null;
    description: string;
    amount: string;
    date: string;
    type: 'income' | 'expense';
    signedAmount: number;
    transaction_source: string;
    status: string;
}

export interface AdminDocument {
    id: string;
    owner_id: string;
    owner_name: string | null;
    owner_email: string | null;
    property_id: string | null;
    property_name: string | null;
    file_name: string;
    file_url: string;
    file_type: string;
    status: string;
    document_type: string | null;
    ocr_confidence: number | null;
    created_at: string;
}

export interface AdminLoan {
    id: string;
    owner_id: string;
    owner_name?: string | null;
    owner_email?: string | null;
    property_id: string;
    property_name: string | null;
    property_address: string | null;
    lender: string;
    loan_number: string | null;
    principal: string;
    current_balance: string | null;
    interest_rate: string | null;
    monthly_repayment: string | null;
    offset_balance: string | null;
    redraw_available: string | null;
    start_date: string | null;
    end_date: string | null;
    status: 'active' | 'closed' | 'refinanced';
    basiq_status: 'not_connected' | 'connected';
    notes: string | null;
}

export interface ExtractedDataField {
    id: string;
    field_name: string;
    field_value: string | null;
    corrected_value: string | null;
    confidence: number | null;
    is_validated: boolean;
    validation_status: string | null;
}

export interface OcrJob {
    id: string;
    document_id: string;
    attempt_number: number;
    provider: string | null;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    confidence: number | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    triggered_by: string | null;
    created_at: string;
}

export interface OcrReview {
    id: string;
    document_id: string;
    ocr_job_id: string | null;
    reviewer_id: string | null;
    reviewer_name: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'reprocess_requested';
    notes: string | null;
    reviewed_at: string | null;
    created_at: string;
}

export interface DocumentLineItem {
    id: string;
    document_id: string;
    ocr_job_id: string | null;
    line_number: number | null;
    property_name: string | null;
    description: string;
    category: string | null;
    amount: string;
    item_type: 'income' | 'expense';
    included_tax: string | null;
    confidence: number | null;
    is_converted: boolean;
    transaction_id: string | null;
}

export interface OcrDocumentDetail extends AdminDocument {
    ocr_raw_text: string | null;
    error_message: string | null;
    extractedData: ExtractedDataField[];
    // The real, per-item extracted data (amount/category/type included) —
    // what the review UI should actually show and convert, as opposed to
    // extractedData's description-only rows.
    lineItems: DocumentLineItem[];
    // Every OCR attempt against this document, newest first — the re-OCR
    // history the Unique Email ID spec asks for (see apps.ocr.models.OCRJob).
    ocrJobs: OcrJob[];
    reviews: OcrReview[];
}

export interface OcrTemplate {
    id: string;
    name: string;
    document_type: string;
    confidence_threshold: number;
    version: string;
    status: 'enabled' | 'disabled';
    description: string | null;
    updated_at: string;
}

export interface EmailAttachment {
    id: string;
    email_message_id: string;
    file_name: string | null;
    file_url: string;
    content_type: string | null;
    file_size: number | null;
    document_id: string | null;
}

export interface EmailMessage {
    id: string;
    sender: string;
    receiver: string;
    // Which recipient header actually matched a Mailbox — see
    // apps.email_inbox.views._resolve_recipient.
    resolved_via: 'delivered-to' | 'x-original-to' | 'to' | 'legacy' | null;
    subject: string | null;
    message_id: string | null;
    cc: string[];
    bcc: string[];
    // Legacy single-attachment fields — a message may have several real
    // attachments instead, see `attachments` below.
    attachment_url: string | null;
    attachment_name: string | null;
    attachments: EmailAttachment[];
    received_at: string;
    user_id: string | null;
    user_name: string | null;
    user_email: string | null;
    property_id: string | null;
    property_name: string | null;
    document_id: string | null;
    // Null when there's no document yet; otherwise the linked Document's
    // own status — 'failed' here means an admin rejected it (see
    // AdminOcrRejectView). Used alongside `status` to decide whether
    // "Delete from server" (Req 6) can be offered.
    document_status: string | null;
    ocr_confidence: number | null;
    status: 'received' | 'processing' | 'processed' | 'needs_review' | 'failed';
    processing_log: string | null;
    source_s3_bucket: string | null;
    source_s3_key: string | null;
    source_deleted_at: string | null;
}

export interface TicketMessage {
    id: string;
    ticket_id: string;
    author_id: string | null;
    author_name: string | null;
    body: string;
    is_internal_note: boolean;
    created_at: string;
}

export interface Ticket {
    id: string;
    user_id: string;
    user_name: string | null;
    user_email: string | null;
    subject: string;
    category: 'billing' | 'ocr' | 'bug' | 'feature_request' | 'other';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assigned_admin_id: string | null;
    assigned_admin_name: string | null;
    created_at: string;
    updated_at: string;
    messages?: TicketMessage[];
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    monthly_price: string;
    users_allowed: number;
    ocr_limit: number | null;
    is_active: boolean;
    description: string | null;
}

export interface SubscriptionPayment {
    id: string;
    amount: string;
    status: 'paid' | 'failed' | 'refunded';
    method: 'manual' | 'stripe';
    paid_at: string | null;
    notes: string | null;
    created_at: string;
}

export interface AdminSubscription {
    id: string;
    user_id: string;
    user_name: string | null;
    user_email: string | null;
    plan_id: string;
    plan_name: string | null;
    plan_monthly_price: string | null;
    status: 'active' | 'cancelled' | 'expired';
    payment_status: 'paid' | 'pending' | 'failed';
    renewal_date: string | null;
    expiry_date: string | null;
    payments?: SubscriptionPayment[];
}

export interface AdminCategory {
    id: string;
    owner_id: string | null;
    owner_name: string | null;
    name: string;
    type: string;
    description: string | null;
    icon: string | null;
    color: string;
    parent_id: string | null;
    is_system: boolean;
    tax_code: string | null;
    is_tax_deductible: boolean;
    is_active: boolean;
}

export type ReportType =
    | 'profit_loss' | 'cash_flow' | 'expense_by_category' | 'income_by_property'
    | 'loan_summary' | 'ocr_reports' | 'user_reports' | 'subscription_reports';

export interface IntegrationStatus {
    key: string;
    label: string;
    configured: boolean;
    detail: string;
}

export interface PlatformSettings {
    company_name: string;
    support_email: string;
    theme_accent_color: string;
    logo_url: string;
    default_trial_days: string;
}

function toQuery(params?: Record<string, string | number | undefined>) {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.append(key, String(value));
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
}

export const adminApi = {
    async getDashboard(): Promise<ApiResponse<DashboardData>> {
        return adminFetch('/api/admin/dashboard');
    },

    users: {
        async getAll(params?: { search?: string; status?: string; role?: string; page?: number; limit?: number }) {
            return adminFetch<{ users: AdminUser[]; pagination: Pagination }>(`/api/admin/users${toQuery(params)}`);
        },
        async getOne(id: string) {
            return adminFetch<{ user: AdminUser }>(`/api/admin/users/${id}`);
        },
        async update(id: string, data: Partial<Pick<AdminUser, 'name' | 'phone' | 'avatar' | 'role'>>) {
            return adminFetch<{ user: AdminUser }>(`/api/admin/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async suspend(id: string) {
            return adminFetch<{ user: AdminUser }>(`/api/admin/users/${id}/suspend`, { method: 'POST' });
        },
        async activate(id: string) {
            return adminFetch<{ user: AdminUser }>(`/api/admin/users/${id}/activate`, { method: 'POST' });
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                body: JSON.stringify({ confirm: true }),
            });
        },
        async resetPassword(id: string) {
            return adminFetch(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
        },
        async getProperties(id: string, params?: { page?: number; limit?: number }) {
            return adminFetch<{ properties: Record<string, unknown>[]; pagination: Pagination }>(
                `/api/admin/users/${id}/properties${toQuery(params)}`
            );
        },
        async getTransactions(id: string, params?: { propertyId?: string; type?: string; categoryId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
            return adminFetch<{ transactions: Record<string, unknown>[]; pagination: Pagination }>(
                `/api/admin/users/${id}/transactions${toQuery(params)}`
            );
        },
        async getDocuments(id: string, params?: { page?: number; limit?: number }) {
            return adminFetch<{ documents: Record<string, unknown>[]; pagination: Pagination }>(
                `/api/admin/users/${id}/documents${toQuery(params)}`
            );
        },
        async getActivity(id: string, params?: { page?: number; limit?: number }) {
            return adminFetch<{ activity: ActivityLogEntry[]; pagination: Pagination }>(
                `/api/admin/users/${id}/activity${toQuery(params)}`
            );
        },
        async getLoans(id: string, params?: { page?: number; limit?: number }) {
            return adminFetch<{ loans: AdminLoan[]; pagination: Pagination }>(
                `/api/admin/users/${id}/loans${toQuery(params)}`
            );
        },
    },

    properties: {
        async getAll(params?: { search?: string; status?: string; type?: string; userId?: string; page?: number; limit?: number }) {
            return adminFetch<{ properties: AdminProperty[]; pagination: Pagination }>(`/api/admin/properties${toQuery(params)}`);
        },
        async getOne(id: string) {
            return adminFetch<{ property: AdminProperty }>(`/api/admin/properties/${id}`);
        },
        async update(id: string, data: Record<string, unknown>) {
            return adminFetch<{ property: AdminProperty }>(`/api/admin/properties/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
        },
        async transferOwnership(id: string, newOwnerId: string) {
            return adminFetch<{ property: AdminProperty }>(`/api/admin/properties/${id}/transfer-ownership`, {
                method: 'POST',
                body: JSON.stringify({ newOwnerId }),
            });
        },
        async merge(id: string, duplicatePropertyId: string) {
            return adminFetch<{ property: AdminProperty }>(`/api/admin/properties/${id}/merge`, {
                method: 'POST',
                body: JSON.stringify({ duplicatePropertyId }),
            });
        },
    },

    transactions: {
        async getAll(params?: { userId?: string; propertyId?: string; categoryId?: string; type?: string; status?: string; source?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ transactions: AdminTransaction[]; pagination: Pagination }>(`/api/admin/transactions${toQuery(params)}`);
        },
        async update(id: string, data: Record<string, unknown>) {
            return adminFetch<{ transaction: AdminTransaction }>(`/api/admin/transactions/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/transactions/${id}`, { method: 'DELETE' });
        },
        async bulkCategory(ids: string[], data: { categoryId?: string; categoryName?: string }) {
            return adminFetch(`/api/admin/transactions/bulk-category`, {
                method: 'POST',
                body: JSON.stringify({ ids, ...data }),
            });
        },
        async bulkReassignProperty(ids: string[], propertyId: string) {
            return adminFetch(`/api/admin/transactions/bulk-property`, {
                method: 'POST',
                body: JSON.stringify({ ids, propertyId }),
            });
        },
    },

    documents: {
        async getAll(params?: { userId?: string; propertyId?: string; status?: string; documentType?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ documents: AdminDocument[]; pagination: Pagination }>(`/api/admin/documents${toQuery(params)}`);
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/documents/${id}`, { method: 'DELETE' });
        },
        async getViewUrl(id: string) {
            return adminFetch<{ url: string }>(`/api/admin/documents/${id}/view-url`);
        },
        async reprocess(id: string) {
            return adminFetch<{ document: Record<string, unknown> }>(`/api/admin/documents/${id}/reprocess`, { method: 'POST' });
        },
    },

    loans: {
        async getAll(params?: { userId?: string; propertyId?: string; status?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ loans: AdminLoan[]; pagination: Pagination }>(`/api/admin/loans${toQuery(params)}`);
        },
        async create(data: Record<string, unknown>) {
            return adminFetch<{ loan: AdminLoan }>(`/api/admin/loans`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        async update(id: string, data: Record<string, unknown>) {
            return adminFetch<{ loan: AdminLoan }>(`/api/admin/loans/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/loans/${id}`, { method: 'DELETE' });
        },
    },

    ocr: {
        async getDocument(id: string) {
            return adminFetch<{ document: OcrDocumentDetail }>(`/api/admin/ocr/documents/${id}`);
        },
        async approve(id: string, data?: { createTransaction?: boolean; propertyId?: string; categoryName?: string; amount?: number | string; date?: string; description?: string; type?: 'income' | 'expense' }) {
            return adminFetch(`/api/admin/ocr/documents/${id}/approve`, { method: 'POST', body: JSON.stringify(data || {}) });
        },
        // Creates one transaction per not-yet-converted extracted line item
        // (each with its own real amount/category/type) instead of the
        // single manually-typed transaction `approve` above creates.
        async approveLineItems(id: string, propertyId?: string) {
            return adminFetch<{ document: Record<string, unknown>; transactions: Record<string, unknown>[]; created: number; skipped: number }>(
                `/api/admin/ocr/documents/${id}/approve-line-items`, { method: 'POST', body: JSON.stringify(propertyId ? { propertyId } : {}) }
            );
        },
        async reject(id: string, reason?: string) {
            return adminFetch(`/api/admin/ocr/documents/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
        },
        async reprocess(id: string, reason?: string) {
            return adminFetch<{ document: Record<string, unknown>; ocrJob: OcrJob }>(
                `/api/admin/ocr/documents/${id}/reprocess`, { method: 'POST', body: JSON.stringify({ reason }) }
            );
        },
        async bulkApprove(ids: string[]) {
            return adminFetch(`/api/admin/ocr/bulk-approve`, { method: 'POST', body: JSON.stringify({ ids }) });
        },
        async bulkReject(ids: string[]) {
            return adminFetch(`/api/admin/ocr/bulk-reject`, { method: 'POST', body: JSON.stringify({ ids }) });
        },
        async correctField(extractedId: string, value: string) {
            return adminFetch(`/api/admin/ocr/extracted-data/${extractedId}`, { method: 'PUT', body: JSON.stringify({ value }) });
        },
        templates: {
            async getAll() {
                return adminFetch<{ templates: OcrTemplate[] }>(`/api/admin/ocr/templates`);
            },
            async update(id: string, data: { status?: 'enabled' | 'disabled'; confidenceThreshold?: number; version?: string; description?: string }) {
                return adminFetch<{ template: OcrTemplate }>(`/api/admin/ocr/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            },
        },
    },

    emailInbox: {
        async getAll(params?: { status?: string; userId?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ emailMessages: EmailMessage[]; pagination: Pagination }>(`/api/admin/email-inbox${toQuery(params)}`);
        },
        async map(id: string, data: { userId?: string; propertyId?: string }) {
            return adminFetch<{ emailMessage: EmailMessage }>(`/api/admin/email-inbox/${id}/map`, { method: 'POST', body: JSON.stringify(data) });
        },
        async convert(id: string) {
            return adminFetch<{ emailMessage: EmailMessage; documentId: string }>(`/api/admin/email-inbox/${id}/convert`, { method: 'POST' });
        },
        async runJob(ids?: string[]) {
            return adminFetch<{ processed: number; needs_review: number; failed: number; skipped: number; total: number }>(
                '/api/admin/email-inbox/run-job',
                { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }
            );
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/email-inbox/${id}`, { method: 'DELETE' });
        },
        // Req 6 — removes the original email from the S3 bucket it arrived
        // in; only allowed once the email/document is rejected or failed
        // (enforced server-side, not just by hiding the button).
        async deleteFromServer(id: string) {
            return adminFetch<{ emailMessage: EmailMessage }>(`/api/admin/email-inbox/${id}/delete-from-server`, { method: 'POST' });
        },
    },

    support: {
        async getAll(params?: { status?: string; priority?: string; category?: string; assignedAdminId?: string; userId?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ tickets: Ticket[]; pagination: Pagination }>(`/api/admin/support/tickets${toQuery(params)}`);
        },
        async getOne(id: string) {
            return adminFetch<{ ticket: Ticket }>(`/api/admin/support/tickets/${id}`);
        },
        async reply(id: string, message: string) {
            return adminFetch<{ message: TicketMessage }>(`/api/admin/support/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) });
        },
        async addInternalNote(id: string, note: string) {
            return adminFetch<{ message: TicketMessage }>(`/api/admin/support/tickets/${id}/internal-note`, { method: 'POST', body: JSON.stringify({ note }) });
        },
        async assign(id: string, adminId: string | null) {
            return adminFetch<{ ticket: Ticket }>(`/api/admin/support/tickets/${id}/assign`, { method: 'POST', body: JSON.stringify({ adminId }) });
        },
        async setStatus(id: string, status: Ticket['status']) {
            return adminFetch<{ ticket: Ticket }>(`/api/admin/support/tickets/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
        },
    },

    subscriptions: {
        plans: {
            async getAll() {
                return adminFetch<{ plans: SubscriptionPlan[] }>(`/api/admin/subscriptions/plans`);
            },
            async update(id: string, data: Partial<{ monthlyPrice: number; usersAllowed: number; ocrLimit: number | null; isActive: boolean; description: string }>) {
                return adminFetch<{ plan: SubscriptionPlan }>(`/api/admin/subscriptions/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
            },
        },
        async getAll(params?: { planId?: string; status?: string; paymentStatus?: string; search?: string; page?: number; limit?: number }) {
            return adminFetch<{ subscriptions: AdminSubscription[]; pagination: Pagination }>(`/api/admin/subscriptions${toQuery(params)}`);
        },
        async getOne(id: string) {
            return adminFetch<{ subscription: AdminSubscription }>(`/api/admin/subscriptions/${id}`);
        },
        async changePlan(id: string, planId: string) {
            return adminFetch<{ subscription: AdminSubscription }>(`/api/admin/subscriptions/${id}/change-plan`, { method: 'POST', body: JSON.stringify({ planId }) });
        },
        async cancel(id: string) {
            return adminFetch<{ subscription: AdminSubscription }>(`/api/admin/subscriptions/${id}/cancel`, { method: 'POST' });
        },
        async recordPayment(id: string, data: { amount: number | string; method?: string; notes?: string }) {
            return adminFetch<{ payment: SubscriptionPayment }>(`/api/admin/subscriptions/${id}/record-payment`, { method: 'POST', body: JSON.stringify(data) });
        },
    },

    categories: {
        async getAll(params?: { type?: string; isSystem?: string; ownerId?: string; search?: string }) {
            return adminFetch<{ categories: AdminCategory[] }>(`/api/admin/categories${toQuery(params)}`);
        },
        async create(data: { name: string; type: string; description?: string; icon?: string; color?: string; taxCode?: string; isTaxDeductible?: boolean }) {
            return adminFetch<{ category: AdminCategory }>(`/api/admin/categories`, { method: 'POST', body: JSON.stringify(data) });
        },
        async update(id: string, data: Record<string, unknown>) {
            return adminFetch<{ category: AdminCategory }>(`/api/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        },
        async remove(id: string) {
            return adminFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
        },
        async merge(id: string, intoCategoryId: string) {
            return adminFetch(`/api/admin/categories/${id}/merge`, { method: 'POST', body: JSON.stringify({ intoCategoryId }) });
        },
    },

    reports: {
        async get<T = Record<string, unknown>>(type: ReportType, params?: { userId?: string; propertyId?: string; startDate?: string; endDate?: string }) {
            return adminFetch<{ type: ReportType; report: T }>(`/api/admin/reports${toQuery({ type, ...params })}`);
        },
    },

    settings: {
        async get() {
            return adminFetch<{ settings: PlatformSettings; integrations: IntegrationStatus[] }>(`/api/admin/settings`);
        },
        async update(data: Partial<PlatformSettings>) {
            return adminFetch<{ settings: PlatformSettings }>(`/api/admin/settings`, { method: 'PUT', body: JSON.stringify(data) });
        },
    },

    auditLogs: {
        async getAll(params?: { adminId?: string; action?: string; entityType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
            return adminFetch<{ auditLogs: AuditLogEntry[]; pagination: Pagination }>(`/api/admin/audit-logs${toQuery(params)}`);
        },
    },
};

export default adminApi;
