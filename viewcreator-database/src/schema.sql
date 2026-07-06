-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    s3_link VARCHAR(512) NOT NULL,
    media_type VARCHAR(10) DEFAULT 'image' NOT NULL CHECK (media_type IN ('image', 'video')),
    -- JSONB to store flexible configurations such as bounding boxes, text placement, 
    -- dimensions, overlay properties, or default prompts
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast sorting by creation date (primary listing order)
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON templates (created_at DESC);

-- Index for searching metadata configuration keys quickly
CREATE INDEX IF NOT EXISTS idx_templates_config ON templates USING gin (config);

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_timestamp trigger to users
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Apply update_timestamp trigger to templates
DROP TRIGGER IF EXISTS update_templates_timestamp ON templates;
CREATE TRIGGER update_templates_timestamp
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Template Upvotes Table
CREATE TABLE IF NOT EXISTS template_upvotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (template_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_template_upvotes_template_id ON template_upvotes(template_id);
CREATE INDEX IF NOT EXISTS idx_template_upvotes_user_id ON template_upvotes(user_id);

-- ── Payment & Subscription Tables ─────────────────────────────────────────────────────

-- Subscription Plans: Defines available plans (credit packs and subscriptions)
-- These are seeded from Dodo Payments product catalog
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('credits', 'subscription')),
    credits INT NOT NULL DEFAULT 0,       -- Credits granted (for credit packs) or 0 for unlimited subscriptions
    price_cents INT NOT NULL,             -- Price in cents (e.g., 900 = $9.00)
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(10) CHECK (interval IN ('month', 'year', NULL)), -- NULL for credit packs
    features JSONB DEFAULT '[]'::jsonb,   -- Feature list for UI display
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    dodo_product_id VARCHAR(255),         -- Dodo Payments product ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- User Credits: Current credit balance (cached from Dodo Payments)
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0,             -- Current available credits
    lifetime_credits INT NOT NULL DEFAULT 0,    -- Total credits ever purchased (for tracking)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (user_id)
);

-- Credit Transactions: Audit log of all credit changes
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'refund', 'expiration', 'grant')),
    amount INT NOT NULL,                   -- Positive = credits added, Negative = credits deducted
    balance_after INT NOT NULL,
    description TEXT,
    dodo_payment_id VARCHAR(255),          -- Reference to Dodo payment/event
    dodo_subscription_id VARCHAR(255),     -- Reference to Dodo subscription
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id, created_at DESC);

-- User Subscriptions: Active subscription tracking (synced from Dodo webhooks)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    dodo_subscription_id VARCHAR(255),     -- Dodo Payments subscription ID
    dodo_customer_id VARCHAR(255),          -- Dodo Payments customer ID (for portal access)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dodo ON user_subscriptions(dodo_subscription_id);

-- Apply update_timestamp trigger to new tables
DROP TRIGGER IF EXISTS update_subscription_plans_timestamp ON subscription_plans;
CREATE TRIGGER update_subscription_plans_timestamp
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_user_credits_timestamp ON user_credits;
CREATE TRIGGER update_user_credits_timestamp
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_user_subscriptions_timestamp ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_timestamp
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Webhook Events: Idempotency tracking for Dodo Payments webhooks
-- Prevents duplicate processing of the same event
CREATE TABLE IF NOT EXISTS webhook_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- ── Credit Deduction Function (with Idempotency) ─────────────────────────────────────

-- Atomic credit deduction with idempotency support.
-- Used by the API for admin-triggered deductions.
-- Returns JSONB: { success: boolean, remaining?: number, deducted?: number, reason?: string }
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id VARCHAR(255),
    p_amount INT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_description TEXT DEFAULT 'Credit deduction',
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_balance INT;
    v_new_balance INT;
    v_already_processed BOOLEAN;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'invalid_amount');
    END IF;

    -- Idempotency check: if key provided and already processed, return cached result
    IF p_idempotency_key IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM webhook_events WHERE event_id = p_idempotency_key
        ) INTO v_already_processed;

        IF v_already_processed THEN
            -- Find the resulting transaction to get balance_after
            SELECT balance_after INTO v_new_balance
            FROM credit_transactions
            WHERE user_id = p_user_id
              AND type = 'usage'
              AND amount = -p_amount
              AND created_at > NOW() - INTERVAL '5 minutes'
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_new_balance IS NOT NULL THEN
                RETURN jsonb_build_object(
                    'success', true,
                    'remaining', v_new_balance,
                    'deducted', p_amount
                );
            END IF;

            -- Fallback: read current balance
            SELECT balance INTO v_new_balance FROM user_credits WHERE user_id = p_user_id;
            RETURN jsonb_build_object(
                'success', true,
                'remaining', COALESCE(v_new_balance, 0),
                'deducted', p_amount
            );
        END IF;
    END IF;

    -- Lock the user's credit row
    SELECT balance INTO v_current_balance
    FROM user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- If no row exists, user has no credits
    IF v_current_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient', 'remaining', 0);
    END IF;

    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient', 'remaining', v_current_balance);
    END IF;

    -- Perform atomic deduction
    UPDATE user_credits
    SET balance = balance - p_amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND balance >= p_amount
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'race_lost', 'remaining', v_current_balance);
    END IF;

    -- Log the transaction
    INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
    VALUES (p_user_id, 'usage', -p_amount, v_new_balance, p_description, p_metadata);

    -- Record idempotency key
    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO webhook_events (event_id, event_type)
        VALUES (p_idempotency_key, 'credit_deduction')
        ON CONFLICT (event_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'remaining', v_new_balance,
        'deducted', p_amount
    );
END;
$$;

-- ── User Creations Table ─────────────────────────────────────────────────────

-- Stores all user-generated content (images and videos) for persistence across sessions.
-- Each row represents one generation request with its output stored in S3.
CREATE TABLE IF NOT EXISTS user_creations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    prompt TEXT NOT NULL,
    style VARCHAR(255) DEFAULT 'None',
    aspect_ratio VARCHAR(10) DEFAULT '1:1',
    image_size VARCHAR(10) DEFAULT '1K',
    number_of_images INT DEFAULT 1,
    quality VARCHAR(20) DEFAULT 'Standard',
    thinking_level VARCHAR(20) DEFAULT 'minimal',
    duration INT,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    s3_urls JSONB DEFAULT '[]'::jsonb NOT NULL,
    reference_images JSONB DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for fast retrieval of a user's creations, newest first
CREATE INDEX IF NOT EXISTS idx_user_creations_user_id ON user_creations(user_id, created_at DESC);

-- Apply update_timestamp trigger to user_creations
DROP TRIGGER IF EXISTS update_user_creations_timestamp ON user_creations;
CREATE TRIGGER update_user_creations_timestamp
    BEFORE UPDATE ON user_creations
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
