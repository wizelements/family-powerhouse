import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  TREASURER: 80,
  PLANNER: 60,
  MEMBER: 40,
  YOUTH: 20,
  GUEST: 10,
};

export const PERMISSIONS = {
  // Family management
  MANAGE_FAMILY_SETTINGS: ['OWNER'],
  MANAGE_MEMBERS: ['OWNER'],
  INVITE_MEMBERS: ['OWNER', 'TREASURER'],
  
  // Financial
  CREATE_POOL: ['OWNER', 'TREASURER'],
  EDIT_POOL: ['OWNER', 'TREASURER'],
  DELETE_POOL: ['OWNER'],
  CONTRIBUTE_TO_POOL: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER'],
  REQUEST_WITHDRAWAL: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER'],
  APPROVE_WITHDRAWAL: ['OWNER', 'TREASURER'],
  VIEW_POOL: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH'],
  
  // Budget
  MANAGE_BUDGETS: ['OWNER', 'TREASURER'],
  CREATE_TRANSACTION: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER'],
  VIEW_BUDGET: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH'],
  
  // Trips
  CREATE_TRIP: ['OWNER', 'TREASURER', 'PLANNER'],
  EDIT_TRIP: ['OWNER', 'TREASURER', 'PLANNER'],
  DELETE_TRIP: ['OWNER', 'TREASURER'],
  VIEW_TRIP: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH', 'GUEST'],
  
  // Ventures
  CREATE_VENTURE: ['OWNER', 'TREASURER', 'PLANNER'],
  EDIT_VENTURE: ['OWNER', 'TREASURER', 'PLANNER'],
  DELETE_VENTURE: ['OWNER'],
  VIEW_VENTURE: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH'],
  
  // Chat
  SEND_MESSAGE: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH'],
  DELETE_ANY_MESSAGE: ['OWNER', 'TREASURER'],
  CREATE_CHANNEL: ['OWNER', 'TREASURER'],
  VIEW_CHAT: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER', 'YOUTH', 'GUEST'],
  VIEW_DM: ['OWNER', 'TREASURER', 'PLANNER', 'MEMBER'],
  
  // Moderation
  MODERATE_CONTENT: ['OWNER', 'TREASURER'],
  VIEW_AUDIT_LOGS: ['OWNER'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function hasMinimumRole(userRole: Role | null | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canApproveWithdrawals(role: Role | null | undefined): boolean {
  return hasPermission(role, 'APPROVE_WITHDRAWAL');
}

export function getApproverRoles(): Role[] {
  return [...PERMISSIONS.APPROVE_WITHDRAWAL] as Role[];
}

export function isGuestRole(role: Role | null | undefined): boolean {
  return role === 'GUEST';
}

const GUEST_PERMISSIONS: Permission[] = ['VIEW_TRIP', 'VIEW_CHAT'];

export function getGuestPermissions(): Permission[] {
  return [...GUEST_PERMISSIONS];
}

const READ_ONLY_PERMISSIONS: Permission[] = [
  'VIEW_POOL',
  'VIEW_BUDGET',
  'VIEW_TRIP',
  'VIEW_VENTURE',
  'VIEW_CHAT',
  'VIEW_DM',
  'VIEW_AUDIT_LOGS',
];

export function isReadOnlyPermission(permission: Permission): boolean {
  return READ_ONLY_PERMISSIONS.includes(permission);
}
