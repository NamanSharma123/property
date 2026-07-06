"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState, useRef } from 'react';

const navItems = [
    { name: 'My Profile', href: '/dashboard/profile' },
    { name: 'Credentials', href: '/dashboard/profile/credentials' },
    { name: 'Security', href: '/dashboard/profile/security' },
    { name: 'Tax Reports', href: '/dashboard/profile/tax-reports' },
];

export default function Navani() {
    const pathname = usePathname();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dashArray, setDashArray] = useState("0 0 0 0 9999"); // Default hidden
    const [hoveredPath, setHoveredPath] = useState<string | null>(null);

    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        setHoveredPath(path);
        if (!containerRef.current) return;

        const container = containerRef.current.getBoundingClientRect();
        const target = e.currentTarget.getBoundingClientRect();

        const relLeft = target.left - container.left;
        const width = target.width;
        const containerWidth = container.width;
        const containerHeight = container.height;

        // Calculate bracket dashes
        const gap1 = relLeft;
        const dash1 = width;
        const distToBottomDashStart = containerWidth + containerHeight + (containerWidth - (relLeft + width));
        const gapToBottomDash = distToBottomDashStart - (gap1 + dash1);
        const dash2 = width;
        const largeGap = 9999;

        setDashArray(`${gap1} ${dash1} ${gapToBottomDash} ${dash2} ${largeGap}`);
    };

    const handleMouseLeave = () => {
        setHoveredPath(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 mt-4">
            <div
                ref={containerRef}
                className="relative flex flex-wrap justify-between items-center p-4 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm group"
                onMouseLeave={handleMouseLeave}
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out z-10
                                ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}
                            `}
                            onMouseEnter={(e) => handleMouseEnter(e, item.href)}
                        >
                            {/* Active Indicator Dot */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 mx-4 rounded-full"
                                />
                            )}
                            <span className="relative z-10">{item.name}</span>
                        </Link>
                    );
                })}

                {/* SVG Outline */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full" overflow="visible">
                    {/* Default Dashed Rect */}
                    <motion.rect
                        width="100%"
                        height="100%"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="10 40"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: hoveredPath ? 0 : 0.3 }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Hover Bracket Rect */}
                    <motion.rect
                        width="100%"
                        height="100%"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: hoveredPath ? 1 : 0,
                            strokeDasharray: dashArray
                        }}
                        transition={{ duration: 0.3 }}
                    />
                </svg>
            </div>
        </div>
    );
}