'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UpgradeBannerProps {
  current: number;
  max: number;
  onUpgrade?: () => void;
}

export function UpgradeBanner({ current, max, onUpgrade }: UpgradeBannerProps) {
  const isAtLimit = current >= max;

  return (
    <Card className={isAtLimit ? 'border-amber-300 bg-amber-50' : 'bg-gray-50'}>
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <p className="font-semibold text-gray-900">
            {isAtLimit ? 'Template limit reached' : 'Free Plan'}
          </p>
          <p className="text-sm text-gray-600">
            {current} of {max} templates used
            {isAtLimit && ' — Upgrade for unlimited templates'}
          </p>
        </div>
        <Button
          variant={isAtLimit ? 'primary' : 'outline'}
          size="sm"
          onClick={onUpgrade}
        >
          Upgrade to Unlimited
        </Button>
      </CardContent>
    </Card>
  );
}
