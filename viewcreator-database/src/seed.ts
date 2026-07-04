import { TemplateRepository } from './repositories/template-repository.js';
import { UserRepository } from './repositories/user-repository.js';
import { PlanRepository } from './repositories/plan-repository.js';
import { query, checkConnection, closePool } from './db.js';

interface SeedPlan {
  name: string;
  type: 'credits' | 'subscription';
  credits: number;
  price_cents: number;
  interval: 'month' | 'year' | null;
  features: string[];
  sort_order: number;
  dodo_product_id: string | null;
}

const SEED_PLANS: SeedPlan[] = [
  {
    name: 'Starter Pack',
    type: 'credits',
    credits: 100,
    price_cents: 900,
    interval: null,
    features: [
      'Generate up to 100 images or 20 videos',
      'All aspect ratios & sizes',
      'Standard quality output',
      'Reference image upload',
      '7-day credit expiry',
    ],
    sort_order: 1,
    dodo_product_id: null, // ← Set after creating product in Dodo Dashboard
  },
  {
    name: 'Creator Pack',
    type: 'credits',
    credits: 500,
    price_cents: 3900,
    interval: null,
    features: [
      'Generate up to 500 images or 100 videos',
      'All aspect ratios & sizes',
      'Premium quality output',
      'Reference image upload (up to 3)',
      '30-day credit expiry',
      'Priority generation queue',
    ],
    sort_order: 2,
    dodo_product_id: null,
  },
  {
    name: 'Pro Pack',
    type: 'credits',
    credits: 2000,
    price_cents: 12900,
    interval: null,
    features: [
      'Generate up to 2,000 images or 400 videos',
      'All aspect ratios & sizes',
      'Premium quality output',
      'Reference image upload (up to 5)',
      '90-day credit expiry',
      'Priority generation queue',
      'Early access to new features',
    ],
    sort_order: 3,
    dodo_product_id: null,
  },
  {
    name: 'Monthly',
    type: 'subscription',
    credits: 0,
    price_cents: 2900,
    interval: 'month',
    features: [
      'Unlimited image & video generation',
      'All aspect ratios & sizes',
      'Premium quality output',
      'Reference image upload (up to 10)',
      'Priority generation queue',
      'All templates unlocked',
      'Early access to new features',
    ],
    sort_order: 4,
    dodo_product_id: 'pdt_0NiRFIFGpSZACnckj3yuS',
  },
  {
    name: 'Annual',
    type: 'subscription',
    credits: 0,
    price_cents: 29000,
    interval: 'year',
    features: [
      'Everything in Monthly',
      'Priority support',
      'Cancel anytime',
    ],
    sort_order: 5,
    dodo_product_id: null,
  },
];

interface SeedTemplate {
  title: string;
  description: string;
  s3_link: string;
  tags: string[];
}

const SEED_TEMPLATES: SeedTemplate[] = [
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

async function seedTemplate(template: SeedTemplate): Promise<void> {
  const existing = await TemplateRepository.findByS3Link(template.s3_link);
  if (existing) {
    console.log(`ℹ️ Template already exists: "${existing.title}"`);
    return;
  }

  const created = await TemplateRepository.create({
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

  const connected = await checkConnection();
  if (!connected) {
    console.error('❌ Database connection failed. Cannot seed.');
    process.exit(1);
  }

  try {
    // 1. Seed a test User
    const existingUser = await UserRepository.findByEmail('demo@viewcreator.com');
    if (!existingUser) {
      const user = await UserRepository.create({
        id: 'user_demo123',
        email: 'demo@viewcreator.com',
        name: 'Demo Creator',
      });
      console.log('✅ Created Demo User:', user.email, `(${user.id})`);
    } else {
      console.log('ℹ️ Demo User already exists:', existingUser.email);
    }

    // 2. Seed subscription plans (idempotent — name unique via upsert)
    for (const plan of SEED_PLANS) {
      const existing = await query<{ id: string }>(
        'SELECT id FROM subscription_plans WHERE name = $1',
        [plan.name]
      );
      if (existing.rows.length > 0) {
        console.log(`ℹ️ Plan already exists: "${plan.name}"`);
        continue;
      }
      await query(
        `INSERT INTO subscription_plans (name, type, credits, price_cents, interval, features, sort_order, dodo_product_id)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          plan.name,
          plan.type,
          plan.credits,
          plan.price_cents,
          plan.interval,
          JSON.stringify(plan.features),
          plan.sort_order,
          plan.dodo_product_id,
        ]
      );
      console.log(`✅ Seeded plan: "${plan.name}"`);
    }

    // 3. Seed all templates (idempotent — skips if S3 link already exists)
    for (const tpl of SEED_TEMPLATES) {
      await seedTemplate(tpl);
    }

    console.log('🎉 Seeding successfully completed!');
  } catch (error) {
    console.error('❌ Seeding failed:');
    console.error(error);
  } finally {
    await closePool();
  }
}

seed();
