'use client';

import { useEffect, useState } from 'react';
import { SettingsSection } from '@/app/dashboard/profile/_components/MyProfile/Settings/settings';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/lib/api';
import { DashboardSkeleton } from '@/components/ui/skeletons';

export default function SettingsPage() {
    const [user, setUser] = useState<User | null | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const currentUser = await getCurrentUser();
                if (!cancelled) setUser(currentUser);
            } catch (error) {
                console.error('Failed to load user:', error);
                if (!cancelled) setUser(null);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (user === undefined) {
        return <DashboardSkeleton />;
    }

    return <SettingsSection user={user} />;
}
