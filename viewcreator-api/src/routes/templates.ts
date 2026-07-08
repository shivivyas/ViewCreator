import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { requireAuth } from '@clerk/express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { TemplateRepository, VoteRepository, SaveRepository } from 'viewcreator-database';
import { syncUserMiddleware } from '../middleware/auth-sync.js';
import { s3Client } from '../services/s3-service.js';
import { validate, uploadTemplateSchema } from '../middleware/validate.js';

const router = Router();

// Get All Templates Endpoint (with vote counts, save status, and pagination)
// No requireAuth — guests can browse templates freely
router.get('/api/templates', syncUserMiddleware, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const savedOnly = req.query.saved === 'true';

    const templates = await VoteRepository.findAllWithVotes(userId || undefined, limit, offset, savedOnly);
    
    // No browser caching — authenticated responses may contain private templates
    // that should not be served to guests from cache after sign-out.
    res.set('Cache-Control', 'private, no-cache');
    res.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to retrieve templates from database' });
  }
});

// Get Single Template by ID (with vote/save status for authenticated user)
// No requireAuth — guests can view individual templates
router.get('/api/templates/:id', syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await VoteRepository.findByIdWithVotes(templateId, userId || undefined);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to retrieve template from database' });
  }
});

// Get All Categories Endpoint (dynamic — derived from template tags)
// Respects visibility: guests only see categories from public templates
router.get('/api/categories', syncUserMiddleware, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const categories = await VoteRepository.findCategories(userId || undefined);
    res.json({ categories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

// Toggle Save Template Endpoint
router.post('/api/templates/:id/save', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await TemplateRepository.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const { saved } = await SaveRepository.toggle(templateId, userId!);
    
    // Return updated template with save status
    const updatedTemplate = await VoteRepository.findByIdWithVotes(templateId, userId || undefined);
    return res.json({ saved, template: updatedTemplate });
  } catch (error: any) {
    console.error('Error toggling save:', error);
    res.status(500).json({ error: 'Failed to toggle save' });
  }
});

// Delete Template Endpoint
router.delete('/api/templates/:id', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await TemplateRepository.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check authorization: User must be the creator
    if (template.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }

    // Optional: Delete from S3 (If required, we can extract the key from s3_link, but skipping for now or I can add it)
    await TemplateRepository.delete(templateId);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template from database' });
  }
});

// Vote on a Template Endpoint (toggles upvote)
router.post('/api/templates/:id/vote', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const templateId = req.params.id;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const template = await TemplateRepository.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await VoteRepository.toggleUpvote(templateId, userId);

    const updated = await VoteRepository.findByIdWithVotes(templateId, userId);
    res.json({ template: updated });
  } catch (error: any) {
    console.error('Error upvoting template:', error);
    res.status(500).json({ error: error.message || 'Failed to record upvote' });
  }
});

/** Upload a single file buffer to S3 and return its URL. */
async function uploadToS3(buffer: Buffer, mimeType: string, prefix: string, userId: string | null | undefined, bucketName: string): Promise<string> {
  const ext = mimeType.split('/')[1] || 'bin';
  const s3Key = `${prefix}/${userId || 'public'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  await s3Client.send(new PutObjectCommand({ Bucket: bucketName, Key: s3Key, Body: buffer, ContentType: mimeType }));
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
}

/** Parse a base64 data URI into buffer + mime type. */
function parseBase64(dataUri: string): { buffer: Buffer; mimeType: string } {
  const match = dataUri.match(/^data:([\w\/.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid base64 data format');
  return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
}

// Upload Template Assets to S3 and Save Reference Endpoint
router.post('/api/templates/upload', validate(uploadTemplateSchema), requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const { title, description, base64Image, base64Images, base64Video, mediaType, tags, isPublic } = req.body;
    const isVideo = mediaType === 'video';

    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      return res.status(500).json({ error: 'S3 bucket name is not configured on the server. Please check the AWS_S3_BUCKET setting.' });
    }

    const prefix = 'templates';
    const uploadedUrls: string[] = [];

    if (isVideo) {
      // Single video upload
      const { buffer, mimeType } = parseBase64(base64Video);
      const url = await uploadToS3(buffer, mimeType, prefix, userId, bucketName);
      uploadedUrls.push(url);
      console.log(`[S3 Upload] Video uploaded: ${url}`);
    } else {
      // Collect all base64 images (single + array)
      const allBase64 = [];
      if (base64Image) allBase64.push(base64Image);
      if (base64Images?.length) allBase64.push(...base64Images);

      for (const b64 of allBase64) {
        const { buffer, mimeType } = parseBase64(b64);
        const url = await uploadToS3(buffer, mimeType, prefix, userId, bucketName);
        uploadedUrls.push(url);
      }
      console.log(`[S3 Upload] ${uploadedUrls.length} image(s) uploaded`);
    }

    if (uploadedUrls.length === 0) {
      return res.status(400).json({ error: 'No valid assets provided for upload' });
    }

    // Primary URL is the first asset; additional ones go into config
    const configTags = isPublic ? tags : ['My Uploads'];
    const config: Record<string, any> = {
      tags: configTags,
      uploadedAt: new Date().toISOString(),
    };
    if (uploadedUrls.length > 1) {
      config.asset_urls = uploadedUrls.slice(1);
    }

    const template = await TemplateRepository.create({
      title,
      description,
      s3_link: uploadedUrls[0],
      media_type: isVideo ? 'video' : 'image',
      config,
      user_id: isPublic ? null : userId
    });

    console.log(`[S3 Upload] Successfully recorded template ${template.id} in Postgres.`);

    res.json({ template });
  } catch (error: any) {
    console.error('Error uploading template to S3:', error);
    res.status(500).json({ error: error.message || 'Failed to upload template' });
  }
});

export default router;
