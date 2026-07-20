"use client"

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import { PasswordStrength } from '@/app/auth/_components/PasswordStrength'
import { validatePasswordPolicy } from '@/lib/password-policy'

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    )
}

function ResetPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError('')

        if (!token) {
            setError('This reset link is missing its token. Please request a new one.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (!validatePasswordPolicy(password).passesPolicy) {
            setError('Please choose a password that meets all the requirements below')
            return
        }

        setLoading(true)
        try {
            const result = await authApi.resetPassword(token, password)
            if (result.success) {
                setDone(true)
            } else {
                setError(result.error || 'This reset link is invalid or has expired. Please request a new one.')
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-sm">
                    <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                        <Building2 className="h-10 w-10 text-blue-600" />
                        <span className="text-2xl font-bold text-gray-900">Properly</span>
                    </Link>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid reset link</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            This link is missing its reset token. Please request a new password reset link.
                        </p>
                        <Link
                            href="/auth/forgot-password"
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Request new link
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm">
                <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                    <Building2 className="h-10 w-10 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">Properly</span>
                </Link>

                {done ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Your password has been changed. You&apos;ve been signed out of all devices for security —
                            sign in again with your new password.
                        </p>
                        <button
                            onClick={() => router.push('/auth/login')}
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Go to sign in
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a new password</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Make sure it&apos;s at least 8 characters and includes a mix of letters, numbers, and symbols.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    New password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
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
                                <div className="mt-2">
                                    <PasswordStrength password={password} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm new password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Resetting...' : 'Reset password'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
