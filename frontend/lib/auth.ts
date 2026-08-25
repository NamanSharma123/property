'use client';

import { authApi, User, clearTokens, getAccessToken } from './api';

export type { User };

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await authApi.login(email, password);

    if (response.success && response.data?.user) {
        return { success: true, user: response.data.user };
    }

    return { success: false, error: response.error || 'Login failed' };
}

/**
 * Signup with name, email and password
 */
export async function signup(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const response = await authApi.signup(name, email, password);

    if (response.success) {
        return { success: true };
    }

    return { success: false, error: response.error || 'Signup failed' };
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
    await authApi.logout();
    clearTokens();

    // Redirect to login
    if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
    }
}

/**
 * Get current session/user
 */
export async function getSession(): Promise<{ id: string; email: string; name: string; uniqueId: string; role: string; accountStatus: string } | null> {
    // Check if we have an access token
    if (!getAccessToken()) {
        // Try to initialize from refresh token
        const initialized = await authApi.initializeFromRefreshToken();
        if (!initialized) return null;
    }

    const response = await authApi.getMe();

    if (response.success && response.data?.user) {
        const user = response.data.user;
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            uniqueId: user.uniqueId,
            role: user.role,
            accountStatus: user.accountStatus,
        };
    }

    return null;
}

/**
 * Get current user with full details
 */
export async function getCurrentUser(): Promise<User | null> {
    // Check if we have an access token
    if (!getAccessToken()) {
        // Try to initialize from refresh token
        const initialized = await authApi.initializeFromRefreshToken();
        if (!initialized) return null;
    }

    const response = await authApi.getMe();

    if (response.success && response.data?.user) {
        return response.data.user;
    }

    return null;
}

/**
 * Update user profile
 */
export async function updateProfile(data: { name?: string; phone?: string; avatar?: string }): Promise<{ success: boolean; error?: string }> {
    const response = await authApi.updateProfile(data);

    if (response.success) {
        return { success: true };
    }

    return { success: false, error: response.error || 'Update failed' };
}

/**
 * Change password
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const response = await authApi.changePassword(currentPassword, newPassword);

    if (response.success) {
        return { success: true };
    }

    return { success: false, error: response.error || 'Password change failed' };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getAccessToken();
}

/**
 * Initialize authentication from stored refresh token
 */
export async function initializeAuth(): Promise<boolean> {
    return await authApi.initializeFromRefreshToken();
}

/**
 * Update profile action for form submissions
 */
export async function updateProfileAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
    const firstName = formData.get('firstName') as string || '';
    const lastName = formData.get('lastName') as string || '';
    const phone = formData.get('phone') as string || '';

    const name = `${firstName} ${lastName}`.trim();

    return updateProfile({ name, phone });
}
