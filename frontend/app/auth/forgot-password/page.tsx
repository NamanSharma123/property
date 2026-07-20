"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Building2, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await authApi.forgotPassword(email)
            if (result.success) {
                setSubmitted(true)
            } else {
                setError(result.error || 'Something went wrong. Please try again.')
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm">
                <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
                    <Building2 className="h-10 w-10 text-blue-600" />
                    <span className="text-2xl font-bold text-gray-900">Properly</span>
                </Link>

                {submitted ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent
                            a link to reset your password. It expires in 30 minutes.
                        </p>
                        <Link
                            href="/auth/login"
                            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot your password?</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Enter the email on your account and we&apos;ll send you a link to reset it.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

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
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Sending...' : 'Send reset link'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <Link href="/auth/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
