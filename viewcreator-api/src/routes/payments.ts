import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { PlanRepository, CreditRepository, SubscriptionRepository, WebhookEventRepository } from 'viewcreator-database';

const router = Router();

/**
 * GET /api/payments/plans
 *
 * Returns all active pricing plans (credit packs and subscriptions).
 * Public — no auth required. Used by the pricing page.
 */
router.get('/api/payments/plans', async (_req, res) => {
  try {
    const plans = await PlanRepository.findAllActive();

    const creditPacks = plans
      .filter((p) => p.type === 'credits')
      .map(formatPlan);
    const subscriptions = plans
      .filter((p) => p.type === 'subscription')
      .map(formatPlan);

    return res.json({ creditPacks, subscriptions });
  } catch (error: any) {
    console.error('[Payments API] Error fetching plans:', error);
    return res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

/**
 * GET /api/payments/balance
 *
 * Returns the authenticated user's credit balance and active subscription status.
 * Auth required.
 */
router.get('/api/payments/balance', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get credit balance (auto-creates row if missing)
    const credits = await CreditRepository.ensureUser(userId);

    // Get active subscription
    const subscription = await SubscriptionRepository.findActiveByUserId(userId);

    // If subscription exists, attach plan details
    let subscriptionWithPlan = null;
    if (subscription) {
      const plan = await PlanRepository.findById(subscription.plan_id);
      subscriptionWithPlan = {
        id: subscription.id,
        plan_id: subscription.plan_id,
        plan_name: plan?.name ?? 'Unknown Plan',
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        canceled_at: subscription.canceled_at,
      };
    }

    return res.json({
      credits: {
        balance: credits.balance,
        lifetime_credits: credits.lifetime_credits,
      },
      subscription: subscriptionWithPlan,
    });
  } catch (error: any) {
    console.error('[Payments API] Error fetching balance:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

/**
 * GET /api/payments/transactions
 *
 * Returns the user's recent credit transaction history.
 * Auth required.
 */
router.get('/api/payments/transactions', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const transactions = await CreditRepository.getTransactions(userId, limit);

    return res.json({ transactions });
  } catch (error: any) {
    console.error('[Payments API] Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

/**
 * POST /api/payments/create-checkout
 *
 * Creates a Dodo Payments checkout session server-side.
 * Keeps user IDs and plan IDs out of browser URL params.
 * Auth required.
 */
router.post('/api/payments/create-checkout', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan_id, success_url, cancel_url } = req.body;
    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    // Look up plan
    const plan = await PlanRepository.findById(plan_id);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }
    if (!plan.dodo_product_id) {
      return res.status(400).json({ error: 'Payment not configured for this plan' });
    }

    // Get user info for Dodo checkout
    const { clerkClient } = await import('@clerk/express');
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email;

    if (!email) {
      return res.status(400).json({ error: 'User has no email address' });
    }

    // Create Dodo checkout session via the SDK
    const { default: DodoPayments } = await import('dodopayments');
    const dodoClient = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT as 'test_mode' | 'live_mode' | undefined,
    });

    const session = await dodoClient.checkoutSessions.create({
      product_cart: [
        {
          product_id: plan.dodo_product_id,
          quantity: 1,
        },
      ],
      customer: {
        email,
        name,
      },
      metadata: {
        user_id: userId,
        plan_id: plan.id,
      },
      return_url: success_url || process.env.DODO_PAYMENTS_RETURN_URL || 'http://localhost:3000/generate',
    });

    return res.json({ checkout_url: session.checkout_url });
  } catch (error: any) {
    console.error('[Payments API] Create checkout error:', error);
    return res.status(500).json({ error: 'Failed to create checkout' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/webhook-event
 *
 * Internal endpoint called by the Next.js webhook handler.
 * Processes Dodo payment events and syncs them to our database.
 */
router.post('/api/payments/webhook-event', async (req, res) => {
  try {
    const { type, data } = req.body as {
      type: string;
      data: Record<string, any>;
    };

    console.log(`[Webhook Event] Processing: ${type}`);

    // ── Idempotency check ──────────────────────────────────────
    // Prevent duplicate processing from at-least-once webhook delivery
    const eventId = data?.id;
    if (eventId) {
      const alreadyProcessed = await WebhookEventRepository.isProcessed(eventId);
      if (alreadyProcessed) {
        console.log(`[Webhook Event] Skipping already-processed event: ${eventId}`);
        return res.json({ received: true, deduplicated: true });
      }
    }

    switch (type) {
      case 'subscription.active':
      case 'subscription.renewed': {
        const sub = data;
        const metadata = sub.metadata ?? {};
        const userId = metadata.user_id;
        const planId = metadata.plan_id;

        if (!userId || !planId) {
          console.warn('[Webhook Event] Missing user_id or plan_id in metadata');
          return res.json({ received: true, skipped: true });
        }

        // Create or update the subscription in our DB
        const existing = await SubscriptionRepository.findByDodoSubscriptionId(sub.id);
        const status = mapDodoStatus(sub.status);

        if (existing) {
          await SubscriptionRepository.updateByDodoId(sub.id, {
            status,
            current_period_start: sub.previous_billing_date ? new Date(sub.previous_billing_date) : undefined,
            current_period_end: sub.next_billing_date ? new Date(sub.next_billing_date) : undefined,
          });
        } else {
          await SubscriptionRepository.create({
            user_id: userId,
            plan_id: planId,
            status,
            current_period_start: sub.previous_billing_date ? new Date(sub.previous_billing_date) : undefined,
            current_period_end: sub.next_billing_date ? new Date(sub.next_billing_date) : undefined,
            dodo_subscription_id: sub.id,
          });
        }

        // If credits were issued with this subscription, add them
        const creditCart = sub.credit_entitlement_cart ?? [];
        for (const credit of creditCart) {
          const creditsAmount = parseInt(credit.credits_amount || '0');
          if (creditsAmount > 0) {
            await CreditRepository.addCredits(
              userId,
              creditsAmount,
              'purchase',
              `Credits from ${sub.product_id} subscription`,
              { dodo_subscription_id: sub.id, credit_entitlement_id: credit.credit_entitlement_id }
            );
          }
        }

        console.log(`[Webhook Event] Synced subscription for user ${userId}`);
        break;
      }

      case 'subscription.cancelled': {
        const sub = data;
        if (sub.id) {
          await SubscriptionRepository.cancel(sub.id);
          console.log(`[Webhook Event] Cancelled subscription ${sub.id}`);
        }
        break;
      }

      case 'subscription.failed': {
        const sub = data;
        if (sub.id) {
          await SubscriptionRepository.updateByDodoId(sub.id, { status: 'past_due' });
          console.log(`[Webhook Event] Marked subscription ${sub.id} as past_due`);
        }
        break;
      }

      case 'subscription.updated': {
        const sub = data;
        if (sub.id) {
          await SubscriptionRepository.updateByDodoId(sub.id, {
            status: mapDodoStatus(sub.status),
            current_period_start: sub.previous_billing_date ? new Date(sub.previous_billing_date) : undefined,
            current_period_end: sub.next_billing_date ? new Date(sub.next_billing_date) : undefined,
          });
          console.log(`[Webhook Event] Updated subscription ${sub.id}`);
        }
        break;
      }

      case 'credit.added': {
        const credit = data;
        const metadata = credit.metadata ?? {};
        const userId = metadata.user_id;
        if (userId && credit.amount) {
          await CreditRepository.addCredits(
            userId,
            Math.abs(credit.amount),
            'grant',
            credit.description || 'Credit added via Dodo',
            { dodo_payment_id: credit.payment_id }
          );
        }
        break;
      }

      case 'credit.deducted': {
        const credit = data;
        const metadata = credit.metadata ?? {};
        const userId = metadata.user_id;
        if (userId && credit.amount) {
          await CreditRepository.deductCredits(
            userId,
            Math.abs(credit.amount),
            credit.description || 'Credit deducted via Dodo',
            { dodo_payment_id: credit.payment_id }
          );
        }
        break;
      }

      case 'payment.succeeded': {
        console.log('[Webhook Event] Payment succeeded — logged');
        break;
      }

      default:
        console.log(`[Webhook Event] Unhandled type: ${type}`);
    }

    // Mark event as processed for idempotency
    if (eventId) {
      await WebhookEventRepository.markProcessed(eventId, type);
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook Event] Processing error:', error);
    return res.status(500).json({ error: 'Failed to process webhook event' });
  }
});

function mapDodoStatus(dodoStatus: string): 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'expired' {
  const map: Record<string, 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'expired'> = {
    active: 'active',
    cancelled: 'canceled',
    canceled: 'canceled',
    past_due: 'past_due',
    incomplete: 'incomplete',
    trialing: 'trialing',
    expired: 'expired',
    on_hold: 'past_due',
    failed: 'past_due',
  };
  return map[dodoStatus?.toLowerCase()] ?? 'incomplete';
}

function formatPlan(plan: {
  id: string;
  name: string;
  type: string;
  credits: number;
  price_cents: number;
  currency: string;
  interval: string | null;
  features: any;
  dodo_product_id: string | null;
}) {
  const price = (plan.price_cents / 100).toFixed(0);
  const display_price = `$${price}`;
  const features = typeof plan.features === 'string'
    ? JSON.parse(plan.features)
    : Array.isArray(plan.features)
      ? plan.features
      : [];

  let display_per_unit: string | undefined;
  if (plan.type === 'credits' && plan.credits > 0) {
    const perUnit = (plan.price_cents / plan.credits).toFixed(2);
    display_per_unit = `$${perUnit}/credit`;
  }
  if (plan.type === 'subscription' && plan.interval === 'year') {
    const perMonth = plan.price_cents / 12 / 100;
    display_per_unit = `~$${perMonth.toFixed(2)}/mo`;
  }

  return {
    id: plan.id,
    name: plan.name,
    type: plan.type,
    credits: plan.credits,
    price_cents: plan.price_cents,
    currency: plan.currency,
    interval: plan.interval,
    display_price,
    display_per_unit,
    features,
    dodo_product_id: plan.dodo_product_id,
  };
}

export default router;
