import { describe, it, expect } from 'vitest';
import { hasPermission, hasMinimumRole, canApproveWithdrawals, ROLE_HIERARCHY } from '@/lib/auth/rbac';
import type { Role } from '@prisma/client';

describe('RBAC', () => {
  describe('ROLE_HIERARCHY', () => {
    it('has correct hierarchy order', () => {
      expect(ROLE_HIERARCHY.OWNER).toBeGreaterThan(ROLE_HIERARCHY.TREASURER);
      expect(ROLE_HIERARCHY.TREASURER).toBeGreaterThan(ROLE_HIERARCHY.PLANNER);
      expect(ROLE_HIERARCHY.PLANNER).toBeGreaterThan(ROLE_HIERARCHY.MEMBER);
      expect(ROLE_HIERARCHY.MEMBER).toBeGreaterThan(ROLE_HIERARCHY.YOUTH);
      expect(ROLE_HIERARCHY.YOUTH).toBeGreaterThan(ROLE_HIERARCHY.GUEST);
    });
  });

  describe('hasPermission', () => {
    it('allows OWNER to manage family settings', () => {
      expect(hasPermission('OWNER' as Role, 'MANAGE_FAMILY_SETTINGS')).toBe(true);
    });

    it('denies TREASURER from managing family settings', () => {
      expect(hasPermission('TREASURER' as Role, 'MANAGE_FAMILY_SETTINGS')).toBe(false);
    });

    it('allows TREASURER to create pools', () => {
      expect(hasPermission('TREASURER' as Role, 'CREATE_POOL')).toBe(true);
    });

    it('denies MEMBER from creating pools', () => {
      expect(hasPermission('MEMBER' as Role, 'CREATE_POOL')).toBe(false);
    });

    it('allows MEMBER to contribute to pools', () => {
      expect(hasPermission('MEMBER' as Role, 'CONTRIBUTE_TO_POOL')).toBe(true);
    });

    it('denies YOUTH from contributing to pools', () => {
      expect(hasPermission('YOUTH' as Role, 'CONTRIBUTE_TO_POOL')).toBe(false);
    });

    it('allows YOUTH to view chat', () => {
      expect(hasPermission('YOUTH' as Role, 'VIEW_CHAT')).toBe(true);
    });

    it('denies GUEST from viewing DMs', () => {
      expect(hasPermission('GUEST' as Role, 'VIEW_DM')).toBe(false);
    });

    it('returns false for null role', () => {
      expect(hasPermission(null, 'VIEW_CHAT')).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasPermission(undefined, 'VIEW_CHAT')).toBe(false);
    });
  });

  describe('hasMinimumRole', () => {
    it('returns true when user role equals required role', () => {
      expect(hasMinimumRole('MEMBER' as Role, 'MEMBER' as Role)).toBe(true);
    });

    it('returns true when user role is higher than required', () => {
      expect(hasMinimumRole('OWNER' as Role, 'MEMBER' as Role)).toBe(true);
    });

    it('returns false when user role is lower than required', () => {
      expect(hasMinimumRole('GUEST' as Role, 'MEMBER' as Role)).toBe(false);
    });

    it('returns false for null role', () => {
      expect(hasMinimumRole(null, 'GUEST' as Role)).toBe(false);
    });
  });

  describe('canApproveWithdrawals', () => {
    it('returns true for OWNER', () => {
      expect(canApproveWithdrawals('OWNER' as Role)).toBe(true);
    });

    it('returns true for TREASURER', () => {
      expect(canApproveWithdrawals('TREASURER' as Role)).toBe(true);
    });

    it('returns false for PLANNER', () => {
      expect(canApproveWithdrawals('PLANNER' as Role)).toBe(false);
    });

    it('returns false for MEMBER', () => {
      expect(canApproveWithdrawals('MEMBER' as Role)).toBe(false);
    });

    it('returns false for null', () => {
      expect(canApproveWithdrawals(null)).toBe(false);
    });
  });
});
