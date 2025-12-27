'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { VentureStage, MilestoneStatus, FinancialType, LeadStage, LeadType, Venture, VentureMilestone, VentureFinancial, OpportunityLead, Prisma } from '@prisma/client';
import { z } from 'zod';

const createVentureSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  purpose: z.string().min(1, 'Purpose is required').max(500),
  description: z.string().max(2000).optional(),
  stage: z.enum(['IDEA', 'RESEARCH', 'DEVELOPMENT', 'LAUNCHED', 'SCALING', 'PAUSED', 'CLOSED']).optional(),
});

const updateVentureSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  purpose: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  stage: z.enum(['IDEA', 'RESEARCH', 'DEVELOPMENT', 'LAUNCHED', 'SCALING', 'PAUSED', 'CLOSED']).optional(),
});

const createMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
});

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
});

const createFinancialSchema = z.object({
  type: z.enum(['REVENUE', 'EXPENSE', 'INVESTMENT']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required').max(500),
  date: z.string(),
});

const jsonSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['CLIENT', 'PARTNER', 'VENDOR', 'MARKET', 'OTHER']),
  stage: z.enum(['PROSPECT', 'CONTACTED', 'QUALIFYING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  notes: z.string().max(2000).optional(),
  contactInfo: jsonSchema.optional(),
  nextFollowUp: z.string().optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['CLIENT', 'PARTNER', 'VENDOR', 'MARKET', 'OTHER']).optional(),
  stage: z.enum(['PROSPECT', 'CONTACTED', 'QUALIFYING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(),
  notes: z.string().max(2000).optional(),
  contactInfo: jsonSchema.optional(),
  nextFollowUp: z.string().optional(),
});

// ============================================================================
// VENTURE CRUD
// ============================================================================

export async function createVentureAction(formData: FormData): Promise<ActionResult<{ ventureId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_VENTURE')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    purpose: formData.get('purpose'),
    description: formData.get('description') || undefined,
    stage: formData.get('stage') || undefined,
  };

  const result = createVentureSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const venture = await prisma.venture.create({
      data: {
        familyId: session.user.familyId,
        createdById: session.user.id,
        name: result.data.name,
        purpose: result.data.purpose,
        description: result.data.description,
        stage: (result.data.stage as VentureStage) || 'IDEA',
      },
    });

    // Add creator as owner
    await prisma.ventureOwner.create({
      data: {
        ventureId: venture.id,
        userId: session.user.id,
        role: 'Creator',
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.VENTURE_CREATED,
      targetType: 'Venture',
      targetId: venture.id,
      metadata: { name: result.data.name },
    });

    revalidatePath('/dashboard/ventures');
    return { success: true, data: { ventureId: venture.id } };
  } catch (error) {
    console.error('[createVentureAction] Error:', error);
    return { success: false, error: 'Failed to create venture' };
  }
}

export async function updateVentureAction(
  ventureId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
    include: { owners: true },
  });

  if (!venture) {
    return { success: false, error: 'Venture not found' };
  }

  const isOwner = venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    purpose: formData.get('purpose') || undefined,
    description: formData.get('description') || undefined,
    stage: formData.get('stage') || undefined,
  };

  const result = updateVentureSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await prisma.venture.update({
      where: { id: ventureId },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.purpose && { purpose: result.data.purpose }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.stage && { stage: result.data.stage as VentureStage }),
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.VENTURE_UPDATED,
      targetType: 'Venture',
      targetId: ventureId,
      metadata: result.data,
    });

    revalidatePath(`/dashboard/ventures/${ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateVentureAction] Error:', error);
    return { success: false, error: 'Failed to update venture' };
  }
}

export async function updateVentureStageAction(
  ventureId: string,
  stage: VentureStage
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
    include: { owners: true },
  });

  if (!venture) {
    return { success: false, error: 'Venture not found' };
  }

  const isOwner = venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.venture.update({
      where: { id: ventureId },
      data: { stage },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.VENTURE_UPDATED,
      targetType: 'Venture',
      targetId: ventureId,
      metadata: { previousStage: venture.stage, newStage: stage },
    });

    revalidatePath(`/dashboard/ventures/${ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateVentureStageAction] Error:', error);
    return { success: false, error: 'Failed to update venture stage' };
  }
}

export async function deleteVentureAction(ventureId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
  });

  if (!venture) {
    return { success: false, error: 'Venture not found' };
  }

  if (venture.createdById !== session.user.id && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.venture.delete({
      where: { id: ventureId },
    });

    revalidatePath('/dashboard/ventures');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteVentureAction] Error:', error);
    return { success: false, error: 'Failed to delete venture' };
  }
}

