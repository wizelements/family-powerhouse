'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createGuestAccountAction, signInGuestAction } from '@/server/actions/auth';
import { useRouter } from 'next/navigation';

export default function GuestAccessButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGuestAccess = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const guestResult = await createGuestAccountAction();
      if (!guestResult.success) {
        setError(guestResult.error || 'Failed to create guest account');
        return;
      }

      const { guestToken } = guestResult.data;

      const signInResult = await signInGuestAction(guestToken);
      if (!signInResult.success) {
        setError(signInResult.error || 'Failed to sign in as guest');
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        size="lg"
        variant="secondary"
        onClick={handleGuestAccess}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? 'Loading...' : 'Continue as Guest'}
      </Button>
      <span className="text-muted-foreground text-xs mt-1">
        Limited read-only access
      </span>
      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );
}
