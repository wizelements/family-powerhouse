'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { upgradeGuestAccountAction } from '@/server/actions/auth';

export default function UpgradePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    const result = await upgradeGuestAccountAction(email, password);

    if (!result.success) {
      setError(result.error || 'Failed to upgrade account');
      setIsLoading(false);
      return;
    }

    router.push('/dashboard?upgraded=true');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-4xl">🎉</div>
          <CardTitle className="text-2xl">Keep Your Progress!</CardTitle>
          <CardDescription>
            Create a permanent account to save your demo data and unlock all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Upgrade to Full Account'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-semibold text-green-800 mb-2">What you&apos;ll keep:</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>✓ Your family and all demo data</li>
              <li>✓ Pools, contributions, and history</li>
              <li>✓ Trip plans and itineraries</li>
              <li>✓ Chat messages and channels</li>
              <li>✓ Your OWNER role and permissions</li>
            </ul>
          </div>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:underline">
              ← Continue exploring demo
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
