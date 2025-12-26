'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createTemplateAction } from '@/server/actions/templates';
import type { TemplateContent } from '@/lib/validation/schemas';

export function TemplateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [channels, setChannels] = useState<{ name: string; type: 'PUBLIC' | 'PRIVATE' | 'ANNOUNCEMENT'; description: string }[]>([]);
  const [pools, setPools] = useState<{ name: string; type: 'TRIP' | 'EMERGENCY' | 'VENTURE' | 'CUSTOM'; description: string; targetAmount: number }[]>([]);

  const addChannel = () => {
    setChannels([...channels, { name: '', type: 'PUBLIC', description: '' }]);
  };

  const removeChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index));
  };

  const updateChannel = (index: number, field: string, value: string) => {
    const updated = [...channels];
    updated[index] = { ...updated[index], [field]: value };
    setChannels(updated);
  };

  const addPool = () => {
    setPools([...pools, { name: '', type: 'CUSTOM', description: '', targetAmount: 0 }]);
  };

  const removePool = (index: number) => {
    setPools(pools.filter((_, i) => i !== index));
  };

  const updatePool = (index: number, field: string, value: string | number) => {
    const updated = [...pools];
    updated[index] = { ...updated[index], [field]: value };
    setPools(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const content: TemplateContent = {};
    if (channels.length > 0) {
      content.channels = channels.filter(c => c.name.trim());
    }
    if (pools.length > 0) {
      content.pools = pools.filter(p => p.name.trim());
    }

    const result = await createTemplateAction({
      name: name.trim(),
      description: description.trim() || undefined,
      content,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.push('/dashboard/templates');
    } else {
      setError(result.error || 'Failed to create template');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Template Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Family Vacation Setup"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what this template sets up..."
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Channels</h3>
          <Button type="button" variant="outline" size="sm" onClick={addChannel}>
            + Add Channel
          </Button>
        </div>
        {channels.length === 0 ? (
          <p className="text-sm text-gray-500">No channels added yet.</p>
        ) : (
          <div className="space-y-3">
            {channels.map((channel, index) => (
              <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={channel.name}
                    onChange={(e) => updateChannel(index, 'name', e.target.value)}
                    placeholder="channel-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <select
                    value={channel.type}
                    onChange={(e) => updateChannel(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChannel(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Pools</h3>
          <Button type="button" variant="outline" size="sm" onClick={addPool}>
            + Add Pool
          </Button>
        </div>
        {pools.length === 0 ? (
          <p className="text-sm text-gray-500">No pools added yet.</p>
        ) : (
          <div className="space-y-3">
            {pools.map((pool, index) => (
              <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={pool.name}
                    onChange={(e) => updatePool(index, 'name', e.target.value)}
                    placeholder="Pool name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={pool.type}
                      onChange={(e) => updatePool(index, 'type', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="CUSTOM">Custom</option>
                      <option value="TRIP">Trip</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="VENTURE">Venture</option>
                    </select>
                    <input
                      type="number"
                      value={pool.targetAmount || ''}
                      onChange={(e) => updatePool(index, 'targetAmount', parseFloat(e.target.value) || 0)}
                      placeholder="Target $"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePool(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Create Template
        </Button>
      </div>
    </form>
  );
}
