'use server';

import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { HabitFrequency, Habit, HabitLog, ScoreboardEntry } from '@prisma/client';
import { z } from 'zod';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

const createHabitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  targetCount: z.number().int().positive().default(1),
});

const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']).optional(),
  targetCount: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// HABIT CRUD
// ============================================================================

export async function createHabitAction(formData: FormData): Promise<ActionResult<{ habitId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_HABIT')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    frequency: formData.get('frequency'),
    targetCount: parseInt(formData.get('targetCount') as string) || 1,
  };

  const result = createHabitSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const habit = await prisma.habit.create({
      data: {
        userId: session.user.id,
        familyId: session.user.familyId,
        name: result.data.name,
        description: result.data.description,
        frequency: result.data.frequency as HabitFrequency,
        targetCount: result.data.targetCount,
      },
    });

    revalidatePath('/dashboard/habits');
    return { success: true, data: { habitId: habit.id } };
  } catch (error) {
    console.error('[createHabitAction] Error:', error);
    return { success: false, error: 'Failed to create habit' };
  }
}

export async function updateHabitAction(
  habitId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) {
    return { success: false, error: 'Habit not found' };
  }

  if (habit.userId !== session.user.id && !hasPermission(session.user.role, 'MANAGE_HABITS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    frequency: formData.get('frequency') || undefined,
    targetCount: formData.get('targetCount') ? parseInt(formData.get('targetCount') as string) : undefined,
    isActive: formData.get('isActive') !== null ? formData.get('isActive') === 'true' : undefined,
  };

  const result = updateHabitSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.frequency && { frequency: result.data.frequency as HabitFrequency }),
        ...(result.data.targetCount && { targetCount: result.data.targetCount }),
        ...(result.data.isActive !== undefined && { isActive: result.data.isActive }),
      },
    });

    revalidatePath('/dashboard/habits');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateHabitAction] Error:', error);
    return { success: false, error: 'Failed to update habit' };
  }
}

export async function deleteHabitAction(habitId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit) {
    return { success: false, error: 'Habit not found' };
  }

  if (habit.userId !== session.user.id && !hasPermission(session.user.role, 'MANAGE_HABITS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.habit.delete({
      where: { id: habitId },
    });

    revalidatePath('/dashboard/habits');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteHabitAction] Error:', error);
    return { success: false, error: 'Failed to delete habit' };
  }
}

export async function getHabits(): Promise<(Habit & { _count: { logs: number } })[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.habit.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { logs: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getFamilyHabits(): Promise<(Habit & { user: { name: string | null }; _count: { logs: number } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.habit.findMany({
    where: { familyId: session.user.familyId, isActive: true },
    include: {
      user: { select: { name: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// HABIT LOGGING
// ============================================================================

export async function logHabitAction(
  habitId: string,
  date: Date,
  count: number = 1,
  notes?: string
): Promise<ActionResult<{ logId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit || habit.userId !== session.user.id) {
    return { success: false, error: 'Habit not found' };
  }

  try {
    // Upsert to handle re-logging same day
    const log = await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId,
          date: startOfDay(date),
        },
      },
      update: { count, notes },
      create: {
        habitId,
        userId: session.user.id,
        date: startOfDay(date),
        count,
        notes,
      },
    });

    // Update weekly scoreboard
    await updateWeeklyScoreboard(session.user.id, session.user.familyId!, date);

    revalidatePath('/dashboard/habits');
    return { success: true, data: { logId: log.id } };
  } catch (error) {
    console.error('[logHabitAction] Error:', error);
    return { success: false, error: 'Failed to log habit' };
  }
}

export async function removeHabitLogAction(habitId: string, date: Date): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
  });

  if (!habit || habit.userId !== session.user.id) {
    return { success: false, error: 'Habit not found' };
  }

  try {
    await prisma.habitLog.delete({
      where: {
        habitId_date: {
          habitId,
          date: startOfDay(date),
        },
      },
    });

    await updateWeeklyScoreboard(session.user.id, session.user.familyId, date);

    revalidatePath('/dashboard/habits');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[removeHabitLogAction] Error:', error);
    return { success: false, error: 'Failed to remove habit log' };
  }
}

export async function getHabitLogs(habitId: string, startDate: Date, endDate: Date): Promise<HabitLog[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.habitLog.findMany({
    where: {
      habitId,
      userId: session.user.id,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'desc' },
  });
}

export async function getWeeklyHabitSummary(weekStart?: Date) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id, isActive: true },
    include: {
      logs: {
        where: { date: { gte: start, lte: end } },
      },
    },
  });

  return habits.map(habit => {
    const completedCount = habit.logs.reduce((sum, log) => sum + log.count, 0);
    const targetTotal = habit.frequency === 'DAILY' ? habit.targetCount * 7 : habit.targetCount;
    const completionRate = Math.min((completedCount / targetTotal) * 100, 100);

    return {
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      completedCount,
      targetTotal,
      completionRate,
      logs: habit.logs,
    };
  });
}

