'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createTemplateSchema, updateTemplateSchema, type TemplateContent } from '@/lib/validation/schemas';
import { hasPermission } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { FamilyTemplate, TemplateSubscription } from '@prisma/client';

const FREE_TEMPLATE_LIMIT = 7;

export async function getTemplateSubscription(): Promise<TemplateSubscription | null> {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.templateSubscription.findUnique({
    where: { familyId: session.user.familyId },
  });
}

export async function getOrCreateTemplateSubscription(): Promise<TemplateSubscription> {
  const session = await auth();
  if (!session?.user?.familyId) {
    throw new Error('Unauthorized');
  }

  let subscription = await prisma.templateSubscription.findUnique({
    where: { familyId: session.user.familyId },
  });

  if (!subscription) {
    subscription = await prisma.templateSubscription.create({
      data: {
        familyId: session.user.familyId,
        plan: 'FREE',
        maxTemplates: FREE_TEMPLATE_LIMIT,
      },
    });
  }

  return subscription;
}

export async function getTemplates(): Promise<FamilyTemplate[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.familyTemplate.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTemplate(templateId: string): Promise<FamilyTemplate | null> {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.familyTemplate.findFirst({
    where: { 
      id: templateId,
      familyId: session.user.familyId,
    },
  });
}

export async function getTemplateCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.familyId) return 0;

  return prisma.familyTemplate.count({
    where: { familyId: session.user.familyId },
  });
}

export async function canCreateTemplate(): Promise<{ allowed: boolean; reason?: string; current: number; max: number }> {
  const session = await auth();
  if (!session?.user?.familyId) {
    return { allowed: false, reason: 'Unauthorized', current: 0, max: 0 };
  }

  const subscription = await getOrCreateTemplateSubscription();
  const currentCount = await getTemplateCount();

  if (subscription.plan === 'UNLIMITED') {
    return { allowed: true, current: currentCount, max: -1 };
  }

  if (currentCount >= subscription.maxTemplates) {
    return { 
      allowed: false, 
      reason: `You have reached the limit of ${subscription.maxTemplates} templates. Upgrade to unlimited for more.`,
      current: currentCount,
      max: subscription.maxTemplates,
    };
  }

  return { allowed: true, current: currentCount, max: subscription.maxTemplates };
}

export async function createTemplateAction(data: {
  name: string;
  description?: string;
  content: TemplateContent;
}): Promise<ActionResult<{ templateId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return { success: false, error: 'Only family owners can manage templates' };
  }

  const result = createTemplateSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const canCreate = await canCreateTemplate();
  if (!canCreate.allowed) {
    return { success: false, error: canCreate.reason || 'Cannot create template' };
  }

  const { name, description, content } = result.data;

  try {
    const template = await prisma.familyTemplate.create({
      data: {
        familyId: session.user.familyId,
        createdById: session.user.id,
        name,
        description,
        content: content as object,
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.TEMPLATE_CREATED,
      targetType: 'FamilyTemplate',
      targetId: template.id,
      metadata: { name },
    });

    revalidatePath('/dashboard/templates');
    return { success: true, data: { templateId: template.id } };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { success: false, error: 'A template with this name already exists' };
    }
    throw error;
  }
}

export async function updateTemplateAction(data: {
  templateId: string;
  name?: string;
  description?: string;
  content?: TemplateContent;
  isActive?: boolean;
}): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return { success: false, error: 'Only family owners can manage templates' };
  }

  const result = updateTemplateSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { templateId, ...updateData } = result.data;

  const template = await prisma.familyTemplate.findFirst({
    where: { 
      id: templateId,
      familyId: session.user.familyId,
    },
  });

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  const dataToUpdate: { name?: string; description?: string; content?: object; isActive?: boolean } = {};
  if (updateData.name) dataToUpdate.name = updateData.name;
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
  if (updateData.content) dataToUpdate.content = updateData.content as object;
  if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;

  try {
    await prisma.familyTemplate.update({
      where: { id: templateId },
      data: dataToUpdate,
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.TEMPLATE_UPDATED,
      targetType: 'FamilyTemplate',
      targetId: templateId,
      metadata: { changes: Object.keys(dataToUpdate) },
    });

    revalidatePath('/dashboard/templates');
    return { success: true, data: undefined };
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return { success: false, error: 'A template with this name already exists' };
    }
    throw error;
  }
}

export async function deleteTemplateAction(templateId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return { success: false, error: 'Only family owners can manage templates' };
  }

  const template = await prisma.familyTemplate.findFirst({
    where: { 
      id: templateId,
      familyId: session.user.familyId,
    },
  });

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  await prisma.familyTemplate.delete({
    where: { id: templateId },
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.TEMPLATE_DELETED,
    targetType: 'FamilyTemplate',
    targetId: templateId,
    metadata: { name: template.name },
  });

  revalidatePath('/dashboard/templates');
  return { success: true, data: undefined };
}

export async function applyTemplateAction(templateId: string): Promise<ActionResult<{ applied: string[] }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return { success: false, error: 'Only family owners can apply templates' };
  }

  const template = await prisma.familyTemplate.findFirst({
    where: { 
      id: templateId,
      familyId: session.user.familyId,
    },
  });

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  const content = template.content as TemplateContent;
  const applied: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (content.channels?.length) {
      for (const channel of content.channels) {
        const existing = await tx.channel.findFirst({
          where: { familyId: session.user.familyId!, name: channel.name },
        });
        if (!existing) {
          await tx.channel.create({
            data: {
              familyId: session.user.familyId!,
              name: channel.name,
              type: channel.type,
              description: channel.description,
            },
          });
          applied.push(`Channel: ${channel.name}`);
        }
      }
    }

    if (content.pools?.length) {
      for (const pool of content.pools) {
        const existing = await tx.pool.findFirst({
          where: { familyId: session.user.familyId!, name: pool.name },
        });
        if (!existing) {
          await tx.pool.create({
            data: {
              familyId: session.user.familyId!,
              createdById: session.user.id,
              name: pool.name,
              type: pool.type,
              description: pool.description,
              targetAmount: pool.targetAmount || 0,
            },
          });
          applied.push(`Pool: ${pool.name}`);
        }
      }
    }
  });

  revalidatePath('/dashboard');
  return { success: true, data: { applied } };
}

export async function upgradeToUnlimitedAction(stripeSubscriptionId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_TEMPLATES')) {
    return { success: false, error: 'Only family owners can upgrade' };
  }

  await prisma.templateSubscription.upsert({
    where: { familyId: session.user.familyId },
    update: {
      plan: 'UNLIMITED',
      maxTemplates: -1,
      stripeSubscriptionId,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    create: {
      familyId: session.user.familyId,
      plan: 'UNLIMITED',
      maxTemplates: -1,
      stripeSubscriptionId,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath('/dashboard/templates');
  return { success: true, data: undefined };
}
