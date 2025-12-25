'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signInAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await signInAction(formData);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏠</span>
            </div>
            <span className="text-2xl font-bold text-white">Family Powerhouse</span>
          </Link>
        </div>
        
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome back to your family hub
            </h1>
            <p className="text-blue-100 text-lg">
              Continue managing finances, planning trips, and building wealth together.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon="💰" text="Money Pooling" />
            <FeatureItem icon="💬" text="Family Chat" />
            <FeatureItem icon="✈️" text="Trip Planning" />
            <FeatureItem icon="📊" text="Budget Tracking" />
          </div>
        </div>
        
        <div className="text-blue-200 text-sm">
          Trusted by families building wealth and memories together.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-3xl">🏠</span>
              <span className="text-xl font-bold text-gray-900">Family Powerhouse</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-500 mt-2">Sign in to continue to your dashboard</p>
            </div>

            <form action={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <Input
                name="email"
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />

              <div>
                <Input
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <div className="mt-2 text-right">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">New to Family Powerhouse?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/signup">
                  <Button variant="outline" className="w-full" size="lg">
                    Create an Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
      <span className="text-xl">{icon}</span>
      <span className="text-white font-medium">{text}</span>
    </div>
  );
}
