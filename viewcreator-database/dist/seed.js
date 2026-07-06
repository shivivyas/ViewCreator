"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const template_repository_js_1 = require("./repositories/template-repository.js");
const user_repository_js_1 = require("./repositories/user-repository.js");
const credit_repository_js_1 = require("./repositories/credit-repository.js");
const db_js_1 = require("./db.js");
/**
 * Two credit packs:
 *   5 Credits for $0.05  — trial/starter
 *   100 Credits for $9   — standard
 * No subscription plans.
 */
const SEED_PLANS = [
    {
        name: '5 Credits',
        type: 'credits',
        credits: 5,
        price_cents: 5,
        interval: null,
        features: [
            'Generate up to 5 images or 1 video',
            'All aspect ratios & sizes',
            'Standard quality output',
        ],
        sort_order: 0,
        dodo_product_id: 'pdt_0NiZQ6jp5QSl7ZLZVlZ77',
    },
    {
        name: '100 Credits',
        type: 'credits',
        credits: 100,
        price_cents: 900,
        interval: null,
        features: [
            'Generate up to 100 images or 20 videos',
            'All aspect ratios & sizes',
            'Standard & premium quality output',
            'Reference image upload',
            'Never expires',
        ],
        sort_order: 1,
        dodo_product_id: 'pdt_0NiWo2CjaeJBzhplGXxWT',
    },
];
const SEED_TEMPLATES = [
    {
        title: 'Viral Social Media Template #1',
        description: 'High-engagement template for Twitter/LinkedIn visual hooks, featuring prominent typography, custom placeholders, and modern high-contrast styling.',
        s3_link: 'https://viewcreator-templates.s3.us-east-1.amazonaws.com/template-1.webp',
        tags: ['LinkedIn', 'Social Media', 'Modern'],
    },
    {
        title: 'Minimalist Product Showcase',
        description: 'Clean, minimal product photography template with soft gradients and centered composition. Perfect for e-commerce hero sections and product launches.',
        s3_link: 'https://viewcreator-templates.s3.us-east-1.amazonaws.com/templates/public/1782734875897-k1vmjsu.webp',
        tags: ['Product', 'E-Commerce', 'Minimalist'],
    },
    {
        title: 'Bold Typography Hero',
        description: 'Striking typography-driven template with dynamic layout and vibrant accents. Ideal for announcements, event promotions, and brand storytelling.',
        s3_link: 'https://viewcreator-templates.s3.us-east-1.amazonaws.com/templates/public/1782770014447-7kcfpdk.png',
        tags: ['Typography', 'Branding', 'Hero'],
    },
    {
        title: 'Modern UI Mockup Grid',
        description: 'Versatile multi-panel UI showcase template with clean grid layout. Great for app store screenshots, feature highlights, and portfolio presentations.',
        s3_link: 'https://viewcreator-templates.s3.us-east-1.amazonaws.com/templates/public/1782773810875-cgph6ti.webp',
        tags: ['UI', 'Portfolio', 'Modern'],
    },
];
async function seedTemplate(template) {
    const existing = await template_repository_js_1.TemplateRepository.findByS3Link(template.s3_link);
    if (existing) {
        console.log(`ℹ️ Template already exists: "${existing.title}"`);
        return;
    }
    const created = await template_repository_js_1.TemplateRepository.create({
        title: template.title,
        description: template.description,
        s3_link: template.s3_link,
        config: {
            tags: template.tags,
            seededAt: new Date().toISOString(),
        },
    });
    console.log(`✅ Seeded template: "${created.title}" (${created.id})`);
}
async function seed() {
    console.log('🌱 Seeding database...');
    const connected = await (0, db_js_1.checkConnection)();
    if (!connected) {
        console.error('❌ Database connection failed. Cannot seed.');
        process.exit(1);
    }
    try {
        // 1. Seed test users
        const SEED_USERS = [
            { id: 'user_3FmDRMiUXHVNrF36YH6IzKuPMvH', email: 'sidshadi4444@gmail.com', name: 'Free User', credits: 0 },
            { id: 'user_3Fi7Uo9fodfdjrEgY7oxTcTJE07', email: 'sid6641@gmail.com', name: 'Credit User', credits: 500 },
        ];
        for (const su of SEED_USERS) {
            const existingUser = await user_repository_js_1.UserRepository.findByEmail(su.email);
            if (!existingUser) {
                const user = await user_repository_js_1.UserRepository.create({
                    id: su.id,
                    email: su.email,
                    name: su.name,
                });
                console.log(`✅ Created user: ${user.email} (${user.id})`);
                // Give the user their starting credit balance
                if (su.credits > 0) {
                    const credits = await credit_repository_js_1.CreditRepository.ensureUser(user.id);
                    await (0, db_js_1.query)(`UPDATE user_credits SET balance = $2, lifetime_credits = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [user.id, su.credits]);
                    await (0, db_js_1.query)(`INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
             VALUES ($1, 'grant', $2, $2, 'Seed credits for development')`, [user.id, su.credits]);
                    console.log(`  💰 Granted ${su.credits} credits to ${user.email}`);
                }
                else {
                    // Ensure credits row exists even at zero
                    await credit_repository_js_1.CreditRepository.ensureUser(user.id);
                }
            }
            else {
                console.log(`ℹ️ User already exists: ${existingUser.email}`);
            }
        }
        // 2. Seed the single credit plan (idempotent — name unique via upsert)
        for (const plan of SEED_PLANS) {
            const existing = await (0, db_js_1.query)('SELECT id FROM subscription_plans WHERE name = $1', [plan.name]);
            if (existing.rows.length > 0) {
                console.log(`ℹ️ Plan already exists: "${plan.name}"`);
                continue;
            }
            await (0, db_js_1.query)(`INSERT INTO subscription_plans (name, type, credits, price_cents, interval, features, sort_order, dodo_product_id)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`, [
                plan.name,
                plan.type,
                plan.credits,
                plan.price_cents,
                plan.interval,
                JSON.stringify(plan.features),
                plan.sort_order,
                plan.dodo_product_id,
            ]);
            console.log(`✅ Seeded plan: "${plan.name}"`);
        }
        // 3. Seed all templates (idempotent — skips if S3 link already exists)
        for (const tpl of SEED_TEMPLATES) {
            await seedTemplate(tpl);
        }
        console.log('🎉 Seeding successfully completed!');
    }
    catch (error) {
        console.error('❌ Seeding failed:');
        console.error(error);
    }
    finally {
        await (0, db_js_1.closePool)();
    }
}
seed();
//# sourceMappingURL=seed.js.map