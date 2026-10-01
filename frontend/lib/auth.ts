'use client';

import { authApi, User, clearTokens, getAccessToken, Portal } from './api';

export type { User };

/**
 * Login with email and password (user portal)
 */
export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await authApi.login(email, password, 'user');

    if (response.success && response.data?.user) {
        return { success: true, user: response.data.user };
    }

    return { success: false, error: response.error || 'Login failed' };
}

/**
 * Login with email and password (admin portal — writes ONLY the admin
 * token slots, so a user tab open in the same browser is untouched)
 */
export async function adminLogin(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const response = await authApi.login(email, password, 'admin');

    if (response.success && response.data?.user) {
        return { success: true, user: response.data.user };
    }

    return { success: false, error: response.error || 'Login failed' };
}

/**
 * Signup with name, email and password
 */
export async function signup(name: string, email: string, password: string, phone: string): Promise<{ success: boolean; error?: string }> {
    const response = await authApi.signup(name, email, password, phone);

    if (response.success) {
        return { success: true };
    }

    return { success: false, error: response.error || 'Signup failed' };
}

/**
 * Logout (portal-aware — logging out of admin must not kill the user tab)
 */
export async function logout(portal: Portal = 'user'): Promise<void> {
    await authApi.logout(portal);
    clearTokens(portal);

    // Redirect to login
    if (typeof window !== 'undefined') {
        window.location.href = portal === 'admin' ? '/admin/login' : '/auth/login';
    }
}

/**
 * Get current session/user (portal-aware — each panel reads ONLY its own tokens)
 */
export async function getSession(portal: Portal = 'user'): Promise<{ id: string; email: string; name: string; uniqueId: string; inboundEmail?: string; role: string; accountStatus: string } | null> {
    // Check if we have an access token
    if (!getAccessToken(portal)) {
        // Try to initialize from refresh token
        const initialized = await authApi.initializeFromRefreshToken(portal);
        if (!initialized) return null;
    }

    const response = await authApi.getMe(portal);

    if (response.success && response.data?.user) {
        const user = response.data.user;
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            uniqueId: user.uniqueId,
            inboundEmail: user.inboundEmail,
            role: user.role,
            accountStatus: user.accountStatus,
        };
    }

    return null;
}

/**
 * Get current user with full details
 */
export async function getCurrentUser(portal: Portal = 'user'): Promise<User | null> {
    // Check if we have an access token
    if (!getAccessToken(portal)) {
        // Try to initialize from refresh token
        const initialized = await authApi.initializeFromRefreshToken(portal);
        if (!initialized) return null;
    }

    const response = await authApi.getMe(portal);

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
export function isAuthenticated(portal: Portal = 'user'): boolean {
    return !!getAccessToken(portal);
}

/**
 * Initialize authentication from stored refresh token
 */
export async function initializeAuth(portal: Portal = 'user'): Promise<boolean> {
    return await authApi.initializeFromRefreshToken(portal);
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
