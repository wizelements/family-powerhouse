'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUpAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);
    
    const result = await signUpAction(formData);
    
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-2">
            <div className="text-4xl mb-3">🎉</div>
          </div>
          <CardTitle>Create Your Account</CardTitle>
          <CardDescription>Start your family's journey to financial success</CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            <Input
              name="name"
              type="text"
              label="Full Name"
              placeholder="John Doe"
              required
              autoComplete="name"
            />
            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••••••"
              required
              autoComplete="new-password"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900 font-medium">
                ✓ At least 12 characters
                <br />
                ✓ Mix of uppercase, lowercase, and numbers
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-gray-600 text-center w-full">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
