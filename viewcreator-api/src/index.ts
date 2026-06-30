import dotenv from 'dotenv';
// Load environment variables immediately before importing other modules
dotenv.config();

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";
import { TemplateRepository, UserRepository, VoteRepository } from 'viewcreator-database';
import { clerkMiddleware, requireAuth, clerkClient, getAuth } from '@clerk/express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const app = express();
const port = process.env.PORT || 3001;

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Middlewares
// Use a large payload limit (e.g., 10mb) to support base64 encoded reference images
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(clerkMiddleware());

/**
 * Ensures the authenticated user exists in the database.
 * If not, fetches details from Clerk and creates a new database record.
 */
async function ensureUserSynced(userId: string): Promise<void> {
  try {
    console.log(`[Auth Sync] Checking if user ${userId} exists in database...`);
    const dbUser = await UserRepository.findById(userId);
    if (!dbUser) {
      console.log(`[Auth Sync] User ${userId} not found in database. Fetching from Clerk...`);
      const clerkUser = await clerkClient.users.getUser(userId);
      
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        throw new Error(`User ${userId} does not have a primary email address in Clerk.`);
      }
      
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || undefined;
      
      console.log(`[Auth Sync] Registering user in database: ${email} | Name: ${name}`);
      await UserRepository.create({
        id: userId,
        email,
        name,
      });
      console.log(`[Auth Sync] Successfully created user row for ${userId}`);
    } else {
      console.log(`[Auth Sync] User ${userId} already exists in database.`);
    }
  } catch (error) {
    console.error(`[Auth Sync] Failed to sync user ${userId}:`, error);
  }
}

const syncUserMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { userId } = getAuth(req);
  console.log('[Auth Sync] userId:', userId);
  if (userId) {
    await ensureUserSynced(userId);
  }
  next();
};

/**
 * Downloads a public S3 template image and converts it to base64 format for Gemini
 */
async function fetchS3ImageAsBase64(url: string): Promise<{ mimeType: string; data: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch template image from S3: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'image/webp';
  const data = buffer.toString('base64');
  return { mimeType, data };
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get All Templates Endpoint (with vote counts)
app.get('/api/templates', requireAuth(), syncUserMiddleware, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const templates = await VoteRepository.findAllWithVotes(userId || undefined);
    res.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to retrieve templates from database' });
  }
});