// ============================================================================
// SCOREBOARD
// ============================================================================

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function updateWeeklyScoreboard(userId: string, familyId: string, date: Date): Promise<void> {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  // Calculate habit points
  const habitLogs = await prisma.habitLog.findMany({
    where: {
      userId,
      date: { gte: weekStart, lte: weekEnd },
    },
  });
  const habitPoints = habitLogs.reduce((sum, log) => sum + log.count * 10, 0);

  // Calculate task points
  const completedTasks = await prisma.task.count({
    where: {
      assigneeId: userId,
      completedAt: { gte: weekStart, lte: weekEnd },
    },
  });
  const taskPoints = completedTasks * 25;

  // Calculate contribution points (from family pools)
  const contributions = await prisma.contribution.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      createdAt: { gte: weekStart, lte: weekEnd },
    },
  });
  const contributionPoints = contributions.reduce((sum, c) => sum + Math.floor(c.amount / 10), 0);

  const totalPoints = habitPoints + taskPoints + contributionPoints;

  await prisma.scoreboardEntry.upsert({
    where: {
      familyId_userId_week: {
        familyId,
        userId,
        week: weekStart,
      },
    },
    update: {
      points: totalPoints,
      metrics: {
        habits: habitPoints,
        tasks: taskPoints,
        contributions: contributionPoints,
      },
    },
    create: {
      familyId,
      userId,
      week: weekStart,
      points: totalPoints,
      metrics: {
        habits: habitPoints,
        tasks: taskPoints,
        contributions: contributionPoints,
      },
    },
  });
}

export async function recalculateScoreboard(weekStart?: Date): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_HABITS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  try {
    // Get all family members
    const members = await prisma.membership.findMany({
      where: { familyId: session.user.familyId, status: 'ACTIVE' },
      select: { userId: true },
    });

    // Recalculate for each member
    await Promise.all(
      members.map(m => updateWeeklyScoreboard(m.userId, session.user.familyId!, start))
    );

    revalidatePath('/dashboard/scoreboard');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[recalculateScoreboard] Error:', error);
    return { success: false, error: 'Failed to recalculate scoreboard' };
  }
}

export async function getWeeklyScoreboard(weekStart?: Date): Promise<(ScoreboardEntry & { user: { id: string; name: string | null; image: string | null } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const start = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });

  const entries = await prisma.scoreboardEntry.findMany({
    where: {
      familyId: session.user.familyId,
      week: start,
    },
    orderBy: { points: 'desc' },
  });

  // Get user details
  const userIds = entries.map(e => e.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  return entries.map(entry => ({
    ...entry,
    user: userMap[entry.userId] || { id: entry.userId, name: null, image: null },
  }));
}

export async function getScoreboardHistory(weeks: number = 4) {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const results = [];
  
  // Get all members for name lookup
  const members = await prisma.membership.findMany({
    where: { familyId: session.user.familyId, status: 'ACTIVE' },
    select: { userId: true },
  });
  const userIds = members.map(m => m.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, image: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  
  for (let i = 0; i < weeks; i++) {
    const weekStartDate = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    
    const entries = await prisma.scoreboardEntry.findMany({
      where: {
        familyId: session.user.familyId,
        week: weekStartDate,
      },
      orderBy: { points: 'desc' },
    });

    results.push({
      weekStart: weekStartDate,
      weekLabel: format(weekStartDate, 'MMM d'),
      entries: entries.map(e => ({
        ...e,
        user: userMap[e.userId] || { id: e.userId, name: null, image: null },
      })),
    });
  }

  return results;
}

export async function getUserScoreHistory(weeks: number = 12) {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) return [];

  const results = [];
  
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    
    const entry = await prisma.scoreboardEntry.findUnique({
      where: {
        familyId_userId_week: {
          familyId: session.user.familyId,
          userId: session.user.id,
          week: weekStart,
        },
      },
    });

    results.push({
      weekStart,
      weekLabel: format(weekStart, 'MMM d'),
      points: entry?.points || 0,
      metrics: entry?.metrics || { habits: 0, tasks: 0, contributions: 0 },
    });
  }

  return results;
}
