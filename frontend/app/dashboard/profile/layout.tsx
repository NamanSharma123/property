import React from 'react';
import Navani from '@/components/ui/navani';

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-6">
            {/* Profile Navigation */}
            <div className="w-full flex justify-center py-4 bg-white border-b">
                <Navani />
            </div>

            {/* Profile Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
