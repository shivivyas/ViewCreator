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

    console.log(`[Balance] Fetching for user ${userId}`);

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
        dodo_customer_id: subscription.dodo_customer_id,
      };
    }

    console.log(`[Balance] User ${userId}: ${credits.balance} credits, lifetime ${credits.lifetime_credits}`);

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

/**
 * POST /api/payments/confirm-purchase
 *
 * Called by the frontend immediately after the user returns from Dodo checkout.
 * Grants credits synchronously so the user doesn't have to wait for the webhook.
 * Idempotent — safe to call multiple times.
 *
 * Auth required.
 */
router.post('/api/payments/confirm-purchase', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan_id, idempotency_key } = req.body;
    if (!plan_id) {
      return res.status(400).json({ error: 'plan_id is required' });
    }

    console.log('[Confirm Purchase] Request received', {
      userId,
      plan_id,
      idempotency_key: idempotency_key || '(auto-generated)',
      timestamp: new Date().toISOString(),
    });

    // Idempotency: use a unique key per purchase flow to prevent double-grant
    // on page refresh or concurrent calls, while still allowing repeat purchases
    // of the same plan (unlike the old getRecentPurchase by plan_id).
    const key = idempotency_key || `confirm-${userId}-${plan_id}-${Date.now()}`;
    console.log('[Confirm Purchase] Attempting atomic claim', { key });

    // Atomic claim — prevents double-grant even if two concurrent requests arrive
    const claimed = await WebhookEventRepository.tryClaim(key, 'confirm_purchase');
    console.log('[Confirm Purchase] Atomic claim result', { key, claimed });

    if (!claimed) {
      // Another request already processed this key — return current balance
      console.log(`[Confirm Purchase] DUPLICATE BLOCKED: key=${key} was already claimed. Returning existing balance.`);
      const balance = await CreditRepository.findByUserId(userId);
      return res.json({
        already_granted: true,
        credits: { balance: balance?.balance ?? 0, lifetime_credits: balance?.lifetime_credits ?? 0 },
      });
    } else {
      console.log('[Confirm Purchase] Key claimed successfully — proceeding to grant credits', { key, userId, plan_id });
    }

    // Look up plan
    const plan = await PlanRepository.findById(plan_id);
    if (!plan || !plan.is_active) {
      return res.status(404).json({ error: 'Plan not found or inactive' });
    }
    if (plan.credits <= 0) {
      return res.status(400).json({ error: 'Plan does not grant credits' });
    }

    console.log(`[Confirm Purchase] Granting credits: User ${userId} — ${plan.name} (${plan.credits} credits)`);

    // Grant credits atomically
    await CreditRepository.addCredits(
      userId,
      plan.credits,
      'purchase',
      `Purchased ${plan.name}`,
      { plan_id, granted_via: 'confirm-purchase' }
    );
    console.log('[Confirm Purchase] Credits written to DB successfully');

    // Credits already recorded atomically by tryClaim() above — no separate markProcessed needed

    const balance = await CreditRepository.findByUserId(userId);
    console.log(`[Confirm Purchase] Done — new balance is ${balance?.balance} (lifetime: ${balance?.lifetime_credits})`);

    return res.json({
      granted: true,
      credits: { balance: balance?.balance ?? 0, lifetime_credits: balance?.lifetime_credits ?? 0 },
    });
  } catch (error: any) {
    console.error('[Payments API] Confirm purchase error:', error);
    return res.status(500).json({ error: 'Failed to confirm purchase' });
  }
});

// ── Deduct Route ────────────────────────────────────────────────────────────

/**
 * POST /api/payments/deduct
 *
 * Admin endpoint to deduct credits from a user.
 * Protected by x-admin-key header.
 * Idempotent when idempotency_key is provided — safe to retry.
 *
 * Headers:
 *   x-admin-key: Admin API key
 *   x-user-id:  Target user ID
 *
 * Body:
 *   amount:         number (required, must be > 0)
 *   description?:   string
 *   idempotency_key?: string
 */
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Set x-admin-key header.' });
  }
  next();
}

router.post('/api/payments/deduct', requireAdmin, async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Missing x-user-id header' });
    }

    const { amount, description, idempotency_key } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const result = await CreditRepository.deductWithIdempotency(
      userId,
      amount,
      idempotency_key || `manual-deduct-${userId}-${amount}-${Date.now()}`,
      description || 'Admin credit deduction',
      { deducted_by: 'admin', idempotency_key: idempotency_key || undefined }
    );

    if (!result.success) {
      if (result.reason === 'insufficient') {
        return res.status(402).json({
          error: 'Insufficient credits',
          credits_balance: result.remaining ?? 0,
          required: amount,
        });
      }
      return res.status(400).json({ error: result.reason || 'Deduction failed' });
    }

    return res.json({
      deducted: result.deducted ?? amount,
      balance_after: result.remaining ?? 0,
    });
  } catch (error: any) {
    console.error('[Payments API] Deduct error:', error);
    return res.status(500).json({ error: 'Failed to deduct credits' });
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
    // Atomic claim — prevents duplicate processing from at-least-once webhook delivery
    const eventId = data?.id;
    if (eventId) {
      console.log('[Webhook Event] Attempting atomic claim', { eventId, type });
      const claimed = await WebhookEventRepository.tryClaim(eventId, type);
      console.log('[Webhook Event] Atomic claim result', { eventId, claimed });
      if (!claimed) {
        console.log(`[Webhook Event] DUPLICATE BLOCKED: event ${eventId} (${type}) was already processed.`);
        return res.json({ received: true, deduplicated: true });
      }
    } else {
      console.warn('[Webhook Event] No event ID in payload — cannot enforce idempotency for this event');
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

        // Extract Dodo customer ID for customer portal access
        const dodoCustomerId = sub.customer?.customer_id ?? sub.customer_id ?? null;

        // Create or update the subscription in our DB
        const existing = await SubscriptionRepository.findByDodoSubscriptionId(sub.id);
        const status = mapDodoStatus(sub.status);

        if (existing) {
          await SubscriptionRepository.updateByDodoId(sub.id, {
            status,
            current_period_start: sub.previous_billing_date ? new Date(sub.previous_billing_date) : undefined,
            current_period_end: sub.next_billing_date ? new Date(sub.next_billing_date) : undefined,
            dodo_customer_id: dodoCustomerId,
          });
        } else {
          await SubscriptionRepository.create({
            user_id: userId,
            plan_id: planId,
            status,
            current_period_start: sub.previous_billing_date ? new Date(sub.previous_billing_date) : undefined,
            current_period_end: sub.next_billing_date ? new Date(sub.next_billing_date) : undefined,
            dodo_subscription_id: sub.id,
            dodo_customer_id: dodoCustomerId,
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

    // Claim already recorded atomically by tryClaim() above — no separate markProcessed needed

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
  const dollars = plan.price_cents / 100;
  // Show 2 decimal places for amounts < $1, whole dollars otherwise
  const display_price = dollars < 1
    ? `$${dollars.toFixed(2)}`
    : `$${dollars.toFixed(0)}`;
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
