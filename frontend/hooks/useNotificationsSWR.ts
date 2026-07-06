'use client';

import useSWR from 'swr';
import { notificationsApi, Notification } from '@/lib/api';

export function useNotificationsSWR() {
    const { data, error, isLoading, mutate } = useSWR(
        'notifications',
        async () => {
            const response = await notificationsApi.getAll({ limit: 20 });
            if (response.success && response.data) {
                return response.data;
            }
            throw new Error(response.error || 'Failed to fetch notifications');
        },
        {
            revalidateOnMount: true,
            dedupingInterval: 30 * 1000, // Cache for 30 seconds
            revalidateOnFocus: true,
        }
    );

    const markAsRead = async (id: string) => {
        await notificationsApi.markAsRead(id);
        mutate();
    };

    const markAllAsRead = async () => {
        await notificationsApi.markAllAsRead();
        mutate();
    };

    const deleteNotification = async (id: string) => {
        await notificationsApi.delete(id);
        mutate();
    };

    return {
        notifications: data?.notifications || [],
        unreadCount: data?.unreadCount || 0,
        isLoading,
        error,
        refresh: mutate,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    };
}
