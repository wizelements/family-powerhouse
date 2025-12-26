'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { TemplateContentPreview } from './template-content-preview';
import { deleteTemplateAction, applyTemplateAction } from '@/server/actions/templates';
import type { TemplateContent } from '@/lib/validation/schemas';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string | null;
    content: TemplateContent;
    isActive: boolean;
    createdAt: Date;
  };
  onEdit?: (id: string) => void;
}

export function TemplateCard({ template, onEdit }: TemplateCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<string[] | null>(null);

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleApply = () => {
    if (!confirm('Apply this template? Existing items with the same name will be skipped.')) return;
    setError(null);
    setApplyResult(null);
    startTransition(async () => {
      const result = await applyTemplateAction(template.id);
      if (!result.success) {
        setError(result.error);
      } else {
        setApplyResult(result.data.applied);
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {template.name}
              {template.isActive && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Active
                </span>
              )}
            </CardTitle>
            {template.description && (
              <CardDescription>{template.description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <TemplateContentPreview content={template.content} compact />
      </CardContent>

      {error && (
        <div className="px-6 pb-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {applyResult && applyResult.length > 0 && (
        <div className="px-6 pb-2">
          <p className="text-sm text-green-600">
            Applied: {applyResult.join(', ')}
          </p>
        </div>
      )}

      {applyResult && applyResult.length === 0 && (
        <div className="px-6 pb-2">
          <p className="text-sm text-gray-500">All items already exist.</p>
        </div>
      )}

      <CardFooter className="flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit?.(template.id)}
          disabled={isPending}
        >
          Edit
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={isPending}
          isLoading={isPending}
        >
          Apply
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
