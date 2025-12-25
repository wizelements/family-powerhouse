'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createGuestAccountAction, signInGuestAction } from '@/server/actions/auth';
import { useRouter } from 'next/navigation';

export default function GuestAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTryDemo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create guest account
      const guestResult = await createGuestAccountAction();
      if (!guestResult.success) {
        setError(guestResult.error || 'Failed to create guest account');
        return;
      }

      const { guestToken } = guestResult.data;

      // Sign in as guest
      const signInResult = await signInGuestAction(guestToken);
      if (!signInResult.success) {
        setError(signInResult.error || 'Failed to sign in as guest');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        variant="secondary"
        onClick={handleTryDemo}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? 'Loading...' : 'Try Demo'}
      </Button>
      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </>
  );
}
