const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Token storage (in-memory for access token, localStorage for refresh token)
let accessToken: string | null = null;

// Event for auth state changes
type AuthStateListener = (isAuthenticated: boolean) => void;
const authStateListeners: AuthStateListener[] = [];

export const onAuthStateChange = (listener: AuthStateListener) => {
    authStateListeners.push(listener);
    return () => {
        const index = authStateListeners.indexOf(listener);
        if (index > -1) authStateListeners.splice(index, 1);
    };
};

const notifyAuthStateChange = (isAuthenticated: boolean) => {
    authStateListeners.forEach(listener => listener(isAuthenticated));
};

// Types
export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    uniqueId: string;
    inboundEmail?: string;
    phone?: string;
    avatar?: string;
    isEmailVerified: boolean;
    accountStatus: string;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    success: boolean;
    data?: {
        user: User;
        accessToken: string;
        refreshToken: string;
    };
    error?: string;
    message?: string;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Token management
export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};

export const getRefreshToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
};

export const setRefreshToken = (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
        localStorage.setItem('refreshToken', token);
    } else {
        localStorage.removeItem('refreshToken');
    }
};

export const clearTokens = () => {
    accessToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('refreshToken');
    }
    notifyAuthStateChange(false);
};

// API fetch wrapper with enhanced error handling. Exported so other API
// modules (e.g. lib/adminApi.ts) can reuse the same token/refresh/error
// handling instead of re-implementing it.
export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true,
    timeoutMs = 30000
): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
    };

    // Add Bearer token if available
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle different HTTP status codes
        if (response.status === 403) {
            return {
                success: false,
                error: 'You do not have permission to access this resource',
            };
        }

        if (response.status === 404) {
            return {
                success: false,
                error: 'Resource not found',
            };
        }

        if (response.status >= 500) {
            return {
                success: false,
                error: 'Server error. Please try again later.',
            };
        }

        // Try to parse JSON response
        let data;
        try {
            data = await response.json();
        } catch {
            // Handle non-JSON responses
            return {
                success: false,
                error: 'Invalid response from server',
            };
        }

        // Handle 401 - Token expired
        if (response.status === 401 && data.code === 'TOKEN_EXPIRED' && retry) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                // Retry the original request
                return apiFetch(endpoint, options, false, timeoutMs);
            } else {
                // Refresh failed, clear tokens and redirect to login
                clearTokens();
                if (typeof window !== 'undefined') {
                    window.location.href = '/auth/login';
                }
            }
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        // Handle abort/timeout
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                error: 'Request timed out. Please check your connection and try again.',
            };
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Unable to connect to server. Please check your internet connection.',
            };
        }

        console.error('API Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        };
    }
}

// Refresh access token
async function refreshAccessToken(): Promise<boolean> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (data.success && data.data?.accessToken) {
            accessToken = data.data.accessToken;
            notifyAuthStateChange(true);
            return true;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
    }

    return false;
}

