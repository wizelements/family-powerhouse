'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { auth } from '@/lib/auth/config';
import { hasPermission } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/utils/audit';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import type { BudgetType, TransactionType, TransactionSource, Budget, BudgetCategory, Transaction } from '@prisma/client';
import { z } from 'zod';
import { sendBudgetAlertEmail } from '@/lib/email';
import { triggerUserNotification } from '@/lib/pusher/server';

const createBudgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['HOUSEHOLD', 'PERSONAL', 'POOL']),
  startDate: z.string(),
  endDate: z.string().optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  monthlyLimit: z.number().positive('Limit must be positive'),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const createTransactionSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.string(),
});

const ALERT_THRESHOLDS = [50, 75, 90, 100];

// ============================================================================
// BUDGET CRUD
// ============================================================================

export async function createBudgetAction(formData: FormData): Promise<ActionResult<{ budgetId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const rawData = {
    name: formData.get('name'),
    type: formData.get('type'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') || undefined,
  };

  const result = createBudgetSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const budget = await prisma.budget.create({
      data: {
        familyId: session.user.familyId,
        name: result.data.name,
        type: result.data.type as BudgetType,
        startDate: new Date(result.data.startDate),
        endDate: result.data.endDate ? new Date(result.data.endDate) : undefined,
        ownerId: result.data.type === 'PERSONAL' ? session.user.id : undefined,
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.BUDGET_CREATED,
      targetType: 'Budget',
      targetId: budget.id,
      metadata: { name: result.data.name },
    });

    revalidatePath('/dashboard/budgets');
    return { success: true, data: { budgetId: budget.id } };
  } catch (error) {
    console.error('[createBudgetAction] Error:', error);
    return { success: false, error: 'Failed to create budget' };
  }
}

export async function deleteBudgetAction(budgetId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
  });

  if (!budget) {
    return { success: false, error: 'Budget not found' };
  }

  try {
    await prisma.budget.delete({
      where: { id: budgetId },
    });

    revalidatePath('/dashboard/budgets');
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteBudgetAction] Error:', error);
    return { success: false, error: 'Failed to delete budget' };
  }
}

