'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTemplateAction } from '@/server/actions/templates';
import type { TemplateContent } from '@/lib/validation/schemas';

interface CreateTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableChannels?: Array<{ id: string; name: string; type: 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT' }>;
  availablePools?: Array<{ id: string; name: string; type: 'TRIP' | 'EMERGENCY' | 'VENTURE' | 'CUSTOM'; description?: string; targetAmount?: number }>;
  availableCategories?: Array<{ id: string; name: string; monthlyLimit: number; color?: string; icon?: string }>;
  availableHabits?: Array<{ id: string; name: string; description?: string; frequency: 'DAILY' | 'WEEKLY'; targetCount: number }>;
}

export function CreateTemplateDialog({
  isOpen,
  onClose,
  availableChannels = [],
  availablePools = [],
  availableCategories = [],
  availableHabits = [],
}: CreateTemplateDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectedPools, setSelectedPools] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedHabits, setSelectedHabits] = useState<Set<string>>(new Set());

  const toggleSelection = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setter(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const content: TemplateContent = {
      channels: availableChannels
        .filter(c => selectedChannels.has(c.id))
        .map(c => ({ name: c.name, type: c.type })),
      pools: availablePools
        .filter(p => selectedPools.has(p.id))
        .map(p => ({ name: p.name, type: p.type, description: p.description, targetAmount: p.targetAmount })),
      budgetCategories: availableCategories
        .filter(c => selectedCategories.has(c.id))
        .map(c => ({ name: c.name, monthlyLimit: c.monthlyLimit, color: c.color, icon: c.icon })),
      defaultHabits: availableHabits
        .filter(h => selectedHabits.has(h.id))
        .map(h => ({ name: h.name, description: h.description, frequency: h.frequency, targetCount: h.targetCount })),
    };

    startTransition(async () => {
      const result = await createTemplateAction({ name, description: description || undefined, content });
      if (!result.success) {
        setError(result.error);
      } else {
        resetForm();
        onClose();
      }
    });
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedChannels(new Set());
    setSelectedPools(new Set());
    setSelectedCategories(new Set());
    setSelectedHabits(new Set());
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Create Template</h2>
          <p className="text-sm text-gray-500">Save your current setup as a reusable template</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <Input
              label="Template Name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Family Starter Pack"
              required
            />

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {availableChannels.length > 0 && (
              <SelectionGroup
                label="Channels"
                items={availableChannels}
                selected={selectedChannels}
                onToggle={(id) => toggleSelection(selectedChannels, id, setSelectedChannels)}
              />
            )}

            {availablePools.length > 0 && (
              <SelectionGroup
                label="Pools"
                items={availablePools}
                selected={selectedPools}
                onToggle={(id) => toggleSelection(selectedPools, id, setSelectedPools)}
              />
            )}

            {availableCategories.length > 0 && (
              <SelectionGroup
                label="Budget Categories"
                items={availableCategories}
                selected={selectedCategories}
                onToggle={(id) => toggleSelection(selectedCategories, id, setSelectedCategories)}
              />
            )}

            {availableHabits.length > 0 && (
              <SelectionGroup
                label="Habits"
                items={availableHabits}
                selected={selectedHabits}
                onToggle={(id) => toggleSelection(selectedHabits, id, setSelectedHabits)}
              />
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isPending} disabled={!name.trim()}>
              Create Template
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectionGroup({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: Array<{ id: string; name: string }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selected.has(item.id)
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
