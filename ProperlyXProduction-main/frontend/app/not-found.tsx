'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-12 text-center">
            {/* Animated 404 */}
            <div className="mb-8">
              <div className="relative inline-block">
                <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-pulse">
                  404
                </h1>
                <div className="absolute -top-4 -right-4 animate-bounce">
                  <AlertCircle className="w-16 h-16 text-red-500" />
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Oops! Page Not Found
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                The page you&aposre looking for seems to have wandered off into the digital void.
              </p>
              <p className="text-sm text-gray-500">
                Don&apost worry, even the best property managers lose track of things sometimes!
              </p>
            </div>

            {/* Illustration */}
            <div className="mb-8 flex justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute inset-4 bg-gradient-to-br from-indigo-200 to-pink-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute inset-8 bg-gradient-to-br from-purple-200 to-blue-200 rounded-full opacity-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Search className="w-32 h-32 text-gray-400 opacity-50" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="lg"
                className="group"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Go Back
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Link href="/dashboard" className="flex items-center">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>

            {/* Helpful Links */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-4">Or try these popular pages:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  href="/dashboard"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/property"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Properties
                </Link>
                <Link
                  href="/dashboard/transactions"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Transactions
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Reports
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

