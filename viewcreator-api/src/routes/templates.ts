import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { requireAuth } from '@clerk/express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { TemplateRepository, VoteRepository } from 'viewcreator-database';
import { calculateTemplateUploadCost } from 'viewcreator-shared';
import { checkCredits, deductForGeneration } from '../middleware/credit-guard.js';
import { syncUserMiddleware } from '../middleware/auth-sync.js';
import { s3Client } from '../services/s3-service.js';

const router = Router();

// Get All Templates Endpoint (with vote counts, pagination, and caching)
router.get('/api/templates', requireAuth(), syncUserMiddleware, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const templates = await VoteRepository.findAllWithVotes(userId || undefined, limit, offset);
    
    // Cache for 30s on the browser/CDN; stale data can be served while revalidating for up to 60s
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to retrieve templates from database' });
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

// Upload Template Image to S3 and Save Reference Endpoint
router.post('/api/templates/upload', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const { title, description, base64Image, base64Video, mediaType, tags = [], isPublic = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const isVideo = mediaType === 'video';

    if (!isVideo && !base64Image) {
      return res.status(400).json({ error: 'base64Image content is required for image templates' });
    }
    if (isVideo && !base64Video) {
      return res.status(400).json({ error: 'base64Video content is required for video templates' });
    }

    // ── Credit Check ─────────────────────────────────────────
    const { total: uploadCreditCost } = calculateTemplateUploadCost();
    const guard = await checkCredits(userId!, uploadCreditCost);
    if (!guard.allowed) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits_balance: guard.credits_balance,
        required: uploadCreditCost,
        upgrade_url: '/pricing',
      });
    }

    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      return res.status(500).json({ error: 'S3 bucket name is not configured on the server. Please check the AWS_S3_BUCKET setting.' });
    }

    let buffer: Buffer;
    let mimeType: string;
    let s3Key: string;

    if (isVideo) {
      // Handle video upload
      const videoMatch = base64Video.match(/^data:(video\/[\w.+-]+);base64,(.+)$/);
      if (!videoMatch) {
        return res.status(400).json({ error: 'Invalid base64 video data format' });
      }
      mimeType = videoMatch[1];
      const base64Data = videoMatch[2];
      buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = mimeType.split('/')[1] || 'mp4';
      s3Key = `templates/${userId || 'public'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    } else {
      // Handle image upload (existing logic)
      const match = base64Image.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid base64 image data format' });
      }
      mimeType = match[1];
      const base64Data = match[2];
      buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = mimeType.split('/')[1] || 'png';
      s3Key = `templates/${userId || 'public'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    }

    console.log(`[S3 Upload] Uploading ${s3Key} to bucket ${bucketName}...`);

    // Put Object in S3 Bucket
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    const s3Url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
    console.log(`[S3 Upload] Successfully uploaded template ${isVideo ? 'video' : 'image'} to S3: ${s3Url}`);

    // Persist template metadata reference
    const configTags = isPublic ? tags : ['My Uploads'];
    const template = await TemplateRepository.create({
      title,
      description,
      s3_link: s3Url,
      media_type: isVideo ? 'video' : 'image',
      config: {
        tags: configTags,
        uploadedAt: new Date().toISOString()
      },
      user_id: isPublic ? null : userId
    });

    console.log(`[S3 Upload] Successfully recorded template ${template.id} in Postgres.`);

    // Deduct credits after successful upload
    const deductResult = await deductForGeneration(
      userId!,
      uploadCreditCost,
      `Uploaded template: ${title}`,
      { template_id: template.id, media_type: mediaType, is_public: isPublic }
    );

    if (!deductResult.success) {
      console.error(`[Credit] Template upload deduction FAILED for user ${userId}:`, deductResult);
    }

    res.json({ template, credit_deducted: deductResult.success });
  } catch (error: any) {
    console.error('Error uploading template to S3:', error);
    res.status(500).json({ error: error.message || 'Failed to upload template' });
  }
});

export default router;