// Auth API
export const authApi = {
    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await apiFetch<AuthResponse['data']>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (response.success && response.data) {
            accessToken = response.data.accessToken;
            setRefreshToken(response.data.refreshToken);
            notifyAuthStateChange(true);
        }

        return response as AuthResponse;
    },

    async signup(name: string, email: string, password: string, phone: string): Promise<AuthResponse> {
        const response = await apiFetch<AuthResponse['data']>('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, phone }),
        });

        if (response.success && response.data) {
            accessToken = response.data.accessToken;
            setRefreshToken(response.data.refreshToken);
            notifyAuthStateChange(true);
        }

        return response as AuthResponse;
    },

    async logout(): Promise<ApiResponse> {
        const refreshToken = getRefreshToken();
        const response = await apiFetch('/api/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });

        clearTokens();
        return response;
    },

    async getMe(): Promise<ApiResponse<{ user: User }>> {
        return apiFetch('/api/auth/me');
    },

    async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
        return apiFetch('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
        const refreshToken = getRefreshToken();
        return apiFetch('/api/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword, currentRefreshToken: refreshToken }),
        });
    },

    async initializeFromRefreshToken(): Promise<boolean> {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return false;

        const success = await refreshAccessToken();
        return success;
    },

    async deleteAccount(password: string): Promise<ApiResponse> {
        return apiFetch('/api/auth/account', {
            method: 'DELETE',
            body: JSON.stringify({ password }),
        });
    },

    async forgotPassword(email: string): Promise<ApiResponse> {
        return apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
        return apiFetch('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    },
};

// Properties API
export const propertiesApi = {
    async getAll(params?: { status?: string; type?: string; search?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/properties${query}`);
    },

    async getOne(id: string) {
        return apiFetch(`/api/properties/${id}`);
    },

    async create(data: Record<string, unknown>) {
        return apiFetch('/api/properties', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Record<string, unknown>) {
        return apiFetch(`/api/properties/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/properties/${id}`, {
            method: 'DELETE',
        });
    },

    async getStats() {
        return apiFetch('/api/properties/stats');
    },
};

// Transactions API
export const transactionsApi = {
    async getAll(params?: { type?: string; status?: string; propertyId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/transactions${query}`);
    },

    async getOne(id: string) {
        return apiFetch(`/api/transactions/${id}`);
    },

    async create(data: Record<string, unknown>) {
        return apiFetch('/api/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Record<string, unknown>) {
        return apiFetch(`/api/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/transactions/${id}`, {
            method: 'DELETE',
        });
    },

    async getStats(params?: { propertyId?: string; startDate?: string; endDate?: string }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/transactions/stats${query}`);
    },
};

// Tenants API
export const tenantsApi = {
    async getAll(params?: { status?: string; propertyId?: string; search?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/tenants${query}`);
    },

    async getOne(id: string) {
        return apiFetch(`/api/tenants/${id}`);
    },

    async create(data: Record<string, unknown>) {
        return apiFetch('/api/tenants', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Record<string, unknown>) {
        return apiFetch(`/api/tenants/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/tenants/${id}`, {
            method: 'DELETE',
        });
    },
};

// Expenses API
export const expensesApi = {
    async getAll(params?: { status?: string; propertyId?: string; categoryId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/expenses${query}`);
    },

    async getOne(id: string) {
        return apiFetch(`/api/expenses/${id}`);
    },

    async create(data: Record<string, unknown>) {
        return apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Record<string, unknown>) {
        return apiFetch(`/api/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/expenses/${id}`, {
            method: 'DELETE',
        });
    },

    async getStats(params?: { propertyId?: string; startDate?: string; endDate?: string }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/expenses/stats${query}`);
    },
};

// Categories API
export const categoriesApi = {
    async getAll(params?: { type?: string; includeSystem?: boolean }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch(`/api/categories${query}`);
    },

    async getOne(id: string) {
        return apiFetch(`/api/categories/${id}`);
    },

    async create(data: Record<string, unknown>) {
        return apiFetch('/api/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id: string, data: Record<string, unknown>) {
        return apiFetch(`/api/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/categories/${id}`, {
            method: 'DELETE',
        });
    },
};

// Notifications API
export interface Notification {
    id: string;
    user_id: string;
    type: 'property' | 'transaction' | 'security' | 'system' | 'subscription';
    title: string;
    message: string;
    is_read: boolean;
    action_url?: string;
    metadata?: Record<string, unknown>;
    created_at: string;
}

export const notificationsApi = {
    async getAll(params?: { limit?: number; unreadOnly?: boolean }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch<{ notifications: Notification[]; unreadCount: number }>(`/api/notifications${query}`);
    },

    async markAsRead(id: string) {
        return apiFetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
        });
    },

    async markAllAsRead() {
        return apiFetch('/api/notifications/read-all', {
            method: 'PUT',
        });
    },

    async delete(id: string) {
        return apiFetch(`/api/notifications/${id}`, {
            method: 'DELETE',
        });
    },
};

// Documents API — raw multipart upload, bypasses apiFetch since that forces
// a JSON Content-Type header (which breaks multipart/form-data uploads).
export const documentsApi = {
    async upload(file: File, category?: 'documents' | 'loan-documents'): Promise<ApiResponse<{ url: string; fileName: string; fileSize: number; fileType: string }>> {
        const formData = new FormData();
        formData.append('file', file);
        if (category) formData.append('category', category);

        try {
            const response = await fetch(`${API_BASE_URL}/api/ocr/upload-file`, {
                method: 'POST',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                body: formData,
            });
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload document',
            };
        }
    },

    // The documents bucket is private — stored URLs aren't directly
    // browsable. Exchange one for a short-lived presigned URL before opening it.
    async getViewUrl(storedUrl: string): Promise<ApiResponse<{ url: string }>> {
        return apiFetch<{ url: string }>(`/api/ocr/document-url?url=${encodeURIComponent(storedUrl)}`);
    },
};

// Depreciation schedules API — upload() bypasses apiFetch for the same
// multipart reason as documentsApi.upload.
export const depreciationApi = {
    async upload(file: File, propertyId: string): Promise<ApiResponse<{ schedule: Record<string, unknown> }>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('propertyId', propertyId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/depreciation/upload`, {
                method: 'POST',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
                body: formData,
            });
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload depreciation schedule',
            };
        }
    },

    async getAll(propertyId: string): Promise<ApiResponse<{ schedules: Record<string, unknown>[] }>> {
        return apiFetch(`/api/depreciation/schedules?propertyId=${encodeURIComponent(propertyId)}`);
    },

    async getOne(id: string): Promise<ApiResponse<{ schedule: Record<string, unknown> }>> {
        return apiFetch(`/api/depreciation/schedule/${id}`);
    },

    async delete(id: string): Promise<ApiResponse<unknown>> {
        return apiFetch(`/api/depreciation/schedule/${id}`, { method: 'DELETE' });
    },
};

// Support tickets API
export interface TicketMessage {
    id: string;
    ticket_id: string;
    author_id?: string;
    author_name?: string;
    body: string;
    created_at: string;
}

export interface SupportTicket {
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
    updated_at: string;
    messages?: TicketMessage[];
}

export const ticketsApi = {
    async getAll(params?: { status?: string; page?: number; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        return apiFetch<{ tickets: SupportTicket[]; pagination: Record<string, unknown> }>(`/api/tickets${query}`);
    },

    async getOne(id: string) {
        return apiFetch<{ ticket: SupportTicket }>(`/api/tickets/${id}`);
    },

    async create(data: { subject: string; message: string; category?: string; priority?: string }) {
        return apiFetch<{ ticket: SupportTicket }>('/api/tickets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async reply(id: string, message: string) {
        return apiFetch<{ message: TicketMessage }>(`/api/tickets/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    },
};

const api = {
    auth: authApi,
    properties: propertiesApi,
    transactions: transactionsApi,
    tenants: tenantsApi,
    expenses: expensesApi,
    categories: categoriesApi,
    notifications: notificationsApi,
    documents: documentsApi,
    depreciation: depreciationApi,
    tickets: ticketsApi,
};

export default api;
