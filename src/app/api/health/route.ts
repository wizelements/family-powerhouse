import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok' };
  } catch (error) {
    checks.database = { status: 'error', message: 'Database connection failed' };
  }

  // Stripe check (just verify env var exists)
  checks.stripe = process.env.STRIPE_SECRET_KEY
    ? { status: 'ok' }
    : { status: 'error', message: 'Stripe not configured' };

  // Pusher check
  checks.pusher = process.env.PUSHER_APP_ID
    ? { status: 'ok' }
    : { status: 'error', message: 'Pusher not configured' };

  // Storage check
  checks.storage = process.env.R2_ENDPOINT
    ? { status: 'ok' }
    : { status: 'error', message: 'Storage not configured' };

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
  const criticalHealthy = checks.database.status === 'ok';

  return NextResponse.json(
    {
      status: criticalHealthy ? (allHealthy ? 'healthy' : 'degraded') : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: criticalHealthy ? 200 : 503 }
  );
}
