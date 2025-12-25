import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

describe('Auth Integration Tests', () => {
  const testEmail = `test-${Date.now()}@integration.test`;
  let testUserId: string | null = null;

  afterEach(async () => {
    // Clean up test user
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      testUserId = null;
    }
  });

  describe('User Creation', () => {
    it('should create a user with hashed password', async () => {
      const passwordHash = await bcrypt.hash('TestPassword123', 12);
      
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Integration Test User',
          passwordHash,
        },
      });

      testUserId = user.id;

      expect(user.id).toBeDefined();
      expect(user.email).toBe(testEmail);
      expect(user.name).toBe('Integration Test User');
      expect(user.passwordHash).not.toBe('TestPassword123');
      expect(await bcrypt.compare('TestPassword123', user.passwordHash!)).toBe(true);
    });

    it('should enforce unique email constraint', async () => {
      const passwordHash = await bcrypt.hash('TestPassword123', 12);
      
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'First User',
          passwordHash,
        },
      });
      testUserId = user.id;

      await expect(
        prisma.user.create({
          data: {
            email: testEmail,
            name: 'Duplicate User',
            passwordHash,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Guest User', () => {
    it('should create a guest user with token', async () => {
      const guestToken = 'test-guest-token-' + Date.now();
      const guestExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const guestUser = await prisma.user.create({
        data: {
          email: `guest-${Date.now()}@guest.familypowerhouse.app`,
          name: 'Guest User',
          isGuest: true,
          guestToken,
          guestExpiresAt,
        },
      });

      testUserId = guestUser.id;

      expect(guestUser.isGuest).toBe(true);
      expect(guestUser.guestToken).toBe(guestToken);
      expect(guestUser.guestExpiresAt).toEqual(guestExpiresAt);
    });

    it('should find guest user by token', async () => {
      const guestToken = 'unique-guest-token-' + Date.now();

      const created = await prisma.user.create({
        data: {
          email: `guest-${Date.now()}@guest.familypowerhouse.app`,
          name: 'Guest User',
          isGuest: true,
          guestToken,
          guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      testUserId = created.id;

      const found = await prisma.user.findUnique({
        where: { guestToken },
      });

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('Family and Membership', () => {
    it('should create a family with owner membership', async () => {
      // Create user first
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Family Owner',
          passwordHash: await bcrypt.hash('TestPassword123', 12),
        },
      });
      testUserId = user.id;

      // Create family with membership
      const family = await prisma.family.create({
        data: {
          name: 'Test Family',
          slug: `test-family-${Date.now()}`,
          memberships: {
            create: {
              userId: user.id,
              role: 'OWNER',
              status: 'ACTIVE',
            },
          },
        },
        include: {
          memberships: true,
        },
      });

      expect(family.name).toBe('Test Family');
      expect(family.memberships).toHaveLength(1);
      expect(family.memberships[0].role).toBe('OWNER');
      expect(family.memberships[0].userId).toBe(user.id);

      // Cleanup family
      await prisma.family.delete({ where: { id: family.id } });
    });
  });
});
