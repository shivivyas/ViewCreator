import { TemplateRepository } from './repositories/template-repository.js';
import { UserRepository } from './repositories/user-repository.js';
import { checkConnection, closePool } from './db.js';

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

    // 2. Seed the Initial Template (Public S3 link)
    const templates = await TemplateRepository.findAll();
    const s3Link = 'https://viewcreator-templates.s3.us-east-1.amazonaws.com/template-1.webp';
    
    const existingTemplate = templates.find(t => t.s3_link === s3Link);
    if (!existingTemplate) {
      const template = await TemplateRepository.create({
        title: 'Viral Social Media Template #1',
        description: 'High-engagement template for Twitter/LinkedIn visual hooks, featuring prominent typography, custom placeholders, and modern high-contrast styling.',
        s3_link: s3Link,
        config: {
          aspectRatio: '1:1',
          width: 1024,
          height: 1024,
          stylePreset: 'Modern',
          recommendedPrompts: [
            'A minimalist software dashboard with dark theme showing rapid growth charts',
            'An elegant glassmorphism workspace with code editor and coffee cup'
          ],
          placeholders: [
            { id: 'background', description: 'Central showcase/product image placeholder' }
          ]
        }
      });
      console.log('✅ Seeded Initial Template:', template.title, `(${template.id})`);
    } else {
      console.log('ℹ️ Initial Template already exists:', existingTemplate.title);
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
