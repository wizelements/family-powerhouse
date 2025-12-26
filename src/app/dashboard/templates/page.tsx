import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { getTemplates, canCreateTemplate, getTemplateSubscription } from '@/server/actions/templates';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 max-w-md">
        Only family owners can manage templates. Please contact your family owner if you need access.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}

function UpgradeBanner({ current, max }: { current: number; max: number }) {
  const remaining = max - current;
  const isAtLimit = remaining <= 0;
  const isNearLimit = remaining <= 2;

  if (!isAtLimit && !isNearLimit) return null;

  return (
    <div className={`rounded-xl p-4 mb-6 shadow-lg ${isAtLimit ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isAtLimit ? '⚠️' : '💡'}</span>
          <div>
            <h3 className="font-semibold">
              {isAtLimit ? 'Template Limit Reached' : 'Running Low on Templates'}
            </h3>
            <p className="text-sm opacity-90">
              {isAtLimit 
                ? `You've used all ${max} templates on the free plan.`
                : `Only ${remaining} template${remaining === 1 ? '' : 's'} remaining on the free plan.`}
            </p>
          </div>
        </div>
        <Link href="/dashboard/settings/billing">
          <Button variant="secondary" size="sm">
            Upgrade to Unlimited
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SubscriptionStatus({ current, max, plan }: { current: number; max: number; plan: string }) {
  const isUnlimited = plan === 'UNLIMITED';
  
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className="text-lg">📋</span>
      <span>
        {isUnlimited 
          ? `${current} templates (Unlimited plan)`
          : `${current} of ${max} templates`}
      </span>
      {!isUnlimited && (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          Free Plan
        </span>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: { id: string; name: string; description: string | null; isActive: boolean; createdAt: Date } }) {
  return (
    <Link href={`/dashboard/templates/${template.id}`}>
      <Card className="h-full cursor-pointer hover:border-blue-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {template.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {template.description && (
            <CardDescription className="line-clamp-2">{template.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-gray-500">
            Created {new Date(template.createdAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-6xl mb-4">📝</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h2>
      <p className="text-gray-600 max-w-md mb-6">
        Templates help you quickly set up channels, pools, and budget categories for your family.
      </p>
      {canCreate && (
        <Link href="/dashboard/templates/new">
          <Button>Create Your First Template</Button>
        </Link>
      )}
    </div>
  );
}

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return <AccessDenied />;
  }

  const [templates, createStatus, subscription] = await Promise.all([
    getTemplates(),
    canCreateTemplate(),
    getTemplateSubscription(),
  ]);

  const plan = subscription?.plan ?? 'FREE';
  const maxTemplates = subscription?.maxTemplates ?? 7;

  return (
    <div className="space-y-6">
      {plan === 'FREE' && (
        <UpgradeBanner current={createStatus.current} max={createStatus.max} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Family Templates</h1>
          <p className="text-gray-600 mt-1">
            Create and manage reusable templates for channels, pools, and more.
          </p>
          <div className="mt-2">
            <SubscriptionStatus 
              current={createStatus.current} 
              max={maxTemplates} 
              plan={plan} 
            />
          </div>
        </div>
        {createStatus.allowed && (
          <Link href="/dashboard/templates/new">
            <Button>Create Template</Button>
          </Link>
        )}
      </div>

      {templates.length === 0 ? (
        <EmptyState canCreate={createStatus.allowed} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
