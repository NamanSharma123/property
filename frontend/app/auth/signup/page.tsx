"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, Mail, Lock, User, Phone, ArrowRight, AlertCircle, Check, Circle, Eye, EyeOff } from 'lucide-react'
import { signup } from '@/lib/auth'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _result = { error: 'Signup disabled for debugging' }

// Password validation rules
const passwordRules = [
    { id: 'length', label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'At least one lowercase letter (a-z)', test: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'At least one number (0-9)', test: (pwd: string) => /\d/.test(pwd) },
    { id: 'special', label: 'At least one special character (!@#$%^&*)', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((previous) => ({
            ...previous,
            [event.target.name]: event.target.value,
        }))
    }

    // Check all password rules
    const passwordValidation = useMemo(() => {
        return passwordRules.map(rule => ({
            ...rule,
            passed: rule.test(formData.password),
        }));
    }, [formData.password]);

    const allRulesPassed = useMemo(() => {
        return passwordValidation.every(rule => rule.passed);
    }, [passwordValidation]);

    const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;

    const canSubmit = formData.name.length >= 2 &&
        formData.email.includes('@') &&
        formData.phone.replace(/\D/g, '').length >= 8 &&
        allRulesPassed &&
        passwordsMatch;

    const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (!allRulesPassed) {
            setError('Please ensure your password meets all requirements')
            setLoading(false)
            return
        }

        try {
            const result = await signup(formData.name, formData.email, formData.password, formData.phone);

            if (result?.error) {
                setError(result.error);
                setLoading(false);
            } else if (result?.success) {
                // Redirect to dashboard on success
                window.location.href = '/dashboard';
            }
        } catch (signupError: unknown) {
            console.error('Signup error:', signupError);
            setError('Failed to create account');
            setLoading(false);
        }
    }

    const calculatePasswordStrength = (password: string) => {
        let strength = 0
        if (password.length >= 8) strength += 1
        if (/[A-Z]/.test(password)) strength += 1
        if (/[0-9]/.test(password)) strength += 1
        if (/[^A-Za-z0-9]/.test(password)) strength += 1
        return strength
    }

    const passwordStrength = calculatePasswordStrength(formData.password)
    const getStrengthColor = (strength: number) => {
        if (strength === 0) return 'bg-gray-200'
        if (strength <= 2) return 'bg-red-500'
        if (strength === 3) return 'bg-yellow-500'
        return 'bg-green-500'
    }

    const getStrengthText = (strength: number) => {
        if (strength === 0) return ''
        if (strength <= 2) return 'Weak'
        if (strength === 3) return 'Medium'
        return 'Strong'
    }

    return (
        <div className="min-h-screen flex">
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div>
                        <Link href="/" className="flex items-center space-x-2 mb-8">
                            <Building2 className="h-10 w-10 text-blue-600" />
                            <span className="text-2xl font-bold text-gray-900">Properly</span>
                        </Link>
                        <h2 className="text-3xl font-bold text-gray-900">Create your account</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <form onSubmit={handleSignup} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                                    <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                    Full name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="John Doe"
                                        autoComplete="name"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                                    Phone number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="+61 400 123 456"
                                        autoComplete="tel"
                                    />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    Used as your unique OCR inbound-email address for scanning statements and receipts.
                                </p>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Password strength bar */}
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs text-gray-500">Password strength</span>
                                            <span className={`text-xs font-medium ${passwordStrength <= 2 ? 'text-red-500' :
                                                passwordStrength === 3 ? 'text-yellow-500' : 'text-green-500'
                                                }`}>
                                                {getStrengthText(passwordStrength)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                                                style={{ width: `${(passwordStrength / 4) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Password requirements checklist */}
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-medium text-gray-700 mb-2">Password must contain:</p>
                                    <ul className="space-y-1">
                                        {passwordValidation.map((rule) => (
                                            <li key={rule.id} className="flex items-center text-xs">
                                                {rule.passed ? (
                                                    <Check className="h-3.5 w-3.5 text-green-500 mr-2 flex-shrink-0" />
                                                ) : (
                                                    <Circle className="h-3.5 w-3.5 text-gray-300 mr-2 flex-shrink-0" />
                                                )}
                                                <span className={rule.passed ? 'text-green-700' : 'text-gray-500'}>
                                                    {rule.label}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`block w-full pl-10 pr-16 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.confirmPassword
                                            ? passwordsMatch
                                                ? 'border-green-300 bg-green-50'
                                                : 'border-red-300 bg-red-50'
                                            : 'border-gray-300'
                                            }`}
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                        {formData.confirmPassword && (
                                            passwordsMatch ? (
                                                <Check className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-red-500" />
                                            )
                                        )}
                                    </div>
                                </div>
                                {formData.confirmPassword && !passwordsMatch && (
                                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !canSubmit}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Creating account...' : 'Create account'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>

                            <p className="text-xs text-gray-500 text-center">
                                By signing up, you agree to our Terms of Service and Privacy Policy
                            </p>
                        </form>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block relative flex-1">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-teal-600 to-cyan-700">
                    <div className="absolute inset-0 bg-black opacity-20"></div>
                    <div className="relative h-full flex flex-col justify-center px-12 text-white">
                        <h2 className="text-4xl font-bold mb-6">Start managing smarter today</h2>
                        <p className="text-xl text-green-100 mb-8">
                            Free for your first 3 properties. No credit card required.
                        </p>
                        <div className="space-y-4">
                            {[
                                'Set up in minutes',
                                'No long-term contracts',
                                'Cancel anytime',
                                '24/7 customer support',
                            ].map((feature) => (
                                <div key={feature} className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-lg">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

