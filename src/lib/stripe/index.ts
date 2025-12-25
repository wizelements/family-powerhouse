import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
});

export interface CreateCheckoutSessionParams {
  poolId: string;
  poolName: string;
  amount: number;
  contributionId: string;
  userId: string;
  userEmail: string;
  familyId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createContributionCheckoutSession({
  poolId,
  poolName,
  amount,
  contributionId,
  userId,
  userEmail,
  familyId,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Contribution to ${poolName}`,
              description: `Pool contribution`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        poolId,
        contributionId,
        userId,
        familyId,
        type: 'pool_contribution',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    {
      idempotencyKey: `checkout-${contributionId}`,
    }
  );

  return session;
}

export async function createRecurringContributionSession({
  poolId,
  poolName,
  amount,
  contributionId,
  userId,
  userEmail,
  familyId,
  frequency,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams & {
  frequency: 'week' | 'month';
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Recurring contribution to ${poolName}`,
            },
            unit_amount: Math.round(amount * 100),
            recurring: {
              interval: frequency,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        poolId,
        contributionId,
        userId,
        familyId,
        type: 'pool_recurring_contribution',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    {
      idempotencyKey: `subscription-${contributionId}`,
    }
  );

  return session;
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}
