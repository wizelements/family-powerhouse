import { prisma, AuditEvent } from '@/lib/db';
import { headers } from 'next/headers';

interface AuditLogParams {
  familyId: string;
  userId: string;
  event: AuditEvent;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog({
  familyId,
  userId,
  event,
  targetType,
  targetId,
  metadata,
}: AuditLogParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 
                      headersList.get('x-real-ip') || 
                      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    await prisma.auditLog.create({
      data: {
        familyId,
        userId,
        event,
        targetType,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function getAuditLogs(
  familyId: string,
  options: {
    event?: AuditEvent;
    userId?: string;
    targetType?: string;
    targetId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const {
    event,
    userId,
    targetType,
    targetId,
    startDate,
    endDate,
    page = 1,
    pageSize = 50,
  } = options;

  const where = {
    familyId,
    ...(event && { event }),
    ...(userId && { userId }),
    ...(targetType && { targetType }),
    ...(targetId && { targetId }),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    hasMore: total > page * pageSize,
  };
}
