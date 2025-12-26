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
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGuestAccess();
  };

  return (
    <div className="flex flex-col items-center">
      <Button
        size="lg"
        variant="secondary"
        onClick={handleGuestAccess}
        disabled={isLoading}
        className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span> Creating your demo...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            🚀 Try Demo Free
          </span>
        )}
      </Button>
      <span className="text-muted-foreground text-xs mt-1">
        Full access for 48 hours • No signup required
      </span>
      {error && (
        <div className="flex flex-col items-center mt-2">
          <div className="text-red-600 text-sm">{error}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRetry}
            disabled={isLoading}
            className="text-xs mt-1 underline"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
