'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { applyTemplateAction, deleteTemplateAction, updateTemplateAction } from '@/server/actions/templates';

export function TemplateActions({ templateId, isActive }: { templateId: string; isActive: boolean }) {
  const router = useRouter();
  const [isApplying, setIsApplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApply = async () => {
    if (!confirm('Apply this template? This will create any channels and pools that don\'t already exist.')) {
      return;
    }

    setIsApplying(true);
    setMessage(null);

    const result = await applyTemplateAction(templateId);

    setIsApplying(false);

    if (result.success) {
      const applied = result.data?.applied || [];
      setMessage({
        type: 'success',
        text: applied.length > 0 
          ? `Applied: ${applied.join(', ')}`
          : 'Template applied (all items already exist)',
      });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to apply template' });
    }
  };

  const handleToggleActive = async () => {
    setIsToggling(true);
    setMessage(null);

    const result = await updateTemplateAction({
      templateId,
      isActive: !isActive,
    });

    setIsToggling(false);

    if (result.success) {
      router.refresh();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update template' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    const result = await deleteTemplateAction(templateId);

    if (result.success) {
      router.push('/dashboard/templates');
    } else {
      setIsDeleting(false);
      setMessage({ type: 'error', text: result.error || 'Failed to delete template' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={handleApply} isLoading={isApplying}>
          Apply Template
        </Button>
        <Button 
          variant="outline" 
          onClick={handleToggleActive} 
          isLoading={isToggling}
        >
          {isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDelete} 
          isLoading={isDeleting}
        >
          Delete
        </Button>
      </div>
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