export async function getVentures(): Promise<(Venture & { owners: { userId: string; role: string | null }[]; _count: { milestones: number; financials: number } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.venture.findMany({
    where: { familyId: session.user.familyId },
    include: {
      owners: { select: { userId: true, role: true } },
      _count: { select: { milestones: true, financials: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVenture(ventureId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
    include: {
      owners: {
        include: { venture: false },
      },
      milestones: { orderBy: { dueDate: 'asc' } },
      financials: { orderBy: { date: 'desc' } },
      leads: { orderBy: { updatedAt: 'desc' } },
      attachments: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ============================================================================
// MILESTONES
// ============================================================================

export async function createMilestoneAction(
  ventureId: string,
  formData: FormData
): Promise<ActionResult<{ milestoneId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
    include: { owners: true },
  });

  if (!venture) {
    return { success: false, error: 'Venture not found' };
  }

  const isOwner = venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    dueDate: formData.get('dueDate') || undefined,
  };

  const result = createMilestoneSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const milestone = await prisma.ventureMilestone.create({
      data: {
        ventureId,
        title: result.data.title,
        description: result.data.description,
        dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
      },
    });

    revalidatePath(`/dashboard/ventures/${ventureId}`);
    return { success: true, data: { milestoneId: milestone.id } };
  } catch (error) {
    console.error('[createMilestoneAction] Error:', error);
    return { success: false, error: 'Failed to create milestone' };
  }
}

export async function updateMilestoneAction(
  milestoneId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const milestone = await prisma.ventureMilestone.findUnique({
    where: { id: milestoneId },
    include: { venture: { include: { owners: true } } },
  });

  if (!milestone || milestone.venture.familyId !== session.user.familyId) {
    return { success: false, error: 'Milestone not found' };
  }

  const isOwner = milestone.venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    title: formData.get('title') || undefined,
    description: formData.get('description') || undefined,
    dueDate: formData.get('dueDate') || undefined,
    status: formData.get('status') || undefined,
  };

  const result = updateMilestoneSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await prisma.ventureMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(result.data.title && { title: result.data.title }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.dueDate && { dueDate: new Date(result.data.dueDate) }),
        ...(result.data.status && { status: result.data.status as MilestoneStatus }),
      },
    });

    revalidatePath(`/dashboard/ventures/${milestone.ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateMilestoneAction] Error:', error);
    return { success: false, error: 'Failed to update milestone' };
  }
}

export async function updateMilestoneStatusAction(
  milestoneId: string,
  status: MilestoneStatus
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const milestone = await prisma.ventureMilestone.findUnique({
    where: { id: milestoneId },
    include: { venture: { include: { owners: true } } },
  });

  if (!milestone || milestone.venture.familyId !== session.user.familyId) {
    return { success: false, error: 'Milestone not found' };
  }

  const isOwner = milestone.venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.ventureMilestone.update({
      where: { id: milestoneId },
      data: { status },
    });

    revalidatePath(`/dashboard/ventures/${milestone.ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateMilestoneStatusAction] Error:', error);
    return { success: false, error: 'Failed to update milestone status' };
  }
}

export async function deleteMilestoneAction(milestoneId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const milestone = await prisma.ventureMilestone.findUnique({
    where: { id: milestoneId },
    include: { venture: { include: { owners: true } } },
  });

  if (!milestone || milestone.venture.familyId !== session.user.familyId) {
    return { success: false, error: 'Milestone not found' };
  }

  const isOwner = milestone.venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.ventureMilestone.delete({
      where: { id: milestoneId },
    });

    revalidatePath(`/dashboard/ventures/${milestone.ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteMilestoneAction] Error:', error);
    return { success: false, error: 'Failed to delete milestone' };
  }
}

// ============================================================================
// FINANCIALS
// ============================================================================

export async function addFinancialAction(
  ventureId: string,
  formData: FormData
): Promise<ActionResult<{ financialId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
    include: { owners: true },
  });

  if (!venture) {
    return { success: false, error: 'Venture not found' };
  }

  const isOwner = venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    type: formData.get('type'),
    amount: parseFloat(formData.get('amount') as string),
    description: formData.get('description'),
    date: formData.get('date'),
  };

  const result = createFinancialSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const financial = await prisma.ventureFinancial.create({
      data: {
        ventureId,
        type: result.data.type as FinancialType,
        amount: result.data.amount,
        description: result.data.description,
        date: new Date(result.data.date),
      },
    });

    revalidatePath(`/dashboard/ventures/${ventureId}`);
    return { success: true, data: { financialId: financial.id } };
  } catch (error) {
    console.error('[addFinancialAction] Error:', error);
    return { success: false, error: 'Failed to add financial record' };
  }
}

export async function deleteFinancialAction(financialId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const financial = await prisma.ventureFinancial.findUnique({
    where: { id: financialId },
    include: { venture: { include: { owners: true } } },
  });

  if (!financial || financial.venture.familyId !== session.user.familyId) {
    return { success: false, error: 'Financial record not found' };
  }

  const isOwner = financial.venture.owners.some(o => o.userId === session.user.id);
  if (!isOwner && !hasPermission(session.user.role, 'MANAGE_VENTURES')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.ventureFinancial.delete({
      where: { id: financialId },
    });

    revalidatePath(`/dashboard/ventures/${financial.ventureId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteFinancialAction] Error:', error);
    return { success: false, error: 'Failed to delete financial record' };
  }
}

export async function getVentureFinancialSummary(ventureId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  const venture = await prisma.venture.findFirst({
    where: { id: ventureId, familyId: session.user.familyId },
  });

  if (!venture) return null;

  const financials = await prisma.ventureFinancial.findMany({
    where: { ventureId },
  });

  const summary = financials.reduce(
    (acc, f) => {
      if (f.type === 'REVENUE') acc.revenue += f.amount;
      else if (f.type === 'EXPENSE') acc.expenses += f.amount;
      else if (f.type === 'INVESTMENT') acc.investments += f.amount;
      return acc;
    },
    { revenue: 0, expenses: 0, investments: 0 }
  );

  return {
    ...summary,
    netProfit: summary.revenue - summary.expenses,
    roi: summary.investments > 0 ? ((summary.revenue - summary.expenses) / summary.investments) * 100 : 0,
  };
}

// ============================================================================
// LEADS
// ============================================================================

export async function createLeadAction(
  formData: FormData,
  ventureId?: string
): Promise<ActionResult<{ leadId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (ventureId) {
    const venture = await prisma.venture.findFirst({
      where: { id: ventureId, familyId: session.user.familyId },
    });
    if (!venture) {
      return { success: false, error: 'Venture not found' };
    }
  }

  const contactInfoStr = formData.get('contactInfo');
  const rawData = {
    name: formData.get('name'),
    type: formData.get('type'),
    stage: formData.get('stage') || undefined,
    notes: formData.get('notes') || undefined,
    contactInfo: contactInfoStr ? JSON.parse(contactInfoStr as string) : undefined,
    nextFollowUp: formData.get('nextFollowUp') || undefined,
  };

  const result = createLeadSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const lead = await prisma.opportunityLead.create({
      data: {
        familyId: session.user.familyId,
        ventureId: ventureId || undefined,
        name: result.data.name,
        type: result.data.type as LeadType,
        stage: (result.data.stage as LeadStage) || 'PROSPECT',
        notes: result.data.notes,
        contactInfo: result.data.contactInfo as Prisma.InputJsonValue | undefined,
        nextFollowUp: result.data.nextFollowUp ? new Date(result.data.nextFollowUp) : undefined,
      },
    });

    revalidatePath(ventureId ? `/dashboard/ventures/${ventureId}` : '/dashboard/leads');
    return { success: true, data: { leadId: lead.id } };
  } catch (error) {
    console.error('[createLeadAction] Error:', error);
    return { success: false, error: 'Failed to create lead' };
  }
}

