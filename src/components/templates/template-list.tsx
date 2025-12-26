'use client';

import { useState } from 'react';
import { TemplateCard } from './template-card';
import { UpgradeBanner } from './upgrade-banner';
import { CreateTemplateDialog } from './create-template-dialog';
import { Button } from '@/components/ui/button';
import type { TemplateContent } from '@/lib/validation/schemas';

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: TemplateContent;
  isActive: boolean;
  createdAt: Date;
}

interface TemplateListProps {
  templates: Template[];
  subscription: {
    current: number;
    max: number;
    plan: 'FREE' | 'UNLIMITED';
  };
  availableChannels?: Array<{ id: string; name: string; type: 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT' }>;
  availablePools?: Array<{ id: string; name: string; type: 'TRIP' | 'EMERGENCY' | 'VENTURE' | 'CUSTOM'; description?: string; targetAmount?: number }>;
  availableCategories?: Array<{ id: string; name: string; monthlyLimit: number; color?: string; icon?: string }>;
  availableHabits?: Array<{ id: string; name: string; description?: string; frequency: 'DAILY' | 'WEEKLY'; targetCount: number }>;
  onEdit?: (id: string) => void;
  onUpgrade?: () => void;
}

export function TemplateList({
  templates,
  subscription,
  availableChannels,
  availablePools,
  availableCategories,
  availableHabits,
  onEdit,
  onUpgrade,
}: TemplateListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canCreate = subscription.plan === 'UNLIMITED' || subscription.current < subscription.max;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Templates</h2>
          <p className="text-sm text-gray-500">
            {subscription.plan === 'UNLIMITED'
              ? `${templates.length} templates`
              : `${subscription.current} of ${subscription.max} templates used`}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          disabled={!canCreate}
        >
          Create Template
        </Button>
      </div>

      {subscription.plan === 'FREE' && (
        <UpgradeBanner
          current={subscription.current}
          max={subscription.max}
          onUpgrade={onUpgrade}
        />
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No templates yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create templates to save and reuse your family setup
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            disabled={!canCreate}
          >
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <TemplateCard key={template.id} template={template} onEdit={onEdit} />
          ))}
        </div>
      )}

      <CreateTemplateDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        availableChannels={availableChannels}
        availablePools={availablePools}
        availableCategories={availableCategories}
        availableHabits={availableHabits}
      />
    </div>
  );
}