export async function getBudgets(): Promise<(Budget & { _count: { categories: number; transactions: number } })[]> {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  return prisma.budget.findMany({
    where: { familyId: session.user.familyId, isActive: true },
    include: { _count: { select: { categories: true, transactions: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBudget(budgetId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  return prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
    include: {
      categories: { orderBy: { name: 'asc' } },
      transactions: { orderBy: { date: 'desc' }, take: 50 },
    },
  });
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function createCategoryAction(
  budgetId: string,
  formData: FormData
): Promise<ActionResult<{ categoryId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
  });

  if (!budget) {
    return { success: false, error: 'Budget not found' };
  }

  const rawData = {
    name: formData.get('name'),
    monthlyLimit: parseFloat(formData.get('monthlyLimit') as string),
    color: formData.get('color') || undefined,
    icon: formData.get('icon') || undefined,
  };

  const result = createCategorySchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const category = await prisma.budgetCategory.create({
      data: {
        budgetId,
        name: result.data.name,
        monthlyLimit: result.data.monthlyLimit,
        color: result.data.color,
        icon: result.data.icon,
      },
    });

    revalidatePath(`/dashboard/budgets/${budgetId}`);
    return { success: true, data: { categoryId: category.id } };
  } catch (error) {
    console.error('[createCategoryAction] Error:', error);
    return { success: false, error: 'Failed to create category' };
  }
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const category = await prisma.budgetCategory.findUnique({
    where: { id: categoryId },
    include: { budget: true },
  });

  if (!category || category.budget.familyId !== session.user.familyId) {
    return { success: false, error: 'Category not found' };
  }

  try {
    await prisma.budgetCategory.update({
      where: { id: categoryId },
      data: {
        name: formData.get('name') as string || category.name,
        monthlyLimit: parseFloat(formData.get('monthlyLimit') as string) || category.monthlyLimit,
        color: formData.get('color') as string || category.color,
        icon: formData.get('icon') as string || category.icon,
      },
    });

    revalidatePath(`/dashboard/budgets/${category.budgetId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updateCategoryAction] Error:', error);
    return { success: false, error: 'Failed to update category' };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const category = await prisma.budgetCategory.findUnique({
    where: { id: categoryId },
    include: { budget: true },
  });

  if (!category || category.budget.familyId !== session.user.familyId) {
    return { success: false, error: 'Category not found' };
  }

  try {
    await prisma.budgetCategory.delete({
      where: { id: categoryId },
    });

    revalidatePath(`/dashboard/budgets/${category.budgetId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteCategoryAction] Error:', error);
    return { success: false, error: 'Failed to delete category' };
  }
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export async function createTransactionAction(
  budgetId: string,
  formData: FormData
): Promise<ActionResult<{ transactionId: string }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!hasPermission(session.user.role, 'CREATE_TRANSACTION')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
  });

  if (!budget) {
    return { success: false, error: 'Budget not found' };
  }

  const rawData = {
    categoryId: formData.get('categoryId'),
    amount: parseFloat(formData.get('amount') as string),
    type: formData.get('type'),
    description: formData.get('description'),
    date: formData.get('date'),
  };

  const result = createTransactionSchema.safeParse(rawData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  try {
    const transaction = await prisma.transaction.create({
      data: {
        budgetId,
        categoryId: result.data.categoryId,
        userId: session.user.id,
        amount: result.data.amount,
        type: result.data.type as TransactionType,
        description: result.data.description,
        date: new Date(result.data.date),
        source: 'MANUAL' as TransactionSource,
      },
    });

    await createAuditLog({
      familyId: session.user.familyId,
      userId: session.user.id,
      event: AuditEvent.TRANSACTION_ADDED,
      targetType: 'Transaction',
      targetId: transaction.id,
      metadata: { amount: result.data.amount, category: result.data.categoryId },
    });

    // Check for budget alerts
    if (result.data.type === 'EXPENSE') {
      await checkBudgetAlerts(
        budgetId,
        result.data.categoryId,
        session.user.id,
        session.user.familyId
      );
    }

    revalidatePath(`/dashboard/budgets/${budgetId}`);
    return { success: true, data: { transactionId: transaction.id } };
  } catch (error) {
    console.error('[createTransactionAction] Error:', error);
    return { success: false, error: 'Failed to create transaction' };
  }
}

export async function deleteTransactionAction(transactionId: string): Promise<ActionResult<void>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.familyId) {
    return { success: false, error: 'Unauthorized' };
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { budget: true },
  });

  if (!transaction || transaction.budget.familyId !== session.user.familyId) {
    return { success: false, error: 'Transaction not found' };
  }

  // Only creator or managers can delete
  if (transaction.userId !== session.user.id && !hasPermission(session.user.role, 'MANAGE_BUDGETS')) {
    return { success: false, error: 'Insufficient permissions' };
  }

  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    revalidatePath(`/dashboard/budgets/${transaction.budgetId}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error('[deleteTransactionAction] Error:', error);
    return { success: false, error: 'Failed to delete transaction' };
  }
}

// ============================================================================
// BUDGET ALERTS
// ============================================================================

async function checkBudgetAlerts(
  budgetId: string,
  categoryId: string,
  userId: string,
  familyId: string
): Promise<void> {
  try {
    const category = await prisma.budgetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) return;

    // Get current month spending for this category
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlySpending = await prisma.transaction.aggregate({
      where: {
        budgetId,
        categoryId,
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
    });

    const spent = monthlySpending._sum.amount || 0;
    const percentUsed = Math.round((spent / category.monthlyLimit) * 100);

    // Check thresholds
    for (const threshold of ALERT_THRESHOLDS) {
      if (percentUsed >= threshold) {
        // Check if we already sent an alert for this threshold this month
        const existingAlerts = await prisma.notification.findMany({
          where: {
            userId,
            familyId,
            type: 'BUDGET_ALERT',
            createdAt: { gte: startOfMonth },
          },
        });
        
        const existingAlert = existingAlerts.find(alert => {
          const data = alert.data as { categoryId?: string } | null;
          return data?.categoryId === categoryId;
        });

        if (!existingAlert) {
          // Create in-app notification
          const notification = await prisma.notification.create({
            data: {
              userId,
              familyId,
              type: 'BUDGET_ALERT',
              title: `Budget Alert: ${category.name}`,
              message: `You've used ${percentUsed}% of your ${category.name} budget ($${spent.toFixed(2)} of $${category.monthlyLimit})`,
              data: {
                categoryId,
                budgetId,
                percentUsed,
                spent,
                limit: category.monthlyLimit,
              },
            },
          });

          // Send real-time notification
          await triggerUserNotification(userId, 'notification:new', notification);

          // Send email for high thresholds
          if (percentUsed >= 90) {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { email: true },
            });

            if (user?.email) {
              await sendBudgetAlertEmail(
                user.email,
                budgetId,
                category.name,
                spent,
                category.monthlyLimit,
                percentUsed
              );
            }
          }
        }
        
        break; // Only send one alert (highest threshold crossed)
      }
    }
  } catch (error) {
    console.error('[checkBudgetAlerts] Error:', error);
  }
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getBudgetSummary(budgetId: string) {
  const session = await auth();
  if (!session?.user?.familyId) return null;

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
    include: { categories: true },
  });

  if (!budget) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const transactions = await prisma.transaction.findMany({
    where: {
      budgetId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  const categorySpending: Record<string, { spent: number; limit: number; name: string; color: string | null }> = {};
  
  for (const cat of budget.categories) {
    categorySpending[cat.id] = {
      spent: 0,
      limit: cat.monthlyLimit,
      name: cat.name,
      color: cat.color,
    };
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpenses += tx.amount;
      if (categorySpending[tx.categoryId]) {
        categorySpending[tx.categoryId].spent += tx.amount;
      }
    }
  }

  const totalLimit = budget.categories.reduce((sum, c) => sum + c.monthlyLimit, 0);

  return {
    budget,
    totalIncome,
    totalExpenses,
    netFlow: totalIncome - totalExpenses,
    totalLimit,
    percentUsed: totalLimit > 0 ? Math.round((totalExpenses / totalLimit) * 100) : 0,
    categories: Object.values(categorySpending).map(c => ({
      ...c,
      percentUsed: c.limit > 0 ? Math.round((c.spent / c.limit) * 100) : 0,
      remaining: c.limit - c.spent,
    })),
  };
}

export async function getSpendingByCategory(budgetId: string, months: number = 6) {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
  });

  if (!budget) return [];

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const transactions = await prisma.transaction.findMany({
    where: {
      budgetId,
      type: 'EXPENSE',
      date: { gte: startDate },
    },
    include: { category: { select: { name: true, color: true } } },
  });

  // Group by category
  const byCategory: Record<string, { name: string; color: string | null; total: number }> = {};

  for (const tx of transactions) {
    const key = tx.categoryId;
    if (!byCategory[key]) {
      byCategory[key] = {
        name: tx.category.name,
        color: tx.category.color,
        total: 0,
      };
    }
    byCategory[key].total += tx.amount;
  }

  return Object.values(byCategory).sort((a, b) => b.total - a.total);
}

export async function getMonthlyTrend(budgetId: string, months: number = 12) {
  const session = await auth();
  if (!session?.user?.familyId) return [];

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, familyId: session.user.familyId },
  });

  if (!budget) return [];

  const results = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        budgetId,
        date: { gte: monthStart, lte: monthEnd },
      },
    });

    let income = 0;
    let expenses = 0;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') income += tx.amount;
      else if (tx.type === 'EXPENSE') expenses += tx.amount;
    }

    results.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income,
      expenses,
      net: income - expenses,
    });
  }

  return results;
}
