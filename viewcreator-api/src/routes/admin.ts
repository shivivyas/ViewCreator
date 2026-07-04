import { Router } from 'express';
import { PlanRepository, CreditRepository, WebhookEventRepository } from 'viewcreator-database';
import { pool } from 'viewcreator-database';

const router = Router();

const ADMIN_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

/**
 * Simple API key check for admin endpoints
 */
function requireAdmin(req: any, res: any, next: any) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Set x-admin-key header.' });
  }
  next();
}

/**
 * GET /api/admin/payments/status
 *
 * Returns payment system health: DB, Dodo API, webhook config, recent stats.
 * Protected by x-admin-key header.
 */
router.get('/api/admin/payments/status', requireAdmin, async (_req, res) => {
  try {
    // 1. Database health
    let dbConnected = false;
    let planCount = 0;
    let userCreditCount = 0;
    let totalCredits = 0;
    try {
      const dbResult = await pool.query('SELECT 1 AS ok');
      dbConnected = dbResult.rows[0]?.ok === 1;

      const plans = await PlanRepository.findAllActive();
      planCount = plans.length;

      const creditResult = await pool.query(
        'SELECT COUNT(*) AS cnt, COALESCE(SUM(balance), 0) AS total FROM user_credits'
      );
      userCreditCount = parseInt(creditResult.rows[0]?.cnt || '0');
      totalCredits = parseInt(creditResult.rows[0]?.total || '0');
    } catch {
      dbConnected = false;
    }

    // 2. Webhook config
    const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
    const webhookConfigured = !!webhookKey && webhookKey !== 'whsec_test_placeholder';

    // 3. Recent webhook events (24h)
    let recentEvents = 0;
    try {
      const eventResult = await pool.query(
        "SELECT COUNT(*) AS cnt FROM webhook_events WHERE created_at > NOW() - INTERVAL '24 hours'"
      );
      recentEvents = parseInt(eventResult.rows[0]?.cnt || '0');
    } catch {
      recentEvents = 0;
    }

    return res.json({
      healthy: dbConnected && webhookConfigured,
      database: {
        connected: dbConnected,
        plan_count: planCount,
        users_with_credits: userCreditCount,
        total_credits_in_circulation: totalCredits,
      },
      dodo: {
        configured: !!process.env.DODO_PAYMENTS_API_KEY,
        environment: process.env.DODO_PAYMENTS_ENVIRONMENT || 'not_set',
      },
      webhooks: {
        configured: webhookConfigured,
        events_last_24h: recentEvents,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Admin API] Status check error:', error);
    return res.status(500).json({ healthy: false, error: error.message });
  }
});

/**
 * GET /api/admin/payments/webhook-events
 *
 * Returns recent webhook events for debugging.
 * Protected by x-admin-key header.
 */
router.get('/api/admin/payments/webhook-events', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await pool.query(
      'SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT $1',
      [limit]
    );

    return res.json({ events: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error('[Admin API] Webhook events error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