// Delete Template Endpoint
app.delete('/api/templates/:id', requireAuth(), syncUserMiddleware, async (req: express.Request, res: express.Response): Promise<any> => {
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
app.post('/api/templates/:id/vote', requireAuth(), syncUserMiddleware, async (req: express.Request, res: express.Response): Promise<any> => {
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
app.post('/api/templates/upload', requireAuth(), syncUserMiddleware, async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const { title, description, base64Image, tags = [], isPublic = false } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!base64Image) {
      return res.status(400).json({ error: 'base64Image content is required' });
    }

    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      return res.status(500).json({ error: 'S3 bucket name is not configured on the server. Please check the AWS_S3_BUCKET setting.' });
    }

    // Match image mime type from base64 string
    const match = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid base64 image data format' });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Create clean S3 key
    const fileExtension = mimeType.split('/')[1] || 'png';
    const s3Key = `templates/${userId || 'public'}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;

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
    console.log(`[S3 Upload] Successfully uploaded template image to S3: ${s3Url}`);

    // Persist template metadata reference
    const configTags = isPublic ? tags : ['My Uploads'];
    const template = await TemplateRepository.create({
      title,
      description,
      s3_link: s3Url,
      config: {
        tags: configTags,
        uploadedAt: new Date().toISOString()
      },
      user_id: isPublic ? null : userId
    });

    console.log(`[S3 Upload] Successfully recorded template ${template.id} in Postgres.`);
    res.json({ template });
  } catch (error: any) {
    console.error('Error uploading template to S3:', error);
    res.status(500).json({ error: error.message || 'Failed to upload template' });
  }
});

// Image Generation Endpoint
app.post('/api/generate', requireAuth(), syncUserMiddleware, async (req: express.Request, res: express.Response): Promise<any> => {
  try {
    const { 
      prompt, 
      aspectRatio = '1:1',
      imageSize = '1K',
      numberOfImages = 1,
      style = 'None',
      quality = 'Standard',
      thinkingLevel = 'minimal',
      referenceImages = [],
      personGeneration = 'DONT_ALLOW',
      templateId
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({ 
        error: 'API key is not configured on the server. Please check the GEMINI_NANO_BANANA_API_KEY setting.' 
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct the locked prompt based on style and quality
    let finalPrompt = prompt;
    if (style !== 'None') {
      finalPrompt += `\n\nStyle: ${style}.`;
    }
    if (quality === 'Premium') {
      finalPrompt += `\n\nQuality: Ultra high quality, 4k resolution, photorealistic, highly detailed, masterpiece, professional marketing asset.`;
    }

    // Build the contents array
    const contents: any[] = [finalPrompt];
    
    // If templateId is provided, retrieve the viral template from PostgreSQL and fetch its S3 image
    if (templateId) {
      try {
        console.log(`[Generate API] Retrieving template ${templateId} from database...`);
        const template = await TemplateRepository.findById(templateId);
        if (template) {
          console.log(`[Generate API] Fetching public S3 image from: ${template.s3_link}`);
          const { mimeType, data } = await fetchS3ImageAsBase64(template.s3_link);
          contents.push({
            inlineData: {
              mimeType,
              data
            }
          });
          console.log(`[Generate API] Successfully loaded template image as reference.`);
        } else {
          console.warn(`[Generate API] Template with ID ${templateId} not found.`);
        }
      } catch (err: any) {
        console.error('[Generate API] Error processing template image:', err);
        return res.status(400).json({ error: `Failed to load template image: ${err.message}` });
      }
    }
    
    // Process reference images (support up to 3 for composition control)
    if (Array.isArray(referenceImages) && referenceImages.length > 0) {
      for (const refImage of referenceImages.slice(0, 3)) {
        if (refImage && typeof refImage === 'string') {
          const match = refImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            contents.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
          }
        }
      }
    }

    const count = Math.min(Math.max(1, numberOfImages), 4); // Limit between 1 and 4
    
    // Validate image size
    const validSizes = ['512', '1K', '2K', '4K'];
    const finalImageSize = validSizes.includes(imageSize) ? imageSize : '1K';

    // Build the image configuration
    const imageConfig: any = {
      aspectRatio: aspectRatio
    };
    
    // Add imageSize if not 1K (default)
    if (finalImageSize !== '1K') {
      imageConfig.imageSize = finalImageSize;
    }

    console.log("[Generate API] Request parameters:");
    console.log("- Prompt length:", finalPrompt.length);
    console.log("- Aspect Ratio:", aspectRatio);
    console.log("- Image Size:", finalImageSize);
    console.log("- Count:", count);
    console.log("- Thinking Level:", thinkingLevel);
    console.log("- References count:", referenceImages.length);
    console.log("- Full imageConfig object:", JSON.stringify(imageConfig));

    // We make parallel requests to ensure we get exactly the requested number of images
    const promises = Array.from({ length: count }).map((_, index) => {
      console.log(`[Generate API] Starting generation for image ${index + 1}/${count}`);
      return ai.models.generateContent({
        model: "gemini-3.1-flash-image", 
        contents,
        config: {
          responseModalities: ["IMAGE"],
          personGeneration: personGeneration || 'DONT_ALLOW',
          imageConfig: imageConfig,
          thinkingConfig: {
            thinkingLevel: ['high', 'minimal'].includes(thinkingLevel) ? thinkingLevel : 'minimal',
            includeThoughts: false
          }
        } as any
      }).then(response => {
        console.log(`[Generate API] Successfully completed image ${index + 1}/${count}`);
        return response;
      }).catch(e => {
        console.error(`[Generate API] Single image generation failed for image ${index + 1}:`, e);
        return null;
      });
    });

    const responses = await Promise.all(promises);
    const imageUrls: string[] = [];

    for (const response of responses) {
      if (!response) continue;
      
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            imageUrls.push(`data:${mimeType};base64,${part.inlineData.data}`);
            break; // Just one image per response
          }
        }
      }
    }

    if (imageUrls.length === 0) {
      throw new Error('API did not return any images.');
    }

    return res.json({ imageUrls });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 ViewCreator API is running on http://localhost:${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 Generate endpoint: http://localhost:${port}/api/generate`);
});
