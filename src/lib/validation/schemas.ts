import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// FAMILY SCHEMAS
// ============================================================================

export const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').max(100),
  description: z.string().max(500).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['TREASURER', 'PLANNER', 'MEMBER', 'YOUTH', 'GUEST']),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().cuid(),
  role: z.enum(['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH', 'GUEST']),
});

// ============================================================================
// POOL SCHEMAS
// ============================================================================

export const createPoolSchema = z.object({
  name: z.string().min(1, 'Pool name is required').max(100),
  type: z.enum(['TRIP', 'EMERGENCY', 'VENTURE', 'CUSTOM']),
  description: z.string().max(1000).optional(),
  targetAmount: z.number().positive('Target amount must be positive').max(1000000),
  deadline: z.date().optional(),
  tripId: z.string().cuid().optional(),
});

export const contributeToPoolSchema = z.object({
  poolId: z.string().cuid(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['ONE_TIME', 'RECURRING', 'PLEDGE']).default('ONE_TIME'),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});

export const withdrawalRequestSchema = z.object({
  poolId: z.string().cuid(),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required').max(500),
});

export const approvalDecisionSchema = z.object({
  withdrawalRequestId: z.string().cuid(),
  decision: z.enum(['APPROVED', 'REJECTED']),
  comment: z.string().max(500).optional(),
});

// ============================================================================
// BUDGET SCHEMAS
// ============================================================================

export const createBudgetSchema = z.object({
  name: z.string().min(1, 'Budget name is required').max(100),
  type: z.enum(['HOUSEHOLD', 'PERSONAL', 'POOL']),
  startDate: z.date(),
  endDate: z.date().optional(),
});

export const createCategorySchema = z.object({
  budgetId: z.string().cuid(),
  name: z.string().min(1, 'Category name is required').max(50),
  monthlyLimit: z.number().positive('Limit must be positive'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().cuid().optional(),
});

export const createTransactionSchema = z.object({
  budgetId: z.string().cuid(),
  categoryId: z.string().cuid(),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().min(1, 'Description is required').max(200),
  date: z.date(),
  isRecurring: z.boolean().default(false),
});

// ============================================================================
// TRIP SCHEMAS
// ============================================================================

export const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(100),
  destination: z.string().min(1, 'Destination is required').max(200),
  description: z.string().max(1000).optional(),
  startDate: z.date(),
  endDate: z.date(),
  createPool: z.boolean().default(false),
  targetBudget: z.number().positive().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const createItineraryItemSchema = z.object({
  tripDayId: z.string().cuid(),
  title: z.string().min(1, 'Title is required').max(100),
  type: z.enum(['FLIGHT', 'TRANSPORT', 'LODGING', 'ACTIVITY', 'MEAL', 'OTHER']),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  location: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  cost: z.number().nonnegative().optional(),
});

export const tripVoteSchema = z.object({
  tripId: z.string().cuid(),
  type: z.enum(['DESTINATION', 'LODGING', 'ACTIVITY']),
  optionId: z.string().min(1),
});

// ============================================================================
// VENTURE SCHEMAS
// ============================================================================

export const createVentureSchema = z.object({
  name: z.string().min(1, 'Venture name is required').max(100),
  purpose: z.string().min(1, 'Purpose is required').max(200),
  description: z.string().max(2000).optional(),
  stage: z.enum(['IDEA', 'RESEARCH', 'DEVELOPMENT', 'LAUNCHED', 'SCALING', 'PAUSED', 'CLOSED']).default('IDEA'),
});

export const createMilestoneSchema = z.object({
  ventureId: z.string().cuid(),
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  dueDate: z.date().optional(),
});

export const createLeadSchema = z.object({
  ventureId: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['CLIENT', 'PARTNER', 'VENDOR', 'MARKET', 'OTHER']),
  stage: z.enum(['PROSPECT', 'CONTACTED', 'QUALIFYING', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('PROSPECT'),
  notes: z.string().max(2000).optional(),
  nextFollowUp: z.date().optional(),
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const createChannelSchema = z.object({
  name: z.string().min(1, 'Channel name is required').max(50).regex(/^[a-z0-9-]+$/, 'Channel name must be lowercase alphanumeric with hyphens'),
  type: z.enum(['PUBLIC', 'PRIVATE', 'ANNOUNCEMENT']).default('PUBLIC'),
  description: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  channelId: z.string().cuid(),
  content: z.string().min(1, 'Message cannot be empty').max(4000),
  parentId: z.string().cuid().optional(),
});

export const reactionSchema = z.object({
  messageId: z.string().cuid(),
  emoji: z.string().min(1).max(10),
});

// ============================================================================
// HABIT SCHEMAS
// ============================================================================

export const createHabitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(100),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  targetCount: z.number().int().positive().default(1),
});

export const logHabitSchema = z.object({
  habitId: z.string().cuid(),
  date: z.date(),
  count: z.number().int().positive().default(1),
  notes: z.string().max(500).optional(),
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  tripId: z.string().cuid().optional(),
  ventureId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.date().optional(),
});

// ============================================================================
// PAGINATION
// ============================================================================

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreatePoolInput = z.infer<typeof createPoolSchema>;
export type ContributeToPoolInput = z.infer<typeof contributeToPoolSchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;
export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type CreateVentureInput = z.infer<typeof createVentureSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
