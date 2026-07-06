'use client';

import { useState, useEffect } from 'react';
import { DashboardContent, UserData } from "@/app/dashboard/profile/_components/MyProfile/MyProfile";
import { getCurrentUser } from "@/lib/auth";
import { DashboardSkeleton } from "@/components/ui/skeletons";

export default function MyProfilePage() {
    const [user, setUser] = useState<UserData | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadUser() {
            try {
                const currentUser = await getCurrentUser();
                if (currentUser) {
                    setUser({
                        name: currentUser.name,
                        email: currentUser.email,
                        uniqueId: currentUser.uniqueId,
                        phone: currentUser.phone,
                        createdAt: currentUser.createdAt,
                    });
                }
            } catch (error) {
                console.error('Failed to load user:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadUser();
    }, []);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return <DashboardContent activeSection="profile" user={user} />;
}
