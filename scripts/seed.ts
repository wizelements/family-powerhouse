import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.charterSignoff.deleteMany(),
    prisma.familyCharterVersion.deleteMany(),
    prisma.habitLog.deleteMany(),
    prisma.habit.deleteMany(),
    prisma.scoreboardEntry.deleteMany(),
    prisma.task.deleteMany(),
    prisma.vote.deleteMany(),
    prisma.tripBudgetItem.deleteMany(),
    prisma.itineraryItem.deleteMany(),
    prisma.tripDay.deleteMany(),
    prisma.tripTraveler.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.ventureFinancial.deleteMany(),
    prisma.ventureMilestone.deleteMany(),
    prisma.ventureOwner.deleteMany(),
    prisma.opportunityLead.deleteMany(),
    prisma.venture.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.budgetRule.deleteMany(),
    prisma.budgetCategory.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.ledgerEntry.deleteMany(),
    prisma.approval.deleteMany(),
    prisma.withdrawalRequest.deleteMany(),
    prisma.contribution.deleteMany(),
    prisma.pool.deleteMany(),
    prisma.reaction.deleteMany(),
    prisma.mention.deleteMany(),
    prisma.messageReport.deleteMany(),
    prisma.fileAttachment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.channel.deleteMany(),
    prisma.invite.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.family.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('🧹 Cleaned existing data');

  // Create test users
  const passwordHash = await bcrypt.hash('TestPassword123', 12);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@test.com',
      name: 'Family Owner',
      passwordHash,
    },
  });

  const treasurer = await prisma.user.create({
    data: {
      email: 'treasurer@test.com',
      name: 'Family Treasurer',
      passwordHash,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'member@test.com',
      name: 'Family Member',
      passwordHash,
    },
  });

  console.log('👤 Created test users');

  // Create family
  const family = await prisma.family.create({
    data: {
      name: 'Test Family',
      slug: 'test-family-abc123',
      description: 'A test family for development',
    },
  });

  console.log('🏠 Created test family');

  // Create memberships
  await prisma.membership.createMany({
    data: [
      { userId: owner.id, familyId: family.id, role: 'OWNER' },
      { userId: treasurer.id, familyId: family.id, role: 'TREASURER' },
      { userId: member.id, familyId: family.id, role: 'MEMBER' },
    ],
  });

  console.log('🤝 Created memberships');

  // Create channels
  await prisma.channel.createMany({
    data: [
      { familyId: family.id, name: 'general', type: 'PUBLIC', isDefault: true },
      { familyId: family.id, name: 'announcements', type: 'ANNOUNCEMENT' },
      { familyId: family.id, name: 'trips', type: 'PUBLIC' },
      { familyId: family.id, name: 'ventures', type: 'PUBLIC' },
    ],
  });

  console.log('💬 Created channels');

  // Create pools
  const tripPool = await prisma.pool.create({
    data: {
      familyId: family.id,
      createdById: owner.id,
      name: 'Summer Vacation 2025',
      type: 'TRIP',
      description: 'Saving for our beach vacation',
      targetAmount: 5000,
      currentAmount: 1500,
      deadline: new Date('2025-06-01'),
    },
  });

  const emergencyPool = await prisma.pool.create({
    data: {
      familyId: family.id,
      createdById: treasurer.id,
      name: 'Emergency Fund',
      type: 'EMERGENCY',
      description: 'Family emergency savings',
      targetAmount: 10000,
      currentAmount: 3000,
    },
  });

  console.log('💰 Created pools');

  // Create budget
  const budget = await prisma.budget.create({
    data: {
      familyId: family.id,
      name: 'Household Budget 2025',
      type: 'HOUSEHOLD',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  await prisma.budgetCategory.createMany({
    data: [
      { budgetId: budget.id, name: 'Housing', monthlyLimit: 2000, color: '#3B82F6' },
      { budgetId: budget.id, name: 'Food', monthlyLimit: 800, color: '#10B981' },
      { budgetId: budget.id, name: 'Transportation', monthlyLimit: 400, color: '#F59E0B' },
      { budgetId: budget.id, name: 'Entertainment', monthlyLimit: 200, color: '#8B5CF6' },
      { budgetId: budget.id, name: 'Savings', monthlyLimit: 500, color: '#EC4899' },
    ],
  });

  console.log('📊 Created budget with categories');

  // Create trip
  const trip = await prisma.trip.create({
    data: {
      familyId: family.id,
      createdById: owner.id,
      poolId: tripPool.id,
      name: 'Beach Vacation',
      destination: 'Miami, FL',
      description: 'Annual family beach trip',
      startDate: new Date('2025-06-15'),
      endDate: new Date('2025-06-22'),
      status: 'PLANNING',
    },
  });

  await prisma.tripTraveler.createMany({
    data: [
      { tripId: trip.id, userId: owner.id, status: 'CONFIRMED' },
      { tripId: trip.id, userId: treasurer.id, status: 'CONFIRMED' },
      { tripId: trip.id, userId: member.id, status: 'MAYBE' },
    ],
  });

  console.log('✈️ Created trip');

  // Create venture
  const venture = await prisma.venture.create({
    data: {
      familyId: family.id,
      createdById: owner.id,
      name: 'Family Bakery',
      purpose: 'Start a home-based bakery business',
      stage: 'RESEARCH',
      description: 'Exploring opportunities in the local bakery market',
    },
  });

  await prisma.ventureOwner.create({
    data: {
      ventureId: venture.id,
      userId: owner.id,
      role: 'Lead',
    },
  });

  await prisma.ventureMilestone.createMany({
    data: [
      { ventureId: venture.id, title: 'Market Research', status: 'IN_PROGRESS' },
      { ventureId: venture.id, title: 'Business Plan', status: 'NOT_STARTED' },
      { ventureId: venture.id, title: 'Initial Investment', status: 'NOT_STARTED' },
    ],
  });

  console.log('🚀 Created venture');

  // Create habits
  await prisma.habit.createMany({
    data: [
      { userId: owner.id, familyId: family.id, name: 'Morning Exercise', frequency: 'DAILY', targetCount: 1 },
      { userId: member.id, familyId: family.id, name: 'Read 30 minutes', frequency: 'DAILY', targetCount: 1 },
      { userId: treasurer.id, familyId: family.id, name: 'Review Finances', frequency: 'WEEKLY', targetCount: 1 },
    ],
  });

  console.log('🎯 Created habits');

  console.log('✅ Seed completed successfully!');
  console.log('\nTest Accounts:');
  console.log('  Owner: owner@test.com / TestPassword123');
  console.log('  Treasurer: treasurer@test.com / TestPassword123');
  console.log('  Member: member@test.com / TestPassword123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
