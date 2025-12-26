import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { canCreateTemplate } from '@/server/actions/templates';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { TemplateForm } from './template-form';

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 max-w-md">
        Only family owners can create templates.
      </p>
      <Link href="/dashboard/templates" className="mt-6">
        <Button variant="outline">Back to Templates</Button>
      </Link>
    </div>
  );
}

function LimitReached({ max }: { max: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Template Limit Reached</h1>
      <p className="text-gray-600 max-w-md mb-6">
        You&apos;ve used all {max} templates on the free plan. Upgrade to unlimited to create more.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard/templates">
          <Button variant="outline">Back to Templates</Button>
        </Link>
        <Link href="/dashboard/settings/billing">
          <Button>Upgrade Plan</Button>
        </Link>
      </div>
    </div>
  );
}

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return <AccessDenied />;
  }

  const createStatus = await canCreateTemplate();

  if (!createStatus.allowed) {
    return <LimitReached max={createStatus.max} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link 
          href="/dashboard/templates" 
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          ← Back to Templates
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Create Template</h1>
        <p className="text-gray-600 mt-1">
          Define a reusable template for your family setup.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Configure channels, pools, and other settings that can be applied to your family.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateForm />
        </CardContent>
      </Card>
    </div>
  );
}
