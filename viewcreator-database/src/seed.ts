import { TemplateRepository } from './repositories/template-repository.js';
import { UserRepository } from './repositories/user-repository.js';
import { checkConnection, closePool } from './db.js';

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

    // 2. Seed all templates (idempotent — skips if S3 link already exists)
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
