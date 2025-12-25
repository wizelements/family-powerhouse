import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Demo family slug - used to find the demo family for guest access
export const DEMO_FAMILY_SLUG = 'demo-family';

async function main() {
  console.log('🌱 Seeding demo family for guest access...');

  // Check if demo family already exists
  const existingFamily = await prisma.family.findUnique({
    where: { slug: DEMO_FAMILY_SLUG },
  });

  if (existingFamily) {
    console.log('✅ Demo family already exists');
    return;
  }

  // Create demo owner user
  const passwordHash = await bcrypt.hash('DemoPassword123!', 12);

  const demoOwner = await prisma.user.create({
    data: {
      email: 'demo-owner@familypowerhouse.app',
      name: 'Demo Owner',
      passwordHash,
    },
  });

  console.log('👤 Created demo owner');

  // Create demo family
  const family = await prisma.family.create({
    data: {
      name: 'Demo Family',
      slug: DEMO_FAMILY_SLUG,
      description: 'A sample family to explore Family Powerhouse features',
    },
  });

  console.log('🏠 Created demo family');

  // Create owner membership
  await prisma.membership.create({
    data: {
      userId: demoOwner.id,
      familyId: family.id,
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  console.log('🤝 Created owner membership');

  // Create channels
  await prisma.channel.createMany({
    data: [
      { familyId: family.id, name: 'general', type: 'PUBLIC', isDefault: true },
      { familyId: family.id, name: 'announcements', type: 'ANNOUNCEMENT' },
      { familyId: family.id, name: 'trip-planning', type: 'PUBLIC' },
    ],
  });

  console.log('💬 Created channels');

  // Create sample pools
  await prisma.pool.createMany({
    data: [
      {
        familyId: family.id,
        createdById: demoOwner.id,
        name: 'Hawaii Vacation 2025',
        type: 'TRIP',
        description: 'Family trip to Hawaii - saving up for an amazing adventure!',
        targetAmount: 8000,
        currentAmount: 3500,
        deadline: new Date('2025-08-01'),
      },
      {
        familyId: family.id,
        createdById: demoOwner.id,
        name: 'Emergency Fund',
        type: 'EMERGENCY',
        description: '6-month emergency fund goal',
        targetAmount: 15000,
        currentAmount: 7500,
      },
      {
        familyId: family.id,
        createdById: demoOwner.id,
        name: 'New Car Fund',
        type: 'CUSTOM',
        description: 'Saving for a family vehicle upgrade',
        targetAmount: 25000,
        currentAmount: 12000,
        deadline: new Date('2025-12-31'),
      },
    ],
  });

  console.log('💰 Created sample pools');

  // Get pools for trip linking
  const tripPool = await prisma.pool.findFirst({
    where: { familyId: family.id, name: 'Hawaii Vacation 2025' },
  });

  // Create sample trips
  await prisma.trip.createMany({
    data: [
      {
        familyId: family.id,
        createdById: demoOwner.id,
        poolId: tripPool?.id,
        name: 'Hawaii Adventure',
        destination: 'Honolulu, Hawaii',
        description: 'Week-long family vacation exploring the islands',
        startDate: new Date('2025-08-15'),
        endDate: new Date('2025-08-22'),
        status: 'PLANNING',
      },
      {
        familyId: family.id,
        createdById: demoOwner.id,
        name: 'Thanksgiving Gathering',
        destination: "Grandma's House, Boston",
        description: 'Annual family Thanksgiving celebration',
        startDate: new Date('2025-11-27'),
        endDate: new Date('2025-11-30'),
        status: 'PLANNING',
      },
    ],
  });

  console.log('✈️ Created sample trips');

  // Create sample budget
  const budget = await prisma.budget.create({
    data: {
      familyId: family.id,
      name: 'Monthly Household Budget',
      type: 'HOUSEHOLD',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  await prisma.budgetCategory.createMany({
    data: [
      { budgetId: budget.id, name: 'Housing', monthlyLimit: 2500, color: '#3B82F6' },
      { budgetId: budget.id, name: 'Groceries', monthlyLimit: 600, color: '#10B981' },
      { budgetId: budget.id, name: 'Transportation', monthlyLimit: 400, color: '#F59E0B' },
      { budgetId: budget.id, name: 'Entertainment', monthlyLimit: 300, color: '#8B5CF6' },
      { budgetId: budget.id, name: 'Dining Out', monthlyLimit: 200, color: '#EC4899' },
      { budgetId: budget.id, name: 'Subscriptions', monthlyLimit: 100, color: '#6366F1' },
    ],
  });

  console.log('📊 Created sample budget');

  // Create sample venture
  await prisma.venture.create({
    data: {
      familyId: family.id,
      createdById: demoOwner.id,
      name: 'Family Food Truck',
      purpose: 'Starting a weekend food truck business',
      stage: 'RESEARCH',
      description: 'Exploring the local food truck market for potential family business',
    },
  });

  console.log('🚀 Created sample venture');

  // Create sample habits
  await prisma.habit.createMany({
    data: [
      { userId: demoOwner.id, familyId: family.id, name: 'Family Dinner', frequency: 'DAILY', targetCount: 1, isActive: true },
      { userId: demoOwner.id, familyId: family.id, name: 'Budget Review', frequency: 'WEEKLY', targetCount: 1, isActive: true },
      { userId: demoOwner.id, familyId: family.id, name: 'Game Night', frequency: 'WEEKLY', targetCount: 1, isActive: true },
    ],
  });

  console.log('🎯 Created sample habits');

  // Create sample tasks
  await prisma.task.createMany({
    data: [
      { familyId: family.id, createdById: demoOwner.id, title: 'Book Hawaii flights', status: 'TODO', priority: 'HIGH', dueDate: new Date('2025-06-01') },
      { familyId: family.id, createdById: demoOwner.id, title: 'Research hotels in Honolulu', status: 'IN_PROGRESS', priority: 'MEDIUM' },
      { familyId: family.id, createdById: demoOwner.id, title: 'Update car insurance', status: 'TODO', priority: 'LOW', dueDate: new Date('2025-04-15') },
      { familyId: family.id, createdById: demoOwner.id, title: 'Plan Thanksgiving menu', status: 'TODO', priority: 'MEDIUM', dueDate: new Date('2025-11-20') },
    ],
  });

  console.log('✅ Created sample tasks');

  console.log('\n🎉 Demo family seeded successfully!');
  console.log(`\nDemo Family Slug: ${DEMO_FAMILY_SLUG}`);
  console.log('Guests will automatically join this family with read-only access.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
