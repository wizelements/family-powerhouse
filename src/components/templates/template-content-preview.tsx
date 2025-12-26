import type { TemplateContent } from '@/lib/validation/schemas';

interface TemplateContentPreviewProps {
  content: TemplateContent;
  compact?: boolean;
}

export function TemplateContentPreview({ content, compact = false }: TemplateContentPreviewProps) {
  const sections = [
    { key: 'channels', label: 'Channels', items: content.channels, icon: '#' },
    { key: 'pools', label: 'Pools', items: content.pools, icon: '💰' },
    { key: 'budgetCategories', label: 'Budget Categories', items: content.budgetCategories, icon: '📊' },
    { key: 'defaultHabits', label: 'Habits', items: content.defaultHabits, icon: '✓' },
  ] as const;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
        {sections.map(({ key, label, items, icon }) => 
          items?.length ? (
            <span key={key} className="inline-flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
              <span>{icon}</span>
              <span>{items.length} {label}</span>
            </span>
          ) : null
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map(({ key, label, items, icon }) => 
        items?.length ? (
          <div key={key}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <span>{icon}</span>
              {label}
            </h4>
            <ul className="space-y-1">
              {items.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                  <span className="font-medium">{item.name}</span>
                  {'type' in item && <span className="text-gray-400 ml-2">({item.type})</span>}
                  {'description' in item && item.description && (
                    <p className="text-gray-400 text-xs">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  );
}
