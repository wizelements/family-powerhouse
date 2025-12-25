'use server';

import { prisma, AuditEvent, Prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { createPoolSchema, contributeToPoolSchema, withdrawalRequestSchema, approvalDecisionSchema } from '@/lib/validation/schemas';
import { hasPermission, canApproveWithdrawals } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { generateContributionIdempotencyKey, generateWithdrawalIdempotencyKey, generateLedgerIdempotencyKey } from '@/lib/utils/idempotency';
import { createContributionCheckoutSession } from '@/lib/stripe';
import { triggerFamilyEvent, triggerUserNotification } from '@/lib/pusher/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult, ApprovalConfig } from '@/types';
import type { Pool, Contribution, WithdrawalRequest, Approval } from '@prisma/client';

export async function createPoolAction(formData: FormData): Promise<ActionResult<{ poolId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_POOL')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    type: formData.get('type'),
    description: formData.get('description'),
    targetAmount: Number(formData.get('targetAmount')),
    deadline: formData.get('deadline') ? new Date(formData.get('deadline') as string) : undefined,
    tripId: formData.get('tripId') || undefined,
  };

  const result = createPoolSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const pool = await prisma.pool.create({
    data: {
      familyId: session.user.familyId,
      createdById: session.user.id,
      name: result.data.name,
      type: result.data.type,
      description: result.data.description,
      targetAmount: new Prisma.Decimal(result.data.targetAmount),
      deadline: result.data.deadline,
    },
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.POOL_CREATED,
    targetType: 'Pool',
    targetId: pool.id,
    metadata: { name: pool.name, type: pool.type, targetAmount: result.data.targetAmount },
  });

  await triggerFamilyEvent(session.user.familyId, 'pool:updated', {
    action: 'created',
    poolId: pool.id,
    poolName: pool.name,
  });

  revalidatePath('/dashboard/pools');
  return { success: true, data: { poolId: pool.id } };
}

export async function contributeToPoolAction(
  poolId: string,
  amount: number,
  type: 'ONE_TIME' | 'RECURRING' | 'PLEDGE' = 'ONE_TIME'
): Promise<ActionResult<{ checkoutUrl?: string; contributionId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId || !session.user.email) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CONTRIBUTE_TO_POOL')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const pool = await prisma.pool.findFirst({
    where: { id: poolId, familyId: session.user.familyId },
  });

  if (!pool) {
    return { success: false, error: 'Pool not found' };
  }

  if (pool.status !== 'ACTIVE') {
    return { success: false, error: 'Pool is not active' };
  }

  const idempotencyKey = generateContributionIdempotencyKey(poolId, session.user.id);

  const contribution = await prisma.contribution.create({
    data: {
      poolId,
      userId: session.user.id,
      amount: new Prisma.Decimal(amount),
      type,
      status: 'PENDING',
      idempotencyKey,
    },
  });

  if (type === 'PLEDGE') {
    // Pledges don't require immediate payment
    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.CONTRIBUTION_MADE,
      targetType: 'Contribution',
      targetId: contribution.id,
      metadata: { poolId, amount, type: 'PLEDGE' },
    });

    revalidatePath('/dashboard/pools');
    return { success: true, data: { contributionId: contribution.id } };
  }

  // Create Stripe checkout session
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'FAILED' },
    });
    return { success: false, error: 'Payment processing not configured' };
  }

  try {
    const checkoutSession = await createContributionCheckoutSession({
      poolId,
      poolName: pool.name,
      amount,
      contributionId: contribution.id,
      userId: session.user.id,
      userEmail: session.user.email,
      familyId: session.user.familyId,
      successUrl: `${baseUrl}/dashboard/pools/${poolId}?contribution=success`,
      cancelUrl: `${baseUrl}/dashboard/pools/${poolId}?contribution=cancelled`,
    });

    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return { success: true, data: { checkoutUrl: checkoutSession.url ?? undefined, contributionId: contribution.id } };
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    await prisma.contribution.update({
      where: { id: contribution.id },
      data: { status: 'FAILED' },
    });
    return { success: false, error: 'Failed to create payment session' };
  }
}

export async function requestWithdrawalAction(formData: FormData): Promise<ActionResult<{ requestId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'REQUEST_WITHDRAWAL')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    poolId: formData.get('poolId'),
    amount: Number(formData.get('amount')),
    reason: formData.get('reason'),
  };

  const result = withdrawalRequestSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { poolId, amount, reason } = result.data;

  const pool = await prisma.pool.findFirst({
    where: { id: poolId, familyId: session.user.familyId },
  });

  if (!pool) {
    return { success: false, error: 'Pool not found' };
  }

  if (pool.currentAmount.lessThan(amount)) {
    return { success: false, error: 'Insufficient pool balance' };
  }

  const idempotencyKey = generateWithdrawalIdempotencyKey(poolId, session.user.id);
  const approvalConfig = pool.approvalConfig as unknown as ApprovalConfig;

  // Get approvers
  const approvers = await prisma.membership.findMany({
    where: {
      familyId: session.user.familyId,
      role: { in: approvalConfig.approverRoles },
      status: 'ACTIVE',
      userId: { not: session.user.id }, // Requester can't approve their own request
    },
    select: { userId: true },
  });

  const withdrawalRequest = await prisma.$transaction(async (tx) => {
    const request = await tx.withdrawalRequest.create({
      data: {
        poolId,
        requesterId: session.user.id,
        amount: new Prisma.Decimal(amount),
        reason,
        idempotencyKey,
      },
    });

    // Create approval records for each potential approver
    await tx.approval.createMany({
      data: approvers.map((approver) => ({
        withdrawalRequestId: request.id,
        approverId: approver.userId,
      })),
    });

    // Create notifications for approvers
    await tx.notification.createMany({
      data: approvers.map((approver) => ({
        userId: approver.userId,
        familyId: session.user.familyId!,
        type: 'WITHDRAWAL_REQUESTED',
        title: 'Withdrawal Request',
        message: `${session.user.name || 'A member'} requested a $${amount} withdrawal from ${pool.name}`,
        data: { withdrawalRequestId: request.id, poolId, amount },
      })),
    });

    return request;
  });

  await createAuditLog({
    familyId: session.user.familyId,
    userId: session.user.id,
    event: AuditEvent.WITHDRAWAL_REQUESTED,
    targetType: 'WithdrawalRequest',
    targetId: withdrawalRequest.id,
    metadata: { poolId, amount, reason },
  });

  // Notify approvers in real-time
  for (const approver of approvers) {
    await triggerUserNotification(approver.userId, 'notification:new', {
      type: 'WITHDRAWAL_REQUESTED',
      withdrawalRequestId: withdrawalRequest.id,
    });
  }

  revalidatePath('/dashboard/pools');
  return { success: true, data: { requestId: withdrawalRequest.id } };
}

