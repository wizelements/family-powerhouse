import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { getTemplate } from '@/server/actions/templates';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TemplateActions } from './template-actions';
import type { TemplateContent } from '@/lib/validation/schemas';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 max-w-md">
        Only family owners can view and manage templates.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.familyId) return null;

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return <AccessDenied />;
  }

  const template = await getTemplate(id);

  if (!template) {
    notFound();
  }

  const content = template.content as TemplateContent;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link 
          href="/dashboard/templates" 
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Back to Templates
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {template.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {template.description && (
            <p className="text-gray-600 mt-1">{template.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Created {new Date(template.createdAt).toLocaleDateString()}
          </p>
        </div>
        <TemplateActions templateId={template.id} isActive={template.isActive} />
      </div>

      {content.channels && content.channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Channels</CardTitle>
            <CardDescription>{content.channels.length} channel(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.channels.map((channel, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#{channel.name}</p>
                    {channel.description && (
                      <p className="text-sm text-gray-500">{channel.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                    {channel.type}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.pools && content.pools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pools</CardTitle>
            <CardDescription>{content.pools.length} pool(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.pools.map((pool, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{pool.name}</p>
                    {pool.description && (
                      <p className="text-sm text-gray-500">{pool.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {pool.targetAmount ? (
                      <span className="text-sm text-gray-600">
                        ${pool.targetAmount.toLocaleString()}
                      </span>
                    ) : null}
                    <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                      {pool.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.budgetCategories && content.budgetCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget Categories</CardTitle>
            <CardDescription>{content.budgetCategories.length} category(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.budgetCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {category.icon && <span>{category.icon}</span>}
                    <p className="font-medium text-gray-900">{category.name}</p>
                  </div>
                  <span className="text-sm text-gray-600">
                    ${category.monthlyLimit.toLocaleString()}/mo
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {content.defaultHabits && content.defaultHabits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Default Habits</CardTitle>
            <CardDescription>{content.defaultHabits.length} habit(s) configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.defaultHabits.map((habit, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{habit.name}</p>
                    {habit.description && (
                      <p className="text-sm text-gray-500">{habit.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">
                    {habit.frequency}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!content.channels?.length && !content.pools?.length && !content.budgetCategories?.length && !content.defaultHabits?.length && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">This template has no content configured yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
