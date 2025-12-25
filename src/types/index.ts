import type { Role } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  familyId: string | null;
  role: Role | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApprovalConfig {
  requiredApprovers: number;
  approverRoles: Role[];
  amountThreshold?: number;
}

export interface PoolBalance {
  poolId: string;
  currentAmount: number;
  targetAmount: number;
  percentComplete: number;
  contributorsCount: number;
}

export interface BudgetSummary {
  budgetId: string;
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
}

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };
