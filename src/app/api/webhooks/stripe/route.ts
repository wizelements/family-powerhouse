import { NextRequest, NextResponse } from 'next/server';
import { prisma, AuditEvent, Prisma } from '@/lib/db';
import { generateLedgerIdempotencyKey } from '@/lib/utils/idempotency';
import { triggerFamilyEvent } from '@/lib/pusher/server';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  // Dynamic import to avoid build-time errors
  const { verifyWebhookSignature } = await import('@/lib/stripe');

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = verifyWebhookSignature(body, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { contributionId, poolId, userId, familyId, type } = session.metadata || {};

  if (type !== 'pool_contribution' || !contributionId || !poolId) {
    console.log('Skipping non-contribution checkout session');
    return;
  }

  // Idempotency check - find contribution by ID
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
    include: { pool: true },
  });

  if (!contribution) {
    console.error(`Contribution not found: ${contributionId}`);
    return;
  }

  if (contribution.status === 'COMPLETED') {
    console.log(`Contribution already processed: ${contributionId}`);
    return;
  }

  const amount = new Prisma.Decimal(session.amount_total! / 100);

  await prisma.$transaction(async (tx) => {
    // Update contribution status
    await tx.contribution.update({
      where: { id: contributionId },
      data: {
        status: 'COMPLETED',
        stripePaymentId: session.payment_intent as string,
      },
    });

    // Calculate new pool balance
    const newBalance = contribution.pool.currentAmount.plus(amount);

    // Create ledger entry
    await tx.ledgerEntry.create({
      data: {
        poolId,
        contributionId,
        type: 'CONTRIBUTION',
        amount,
        balanceAfter: newBalance,
        description: `Contribution from payment`,
        idempotencyKey: generateLedgerIdempotencyKey('contribution', contributionId),
      },
    });

    // Update pool balance
    await tx.pool.update({
      where: { id: poolId },
      data: { currentAmount: newBalance },
    });

    // Create notification for pool creator
    await tx.notification.create({
      data: {
        userId: contribution.pool.createdById,
        familyId: familyId!,
        type: 'POOL_CONTRIBUTION',
        title: 'New Contribution',
        message: `A $${amount} contribution was made to ${contribution.pool.name}`,
        data: { poolId, contributionId, amount: amount.toString() },
      },
    });

    // Check if pool target reached
    if (newBalance.greaterThanOrEqualTo(contribution.pool.targetAmount)) {
      await tx.notification.create({
        data: {
          userId: contribution.pool.createdById,
          familyId: familyId!,
          type: 'POOL_TARGET_MET',
          title: 'Pool Target Reached!',
          message: `${contribution.pool.name} has reached its target of $${contribution.pool.targetAmount}`,
          data: { poolId },
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        familyId: familyId!,
        userId: userId!,
        event: AuditEvent.CONTRIBUTION_MADE,
        targetType: 'Contribution',
        targetId: contributionId,
        metadata: { poolId, amount: amount.toString(), paymentId: String(session.payment_intent) },
      },
    });
  });

  // Real-time notification
  if (familyId) {
    await triggerFamilyEvent(familyId, 'contribution:new', {
      poolId,
      contributionId,
      amount: amount.toString(),
    });
  }

  console.log(`Contribution processed: ${contributionId}`);
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const { contributionId } = session.metadata || {};

  if (!contributionId) return;

  await prisma.contribution.update({
    where: { id: contributionId },
    data: { status: 'CANCELLED' },
  });

  console.log(`Contribution cancelled (session expired): ${contributionId}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { contributionId } = paymentIntent.metadata || {};

  if (!contributionId) return;

  await prisma.contribution.update({
    where: { id: contributionId },
    data: { status: 'FAILED' },
  });

  console.log(`Contribution failed: ${contributionId}`);
}
