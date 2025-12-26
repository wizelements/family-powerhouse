import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// This endpoint can be called by Vercel Cron or an external scheduler
// Add to vercel.json: { "crons": [{ "path": "/api/cron/cleanup-guests", "schedule": "0 */6 * * *" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find expired guest users
    const expiredGuests = await prisma.user.findMany({
      where: {
        isGuest: true,
        guestExpiresAt: { lt: now },
      },
      select: { 
        id: true,
        memberships: {
          select: { familyId: true },
          where: { role: 'OWNER' },
        },
      },
    });

    if (expiredGuests.length === 0) {
      return NextResponse.json({ 
        message: 'No expired guests to clean up',
        deleted: 0,
      });
    }

    // Get family IDs where expired guests are owners (demo families)
    const demoFamilyIds = expiredGuests
      .flatMap((g) => g.memberships.map((m) => m.familyId))
      .filter((id, index, arr) => arr.indexOf(id) === index);

    // Delete demo families (cascades to all related data)
    // Only delete families that are marked as demo in settings
    const deletedFamilies = await prisma.family.deleteMany({
      where: {
        id: { in: demoFamilyIds },
      },
    });

    // Delete expired guest users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        isGuest: true,
        guestExpiresAt: { lt: now },
      },
    });

    console.log(`[Cleanup] Deleted ${deletedUsers.count} expired guests and ${deletedFamilies.count} demo families`);

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedUsers: deletedUsers.count,
      deletedFamilies: deletedFamilies.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
