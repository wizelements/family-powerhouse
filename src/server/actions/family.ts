'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createFamilySchema, inviteMemberSchema, updateMemberRoleSchema } from '@/lib/validation/schemas';
import { hasPermission } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { ActionResult } from '@/types';
import type { Role, Family, Membership } from '@prisma/client';
import { sendInviteEmail } from '@/lib/email';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + uuidv4().slice(0, 8);
}

export async function createFamilyAction(formData: FormData): Promise<ActionResult<{ familyId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description'),
  };

  const result = createFamilySchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { name, description } = result.data;
  const slug = generateSlug(name);

  const family = await prisma.$transaction(async (tx) => {
    const newFamily = await tx.family.create({
      data: {
        name,
        slug,
        description,
      },
    });

    await tx.membership.create({
      data: {
        userId: session.user.id,
        familyId: newFamily.id,
        role: 'OWNER',
      },
    });

    // Create default channels
    await tx.channel.createMany({
      data: [
        { familyId: newFamily.id, name: 'general', type: 'PUBLIC', isDefault: true, description: 'General family chat' },
        { familyId: newFamily.id, name: 'announcements', type: 'ANNOUNCEMENT', description: 'Important announcements' },
        { familyId: newFamily.id, name: 'trips', type: 'PUBLIC', description: 'Trip planning discussions' },
        { familyId: newFamily.id, name: 'ventures', type: 'PUBLIC', description: 'Venture and business ideas' },
      ],
    });

    return newFamily;
  });

  await createAuditLog({
    familyId: family.id,
    userId: session.user.id,
    event: AuditEvent.FAMILY_CREATED,
    targetType: 'Family',
    targetId: family.id,
    metadata: { name },
  });

  revalidatePath('/dashboard');
  return { success: true, data: { familyId: family.id } };
}

export async function inviteMemberAction(formData: FormData): Promise<ActionResult<{ inviteToken: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'INVITE_MEMBERS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    email: formData.get('email'),
    role: formData.get('role'),
  };

  const result = inviteMemberSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { email, role } = result.data;

  // Check if already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { familyId: session.user.familyId },
      },
    },
  });

  if (existingUser?.memberships.length) {
    return { success: false, error: 'User is already a member of this family' };
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.invite.create({
    data: {
      familyId: session.user.familyId,
      email,
      token,
      role: role as Role,
      expiresAt,
    },
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.MEMBER_INVITED,
    targetType: 'Invite',
    targetId: token,
    metadata: { email, role },
  });

  // Get family name for email
  const family = await prisma.family.findUnique({
    where: { id: session.user.familyId },
    select: { name: true },
  });

  // Send email invitation
  const emailResult = await sendInviteEmail(email, family?.name || 'Your Family', role, token);
  if (!emailResult.success) {
    console.error('[inviteMemberAction] Failed to send invite email:', emailResult.error);
  }
  
  revalidatePath('/dashboard/members');
  return { success: true, data: { inviteToken: token } };
}

export async function acceptInviteAction(token: string): Promise<ActionResult<{ familyId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Please sign in to accept this invite' };
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { family: true },
  });

  if (!invite) {
    return { success: false, error: 'Invalid invite' };
  }

  if (invite.status !== 'PENDING') {
    return { success: false, error: 'Invite is no longer valid' };
  }

  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'EXPIRED' },
    });
    return { success: false, error: 'Invite has expired' };
  }

  // Check if user email matches invite email (if specified)
  if (invite.email && invite.email !== session.user.email) {
    return { success: false, error: 'This invite was sent to a different email address' };
  }

  await prisma.$transaction([
    prisma.membership.create({
      data: {
        userId: session.user.id,
        familyId: invite.familyId,
        role: invite.role,
      },
    }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', usedAt: new Date() },
    }),
  ]);

  await createAuditLog({
    familyId: invite.familyId,
    userId: session.user.id,
    event: AuditEvent.MEMBER_INVITED,
    targetType: 'Membership',
    targetId: session.user.id,
    metadata: { role: invite.role },
  });

  revalidatePath('/dashboard');
  return { success: true, data: { familyId: invite.familyId } };
}

export async function updateMemberRoleAction(formData: FormData): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_MEMBERS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    memberId: formData.get('memberId'),
    role: formData.get('role'),
  };

  const result = updateMemberRoleSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { memberId, role } = result.data;

  // Can't change own role
  if (memberId === session.user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: memberId,
      familyId: session.user.familyId,
    },
  });

  if (!membership) {
    return { success: false, error: 'Member not found' };
  }

  // Prevent demoting the only owner
  if (membership.role === 'OWNER' && role !== 'OWNER') {
    const ownerCount = await prisma.membership.count({
      where: { familyId: session.user.familyId, role: 'OWNER' },
    });
    if (ownerCount <= 1) {
      return { success: false, error: 'Cannot demote the only owner' };
    }
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role: role as Role },
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.ROLE_CHANGED,
    targetType: 'Membership',
    targetId: membership.id,
    metadata: { oldRole: membership.role, newRole: role },
  });

  revalidatePath('/dashboard/members');
  return { success: true, data: undefined };
}

export async function removeMemberAction(memberId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_MEMBERS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Can't remove self
  if (memberId === session.user.id) {
    return { success: false, error: 'Cannot remove yourself' };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: memberId,
      familyId: session.user.familyId,
    },
  });

  if (!membership) {
    return { success: false, error: 'Member not found' };
  }

  // Can't remove owners
  if (membership.role === 'OWNER') {
    return { success: false, error: 'Cannot remove an owner' };
  }

  await prisma.membership.delete({
    where: { id: membership.id },
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.MEMBER_REMOVED,
    targetType: 'Membership',
    targetId: membership.id,
    metadata: { removedUserId: memberId },
  });

  revalidatePath('/dashboard/members');
  return { success: true, data: undefined };
}

export async function getFamilyMembers(): Promise<(Membership & { user: { id: string; name: string | null; email: string; image: string | null } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.membership.findMany({
    where: { familyId: session.user.familyId, status: 'ACTIVE' },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function getFamily(): Promise<Family | null> {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.family.findUnique({
    where: { id: session.user.familyId },
  });
}
