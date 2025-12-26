'use server';

import { prisma, AuditEvent } from '@/lib/db';
import { signIn } from '@/lib/auth/config';
import { v4 as uuidv4 } from 'uuid';
import { redirect } from 'next/navigation';

const GUEST_EXPIRY_HOURS = 48;
const DEMO_FAMILY_NAMES = [
  'The Johnsons', 'The Smiths', 'The Williams', 'The Browns', 
  'The Garcias', 'The Millers', 'The Davises', 'The Wilsons'
];

function generateGuestEmail(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `guest-${timestamp}-${random}@demo.familypowerhouse.app`;
}

function generateGuestName(): string {
  const adjectives = ['Happy', 'Curious', 'Brave', 'Clever', 'Kind', 'Swift', 'Wise', 'Bold'];
  const nouns = ['Explorer', 'Pioneer', 'Voyager', 'Adventurer', 'Dreamer', 'Builder', 'Creator', 'Leader'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

function generateFamilySlug(): string {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export async function createGuestSession(): Promise<{ success: boolean; error?: string }> {
  try {
    const guestToken = uuidv4();
    const guestEmail = generateGuestEmail();
    const guestName = generateGuestName();
    const familyName = DEMO_FAMILY_NAMES[Math.floor(Math.random() * DEMO_FAMILY_NAMES.length)];
    const familySlug = generateFamilySlug();
    const expiresAt = new Date(Date.now() + GUEST_EXPIRY_HOURS * 60 * 60 * 1000);

    // Create guest user, demo family, and seed data in a transaction
    const { user, family } = await prisma.$transaction(async (tx) => {
      // Create the guest user
      const user = await tx.user.create({
        data: {
          email: guestEmail,
          name: guestName,
          isGuest: true,
          guestToken,
          guestExpiresAt: expiresAt,
          emailVerified: new Date(),
        },
      });

      // Create demo family
      const family = await tx.family.create({
        data: {
          name: familyName,
          slug: familySlug,
          description: 'Your demo family - explore all features!',
          settings: {
            isDemo: true,
            createdBy: user.id,
          },
        },
      });

      // Create membership as OWNER so guest can explore all features
      await tx.membership.create({
        data: {
          userId: user.id,
          familyId: family.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      // Create demo family members (simulated)
      const demoMembers = await Promise.all([
        tx.user.create({
          data: {
            email: `demo-parent-${familySlug}@demo.familypowerhouse.app`,
            name: 'Alex (Demo Parent)',
            isGuest: true,
            guestToken: uuidv4(),
            guestExpiresAt: expiresAt,
            emailVerified: new Date(),
          },
        }),
        tx.user.create({
          data: {
            email: `demo-teen-${familySlug}@demo.familypowerhouse.app`,
            name: 'Jordan (Demo Teen)',
            isGuest: true,
            guestToken: uuidv4(),
            guestExpiresAt: expiresAt,
            emailVerified: new Date(),
          },
        }),
      ]);

      // Add demo members to family
      await tx.membership.createMany({
        data: [
          { userId: demoMembers[0].id, familyId: family.id, role: 'TREASURER', status: 'ACTIVE' },
          { userId: demoMembers[1].id, familyId: family.id, role: 'YOUTH', status: 'ACTIVE' },
        ],
      });

      // Create default chat channel
      const generalChannel = await tx.channel.create({
        data: {
          familyId: family.id,
          name: 'general',
          type: 'PUBLIC',
          description: 'Family discussions',
          isDefault: true,
        },
      });

      // Seed welcome messages
      await tx.message.createMany({
        data: [
          {
            channelId: generalChannel.id,
            senderId: demoMembers[0].id,
            content: "Welcome to Family Powerhouse! 🎉 This is your demo family where you can explore all features.",
            type: 'TEXT',
          },
          {
            channelId: generalChannel.id,
            senderId: demoMembers[1].id,
            content: "Try creating a savings pool for our next vacation! 🏖️",
            type: 'TEXT',
          },
        ],
      });

      // Create sample pools
      const vacationPool = await tx.pool.create({
        data: {
          familyId: family.id,
          createdById: demoMembers[0].id,
          name: 'Summer Vacation Fund',
          type: 'TRIP',
          description: 'Saving for our beach trip in August!',
          targetAmount: 3000,
          currentAmount: 1250,
          status: 'ACTIVE',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      });

      const emergencyPool = await tx.pool.create({
        data: {
          familyId: family.id,
          createdById: demoMembers[0].id,
          name: 'Emergency Fund',
          type: 'EMERGENCY',
          description: 'Family safety net for unexpected expenses',
          targetAmount: 10000,
          currentAmount: 4500,
          status: 'ACTIVE',
        },
      });

      // Add sample contributions
      await tx.contribution.createMany({
        data: [
          {
            poolId: vacationPool.id,
            userId: demoMembers[0].id,
            amount: 500,
            type: 'ONE_TIME',
            status: 'COMPLETED',
            idempotencyKey: `demo-contrib-1-${familySlug}`,
          },
          {
            poolId: vacationPool.id,
            userId: demoMembers[1].id,
            amount: 250,
            type: 'ONE_TIME',
            status: 'COMPLETED',
            idempotencyKey: `demo-contrib-2-${familySlug}`,
          },
          {
            poolId: vacationPool.id,
            userId: user.id,
            amount: 500,
            type: 'ONE_TIME',
            status: 'COMPLETED',
            idempotencyKey: `demo-contrib-3-${familySlug}`,
          },
          {
            poolId: emergencyPool.id,
            userId: demoMembers[0].id,
            amount: 2500,
            type: 'ONE_TIME',
            status: 'COMPLETED',
            idempotencyKey: `demo-contrib-4-${familySlug}`,
          },
          {
            poolId: emergencyPool.id,
            userId: user.id,
            amount: 2000,
            type: 'ONE_TIME',
            status: 'COMPLETED',
            idempotencyKey: `demo-contrib-5-${familySlug}`,
          },
        ],
      });

      // Create sample trip
      const trip = await tx.trip.create({
        data: {
          familyId: family.id,
          createdById: demoMembers[0].id,
          poolId: vacationPool.id,
          name: 'Beach Getaway 2025',
          destination: 'Cancun, Mexico',
          startDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 107 * 24 * 60 * 60 * 1000),
          status: 'PLANNING',
          preferences: {
            travelStyle: 'relaxed',
            accommodation: 'resort',
          },
        },
      });

      // Add travelers
      await tx.tripTraveler.createMany({
        data: [
          { tripId: trip.id, userId: user.id, status: 'CONFIRMED' },
          { tripId: trip.id, userId: demoMembers[0].id, status: 'CONFIRMED' },
          { tripId: trip.id, userId: demoMembers[1].id, status: 'CONFIRMED' },
        ],
      });

      // Create trip budget items
      await tx.tripBudgetItem.createMany({
        data: [
          { tripId: trip.id, category: 'LODGING', planned: 1200 },
          { tripId: trip.id, category: 'TRAVEL', planned: 800 },
          { tripId: trip.id, category: 'FOOD', planned: 500 },
          { tripId: trip.id, category: 'ACTIVITIES', planned: 400 },
          { tripId: trip.id, category: 'BUFFER', planned: 100 },
        ],
      });

      // Create sample tasks
      await tx.task.createMany({
        data: [
          {
            familyId: family.id,
            tripId: trip.id,
            createdById: demoMembers[0].id,
            assigneeId: user.id,
            title: 'Research flight options',
            description: 'Compare prices for direct flights',
            status: 'TODO',
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
          {
            familyId: family.id,
            tripId: trip.id,
            createdById: demoMembers[0].id,
            assigneeId: demoMembers[0].id,
            title: 'Book resort',
            description: 'Find all-inclusive options',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          },
          {
            familyId: family.id,
            tripId: trip.id,
            createdById: user.id,
            assigneeId: demoMembers[1].id,
            title: 'Create packing list',
            status: 'TODO',
            priority: 'MEDIUM',
            dueDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      // Create sample venture
      await tx.venture.create({
        data: {
          familyId: family.id,
          createdById: demoMembers[0].id,
          name: 'Family Etsy Shop',
          purpose: 'Sell handmade crafts online',
          stage: 'RESEARCH',
          description: 'Exploring the idea of starting an Etsy shop selling handmade jewelry and crafts.',
        },
      });

      // Create sample budget
      const budget = await tx.budget.create({
        data: {
          familyId: family.id,
          name: 'Monthly Household',
          type: 'HOUSEHOLD',
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
          isActive: true,
        },
      });

      // Add budget categories
      await tx.budgetCategory.createMany({
        data: [
          { budgetId: budget.id, name: 'Groceries', monthlyLimit: 800, color: '#4CAF50' },
          { budgetId: budget.id, name: 'Utilities', monthlyLimit: 300, color: '#2196F3' },
          { budgetId: budget.id, name: 'Entertainment', monthlyLimit: 200, color: '#FF9800' },
          { budgetId: budget.id, name: 'Dining Out', monthlyLimit: 250, color: '#E91E63' },
        ],
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          familyId: family.id,
          userId: user.id,
          event: AuditEvent.FAMILY_CREATED,
          targetType: 'Family',
          targetId: family.id,
          metadata: { isDemo: true, guestSession: true },
        },
      });

      return { user, family };
    });

    // Sign in the guest user using the guest token
    await signIn('credentials', {
      email: user.email,
      password: guestToken, // Guest token acts as password
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create guest session:', error);
    return { success: false, error: 'Failed to create demo session' };
  }
}

export async function upgradeGuestAccount(
  userId: string,
  email: string,
  password: string,
  name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const bcrypt = await import('bcryptjs');
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { family: true } } },
    });

    if (!user || !user.isGuest) {
      return { success: false, error: 'Invalid user' };
    }

    // Check if email is already taken by a non-guest
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: 'Email already in use' };
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      // Upgrade user
      await tx.user.update({
        where: { id: userId },
        data: {
          email,
          name: name || user.name,
          passwordHash,
          isGuest: false,
          guestToken: null,
          guestExpiresAt: null,
        },
      });

      // Update family to not be demo anymore
      if (user.memberships[0]?.family) {
        const settings = user.memberships[0].family.settings as Record<string, unknown>;
        await tx.family.update({
          where: { id: user.memberships[0].familyId },
          data: {
            settings: {
              ...settings,
              isDemo: false,
              upgradedAt: new Date().toISOString(),
            },
          },
        });
      }

      // Audit
      if (user.memberships[0]) {
        await tx.auditLog.create({
          data: {
            familyId: user.memberships[0].familyId,
            userId: user.id,
            event: AuditEvent.PASSWORD_CHANGE,
            targetType: 'User',
            targetId: user.id,
            metadata: { action: 'guest_upgrade' },
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to upgrade guest account:', error);
    return { success: false, error: 'Failed to upgrade account' };
  }
}

export async function cleanupExpiredGuests(): Promise<{ deleted: number }> {
  const result = await prisma.$transaction(async (tx) => {
    // Find expired guest users
    const expiredGuests = await tx.user.findMany({
      where: {
        isGuest: true,
        guestExpiresAt: { lt: new Date() },
      },
      select: { id: true },
    });

    if (expiredGuests.length === 0) {
      return { deleted: 0 };
    }

    const userIds = expiredGuests.map((u) => u.id);

    // Find demo families created by these users
    const demoFamilies = await tx.family.findMany({
      where: {
        settings: { path: ['isDemo'], equals: true },
        memberships: { some: { userId: { in: userIds }, role: 'OWNER' } },
      },
      select: { id: true },
    });

    // Delete families (cascades to all related data)
    if (demoFamilies.length > 0) {
      await tx.family.deleteMany({
        where: { id: { in: demoFamilies.map((f) => f.id) } },
      });
    }

    // Delete guest users
    await tx.user.deleteMany({
      where: { id: { in: userIds } },
    });

    return { deleted: expiredGuests.length };
  });

  return result;
}
