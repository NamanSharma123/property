"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { login } from '@/lib/auth'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const result = await login(email, password)

            if (result.success && result.user) {
                // Redirect users to dashboard
                router.push('/dashboard')
            } else {
                setError(result.error || 'Failed to sign in')
                setLoading(false)
            }
        } catch (loginError: unknown) {
            console.error('[Login] Login error:', loginError)
            setError('Failed to sign in')
            setLoading(false)
        }
    }

    const fillDemoCredentials = () => {
        setEmail('demo@example.com')
        setPassword('password123')
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
                        <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Don&apos;t have an account?{' '}
                            <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
                                Sign up for free
                            </Link>
                        </p>
                    </div>

                    {/* Demo Credentials Banner */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-blue-900">Try Demo Account</h3>
                                <p className="text-xs text-blue-700 mt-1">
                                    Email: <strong>demo@example.com</strong> | Password: <strong>password123</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={fillDemoCredentials}
                                className="ml-3 text-xs font-medium text-blue-600 hover:text-blue-500 whitespace-nowrap"
                            >
                                Auto-fill
                            </button>
                        </div>
                    </div>

                    <div className="mt-8">
                        <form onSubmit={handleLogin} className="space-y-6">
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
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                        Remember me (30 days)
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <Link href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div className="hidden lg:block relative flex-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
                    <div className="absolute inset-0 bg-black opacity-20"></div>
                    <div className="relative h-full flex flex-col justify-center px-12 text-white">
                        <h2 className="text-4xl font-bold mb-6">Manage properties with confidence</h2>
                        <p className="text-xl text-blue-100 mb-8">
                            Join thousands of landlords who trust PropertyHub to streamline their property management.
                        </p>
                        <div className="space-y-4">
                            {[
                                'Track income and expenses in real-time',
                                'Manage tenants and leases effortlessly',
                                'Generate detailed financial reports',
                                'Secure document storage',
                            ].map((feature) => (
                                <div key={feature} className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
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
