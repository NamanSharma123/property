'use client';

import { useEffect, useState } from 'react';
import { validatePasswordPolicy, getPasswordStrengthColor, getPasswordStrengthPercentage } from '@/lib/password-policy';
import type { PasswordStrength as PasswordStrengthType } from '@/types/auth';

interface PasswordStrengthProps {
    password: string;
    showRequirements?: boolean;
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
    const [strength, setStrength] = useState<PasswordStrengthType | null>(null);

    useEffect(() => {
        if (password) {
            const validation = validatePasswordPolicy(password);
            setStrength(validation);
        } else {
            setStrength(null);
        }
    }, [password]);

    if (!strength || !password) {
        return null;
    }

    const percentage = getPasswordStrengthPercentage(strength.score);
    const colorClass = getPasswordStrengthColor(strength.strength);

    return (
        <div className="space-y-2">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${strength.strength === 'very-strong' ? 'bg-green-600' :
                            strength.strength === 'strong' ? 'bg-blue-600' :
                                strength.strength === 'good' ? 'bg-yellow-600' :
                                    strength.strength === 'fair' ? 'bg-orange-600' :
                                        'bg-red-600'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Strength label */}
            <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${colorClass}`}>
                    {strength.strength === 'very-strong' && 'Very Strong'}
                    {strength.strength === 'strong' && 'Strong'}
                    {strength.strength === 'good' && 'Good'}
                    {strength.strength === 'fair' && 'Fair'}
                    {strength.strength === 'weak' && 'Weak'}
                </span>
            </div>

            {/* Requirements feedback */}
            {showRequirements && strength.feedback.length > 0 && (
                <ul className="space-y-1 mt-2">
                    {strength.feedback.map((item, index) => (
                        <li key={index} className="text-xs text-red-600 flex items-start">
                            <span className="mr-1">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Success message */}
            {strength.passesPolicy && (
                <p className="text-xs text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Password meets all requirements
                </p>
            )}
        </div>
    );
}
