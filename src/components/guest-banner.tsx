'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface GuestBannerProps {
  isGuest: boolean;
  guestExpiresAt?: string | null;
}

export default function GuestBanner({ isGuest, guestExpiresAt }: GuestBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!isGuest || !guestExpiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(guestExpiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${hours}h ${minutes}m`);
      setIsExpiringSoon(hours < 6);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isGuest, guestExpiresAt]);

  if (!isGuest) return null;

  return (
    <div
      className={`w-full py-2 px-4 text-center text-sm ${
        isExpiringSoon
          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
          : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <span>
          🎭 <strong>Demo Mode</strong>
          {timeLeft && (
            <span className="ml-2">
              • Expires in <strong>{timeLeft}</strong>
            </span>
          )}
        </span>
        <Link href="/upgrade">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-purple-600 hover:bg-gray-100"
          >
            Save My Progress →
          </Button>
        </Link>
      </div>
    </div>
  );
}
