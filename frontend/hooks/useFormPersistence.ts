'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to auto-save form data to sessionStorage to prevent data loss
 * when session expires or page is accidentally refreshed.
 */
export function useFormPersistence<T>(
    formKey: string,
    formData: T,
    setFormData: (data: T) => void
) {
    const isInitialized = useRef(false);
    const lastSavedData = useRef<string>('');

    // Save form data to sessionStorage
    const saveFormData = useCallback(() => {
        try {
            const dataString = JSON.stringify(formData);
            // Only save if data has changed
            if (dataString !== lastSavedData.current) {
                sessionStorage.setItem(formKey, dataString);
                lastSavedData.current = dataString;
            }
        } catch (error) {
            console.warn('Failed to save form data:', error);
        }
    }, [formKey, formData]);

    // Load form data from sessionStorage on mount
    useEffect(() => {
        if (isInitialized.current) return;

        try {
            const saved = sessionStorage.getItem(formKey);
            if (saved) {
                const parsedData = JSON.parse(saved);
                setFormData(parsedData);
                lastSavedData.current = saved;
            }
        } catch (error) {
            console.warn('Failed to load saved form data:', error);
        }

        isInitialized.current = true;
    }, [formKey, setFormData]);

    // Auto-save on form data changes (debounced)
    useEffect(() => {
        if (!isInitialized.current) return;

        const timeoutId = setTimeout(saveFormData, 1000);
        return () => clearTimeout(timeoutId);
    }, [saveFormData]);

    // Save before page unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            saveFormData();
            // Show warning if there's unsaved data
            const currentData = JSON.stringify(formData);
            if (currentData !== '{}' && currentData !== '[]' && currentData !== 'null') {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveFormData, formData]);

    // Clear saved data (call after successful submit)
    const clearSavedData = useCallback(() => {
        try {
            sessionStorage.removeItem(formKey);
            lastSavedData.current = '';
        } catch (error) {
            console.warn('Failed to clear saved form data:', error);
        }
    }, [formKey]);

    // Check if there's saved data
    const hasSavedData = useCallback(() => {
        try {
            return !!sessionStorage.getItem(formKey);
        } catch {
            return false;
        }
    }, [formKey]);

    return { saveFormData, clearSavedData, hasSavedData };
}

/**
 * Hook to detect browser tab visibility changes for multi-tab session sync
 */
export function useTabVisibility(
    onVisible?: () => void,
    onHidden?: () => void
) {
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                onVisible?.();
            } else {
                onHidden?.();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [onVisible, onHidden]);
}

/**
 * Hook to sync auth state across multiple tabs.
 * Watches BOTH portal token keys — user and admin sessions are independent,
 * so a logout in one portal must not log out the other portal's tabs.
 */
export function useAuthSync(onAuthChange: (isAuthenticated: boolean) => void) {
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'refreshToken' || e.key === 'adminRefreshToken') {
                // Token was added or removed in another tab (same portal)
                const hasToken = !!localStorage.getItem(e.key);
                onAuthChange(hasToken);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [onAuthChange]);
}

/**
 * Hook to show confirmation before leaving page with unsaved changes
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        if (hasUnsavedChanges) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);
}