export async function approveWithdrawalAction(formData: FormData): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!canApproveWithdrawals(session.user.role)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    withdrawalRequestId: formData.get('withdrawalRequestId'),
    decision: formData.get('decision'),
    comment: formData.get('comment'),
  };

  const result = approvalDecisionSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const { withdrawalRequestId, decision, comment } = result.data;

  const approval = await prisma.approval.findFirst({
    where: {
      withdrawalRequestId,
      approverId: session.user.id,
      decision: null,
    },
    include: {
      withdrawalRequest: {
        include: { pool: true },
      },
    },
  });

  if (!approval) {
    return { success: false, error: 'Approval request not found or already decided' };
  }

  const request = approval.withdrawalRequest;
  if (request.status !== 'PENDING') {
    return { success: false, error: 'Withdrawal request is no longer pending' };
  }

  // Update approval
  await prisma.approval.update({
    where: { id: approval.id },
    data: {
      decision,
      comment,
      decidedAt: new Date(),
    },
  });

  const approvalConfig = request.pool.approvalConfig as unknown as ApprovalConfig;

  // Check if threshold is met
  const approvals = await prisma.approval.findMany({
    where: { withdrawalRequestId },
  });

  const approvedCount = approvals.filter((a) => a.decision === 'APPROVED').length;
  const rejectedCount = approvals.filter((a) => a.decision === 'REJECTED').length;
  const totalApprovers = approvals.length;

  let finalStatus: 'APPROVED' | 'REJECTED' | null = null;

  if (approvedCount >= approvalConfig.requiredApprovers) {
    finalStatus = 'APPROVED';
  } else if (rejectedCount > totalApprovers - approvalConfig.requiredApprovers) {
    // Cannot reach required approvals
    finalStatus = 'REJECTED';
  }

  if (finalStatus) {
    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: {
          status: finalStatus === 'APPROVED' ? 'PROCESSING' : 'REJECTED',
          processedAt: new Date(),
        },
      });

      if (finalStatus === 'APPROVED') {
        // Create ledger entry and update pool balance
        const newBalance = request.pool.currentAmount.minus(request.amount);
        
        await tx.ledgerEntry.create({
          data: {
            poolId: request.poolId,
            withdrawalRequestId,
            type: 'WITHDRAWAL',
            amount: request.amount.negated(),
            balanceAfter: newBalance,
            description: `Withdrawal: ${request.reason}`,
            idempotencyKey: generateLedgerIdempotencyKey('withdrawal', withdrawalRequestId),
          },
        });

        await tx.pool.update({
          where: { id: request.poolId },
          data: { currentAmount: newBalance },
        });

        await tx.withdrawalRequest.update({
          where: { id: withdrawalRequestId },
          data: { status: 'COMPLETED' },
        });
      }

      // Notify requester
      await tx.notification.create({
        data: {
          userId: request.requesterId,
          familyId: session.user.familyId!,
          type: finalStatus === 'APPROVED' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
          title: `Withdrawal ${finalStatus === 'APPROVED' ? 'Approved' : 'Rejected'}`,
          message: `Your withdrawal request for $${request.amount} has been ${finalStatus.toLowerCase()}`,
          data: { withdrawalRequestId, poolId: request.poolId },
        },
      });
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: finalStatus === 'APPROVED' ? AuditEvent.WITHDRAWAL_APPROVED : AuditEvent.WITHDRAWAL_REJECTED,
      targetType: 'WithdrawalRequest',
      targetId: withdrawalRequestId,
      metadata: { decision: finalStatus, approvedCount, rejectedCount },
    });

    await triggerUserNotification(request.requesterId, 'notification:new', {
      type: finalStatus === 'APPROVED' ? 'WITHDRAWAL_APPROVED' : 'WITHDRAWAL_REJECTED',
      withdrawalRequestId,
    });

    await triggerFamilyEvent(session.user.familyId, 'withdrawal:decided', {
      withdrawalRequestId,
      status: finalStatus,
    });
  }

  revalidatePath('/dashboard/pools');
  return { success: true, data: undefined };
}

export async function getPools(): Promise<Pool[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.pool.findMany({
    where: { familyId: session.user.familyId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getPool(poolId: string): Promise<(Pool & { contributions: Contribution[]; withdrawalRequests: (WithdrawalRequest & { approvals: Approval[] })[] }) | null> {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.pool.findFirst({
    where: { id: poolId, familyId: session.user.familyId },
    include: {
      contributions: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
      },
      withdrawalRequests: {
        include: { approvals: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}