export async function updateLeadAction(
  leadId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const lead = await prisma.opportunityLead.findUnique({
    where: { id: leadId },
  });

  if (!lead || lead.familyId !== session.user.familyId) {
    return { success: false, error: 'Lead not found' };
  }

  const contactInfoStr = formData.get('contactInfo');
  const rawData = {
    name: formData.get('name') || undefined,
    type: formData.get('type') || undefined,
    stage: formData.get('stage') || undefined,
    notes: formData.get('notes') || undefined,
    contactInfo: contactInfoStr ? JSON.parse(contactInfoStr as string) : undefined,
    nextFollowUp: formData.get('nextFollowUp') || undefined,
  };

  const result = updateLeadSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await prisma.opportunityLead.update({
      where: { id: leadId },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.type && { type: result.data.type as LeadType }),
        ...(result.data.stage && { stage: result.data.stage as LeadStage }),
        ...(result.data.notes !== undefined && { notes: result.data.notes }),
        ...(result.data.contactInfo && { contactInfo: result.data.contactInfo as Prisma.InputJsonValue }),
        ...(result.data.nextFollowUp && { nextFollowUp: new Date(result.data.nextFollowUp) }),
      },
    });

    revalidatePath(lead.ventureId ? `/dashboard/ventures/${lead.ventureId}` : '/dashboard/leads');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateLeadAction] Error:', error);
    return { success: false, error: 'Failed to update lead' };
  }
}

export async function updateLeadStageAction(
  leadId: string,
  stage: LeadStage
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const lead = await prisma.opportunityLead.findUnique({
    where: { id: leadId },
  });

  if (!lead || lead.familyId !== session.user.familyId) {
    return { success: false, error: 'Lead not found' };
  }

  try {
    await prisma.opportunityLead.update({
      where: { id: leadId },
      data: { stage },
    });

    revalidatePath(lead.ventureId ? `/dashboard/ventures/${lead.ventureId}` : '/dashboard/leads');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateLeadStageAction] Error:', error);
    return { success: false, error: 'Failed to update lead stage' };
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const lead = await prisma.opportunityLead.findUnique({
    where: { id: leadId },
  });

  if (!lead || lead.familyId !== session.user.familyId) {
    return { success: false, error: 'Lead not found' };
  }

  try {
    await prisma.opportunityLead.delete({
      where: { id: leadId },
    });

    revalidatePath(lead.ventureId ? `/dashboard/ventures/${lead.ventureId}` : '/dashboard/leads');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteLeadAction] Error:', error);
    return { success: false, error: 'Failed to delete lead' };
  }
}

export async function getLeads(ventureId?: string): Promise<OpportunityLead[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.opportunityLead.findMany({
    where: {
      familyId: session.user.familyId,
      ...(ventureId && { ventureId }),
    },
    orderBy: { updatedAt: 'desc' },
  });
}
