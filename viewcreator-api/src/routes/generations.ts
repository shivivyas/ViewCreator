import { Router } from 'express';
import { getAuth } from '@clerk/express';
import { requireAuth } from '@clerk/express';
import { GoogleGenAI } from "@google/genai";
import { TemplateRepository, CreationRepository } from 'viewcreator-database';
import { calculateGenerationCost, calculateVideoCost, CREDIT_COSTS } from 'viewcreator-shared';
import { checkCredits, deductCredits as deductForGeneration } from '../services/credit-service.js';
import { syncUserMiddleware } from '../middleware/auth-sync.js';
import { uploadToS3, fetchS3ImageAsBase64 } from '../services/s3-service.js';
import { generationRateLimiter, videoGenerationRateLimiter } from '../middleware/rate-limiter.js';
import { validate, generateSchema, generateVideoSchema, editImageSchema, updateGenerationImagesSchema } from '../middleware/validate.js';

const router = Router();

// Image Generation Endpoint
router.post('/api/generate', generationRateLimiter, validate(generateSchema), requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { 
      prompt, 
      aspectRatio,
      imageSize,
      numberOfImages,
      style,
      quality,
      thinkingLevel,
      referenceImages,
      personGeneration,
      templateId
    } = req.body;

    // ── Credit Check ───────────────────────────────────────────
    const { userId } = getAuth(req);
    const { total: totalCost } = calculateGenerationCost(numberOfImages);

    const guard = await checkCredits(userId!, totalCost);
    if (!guard.allowed) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits_balance: guard.credits_balance,
        required: guard.required,
        upgrade_url: '/pricing',
      });
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

    // ── Save to S3 (best-effort) ────────────────────────────────
    const s3Urls: string[] = [];
    for (const dataUri of imageUrls) {
      try {
        const s3Url = await uploadToS3(dataUri, userId!, 'image');
        s3Urls.push(s3Url);
        console.log(`[Generate API] Uploaded to S3: ${s3Url.substring(0, 80)}...`);
      } catch (uploadErr: any) {
        console.warn(`[Generate API] S3 upload skipped (${uploadErr.message}) — will use data URI fallback`);
      }
    }

    // ── Persist to database (ALWAYS save, even if S3 failed) ──
    // When S3 works → store S3 URLs; when S3 fails → store data URIs directly
    // Data URIs are larger but survive login/logout; upgrade to S3 later
    const urlsForDb = s3Urls.length > 0 ? s3Urls : imageUrls;
    let creationId: string | null = null;
    try {
      const creation = await CreationRepository.create({
        user_id: userId!,
        media_type: 'image',
        prompt,
        style,
        aspect_ratio: aspectRatio,
        image_size: finalImageSize,
        number_of_images: imageUrls.length,
        quality,
        thinking_level: thinkingLevel,
        template_id: templateId || null,
        s3_urls: urlsForDb,
        reference_images: Array.isArray(referenceImages) ? referenceImages.slice(0, 3) : [],
        thumbnail_url: urlsForDb[0],
      });
      creationId = creation.id;
      console.log(`[Generate API] ✅ Persisted creation ${creation.id} (${s3Urls.length > 0 ? 'S3' : 'data URI fallback'}, ${urlsForDb.length} image(s))`);
    } catch (dbErr) {
      console.error('[Generate API] ❌ Failed to save creation record — history will not survive logout:', dbErr);
    }

    // Deduct credits after successful generation
    const promptPreview = prompt.substring(0, 100);
    const deductResult = await deductForGeneration(
      userId!,
      totalCost,
      `Generated ${imageUrls.length} image(s)`,
      { prompt_preview: promptPreview, quality, count: imageUrls.length, creation_id: creationId }
    );

    if (!deductResult.success) {
      console.error(`[Credit] Image generation deduction FAILED for user ${userId}:`, deductResult);
    }

    return res.json({ imageUrls, s3Urls, creationId, credit_deducted: deductResult.success });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Video Generation Endpoint
router.post('/api/generate/video', videoGenerationRateLimiter, validate(generateVideoSchema), requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { prompt, aspectRatio, style, quality, duration, templateId } = req.body;

    // ── Credit Check ───────────────────────────────────────────
    const { userId } = getAuth(req);
    const { total: videoCost } = calculateVideoCost();
    const guard = await checkCredits(userId!, videoCost);
    if (!guard.allowed) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits_balance: guard.credits_balance,
        required: videoCost,
        upgrade_url: '/pricing',
      });
    }

    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({
        error: 'API key is not configured on the server. Please check the GEMINI_NANO_BANANA_API_KEY setting.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct the final prompt
    let finalPrompt = prompt;
    if (style !== 'None') {
      finalPrompt += `\n\nStyle: ${style}.`;
    }

    const contents: any[] = [finalPrompt];

    // If templateId is provided, retrieve the template and attach its S3 asset as reference
    if (templateId) {
      try {
        console.log(`[Generate Video API] Retrieving template ${templateId} from database...`);
        const template = await TemplateRepository.findById(templateId);
        if (template) {
          console.log(`[Generate Video API] Fetching public S3 asset from: ${template.s3_link}`);
          const response = await fetch(template.s3_link);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = response.headers.get('content-type') || (template.media_type === 'video' ? 'video/mp4' : 'image/jpeg');
            contents.push({
              inlineData: {
                mimeType,
                data: buffer.toString('base64')
              }
            });
            console.log(`[Generate Video API] Successfully loaded template ${template.media_type} as reference.`);
          }
        } else {
          console.warn(`[Generate Video API] Template with ID ${templateId} not found.`);
        }
      } catch (err: any) {
        console.error('[Generate Video API] Error processing template:', err);
        return res.status(400).json({ error: `Failed to load template: ${err.message}` });
      }
    }

    console.log("[Generate Video API] Request parameters:");
    console.log("- Prompt length:", finalPrompt.length);
    console.log("- Aspect Ratio:", aspectRatio);
    console.log("- Duration:", duration);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            aspectRatio: aspectRatio
          } as any,
          thinkingConfig: {
            thinkingLevel: 'minimal',
            includeThoughts: false
          }
        } as any
      });

      const videoUrls: string[] = [];

      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/jpeg';
            videoUrls.push(`data:${mimeType};base64,${part.inlineData.data}`);
            break;
          }
        }
      }

      if (videoUrls.length === 0) {
        throw new Error('API did not return any content.');
      }

      // ── Save to S3 (best-effort) ────────────────────────────────
      let creationId: string | null = null;
      const s3Urls: string[] = [];
      for (const dataUri of videoUrls) {
        try {
          const s3Url = await uploadToS3(dataUri, userId!, 'video');
          s3Urls.push(s3Url);
          console.log(`[Generate Video API] Uploaded to S3: ${s3Url.substring(0, 80)}...`);
        } catch (uploadErr: any) {
          console.warn(`[Generate Video API] S3 upload skipped (${uploadErr.message}) — will use data URI fallback`);
        }
      }

      // ── Persist to database (ALWAYS save, even if S3 failed) ──
      const urlsForDb = s3Urls.length > 0 ? s3Urls : videoUrls;
      try {
        const creation = await CreationRepository.create({
          user_id: userId!,
          media_type: 'video',
          prompt,
          style,
          aspect_ratio: aspectRatio,
          quality,
          duration: duration || 6,
          template_id: templateId || null,
          s3_urls: urlsForDb,
          thumbnail_url: urlsForDb[0],
        });
        creationId = creation.id;
        console.log(`[Generate Video API] ✅ Persisted creation ${creation.id} (${s3Urls.length > 0 ? 'S3' : 'data URI fallback'}, ${urlsForDb.length} video(s))`);
      } catch (dbErr) {
        console.error('[Generate Video API] ❌ Failed to save creation record — history will not survive logout:', dbErr);
      }

      // Deduct credits after successful generation
      const { total: deductedVideoCost } = calculateVideoCost();
      const deductResult = await deductForGeneration(
        userId!,
        deductedVideoCost,
        'Generated video',
        { prompt_preview: prompt.substring(0, 100), quality, creation_id: creationId }
      );

      if (!deductResult.success) {
        console.error(`[Credit] Video generation deduction FAILED for user ${userId}:`, deductResult);
      }

      return res.json({ videoUrls, duration, s3Urls, creationId, credit_deducted: deductResult.success });
    } catch (genError: any) {
      console.error('[Generate Video API] Generation failed:', genError);
      return res.status(500).json({ error: `Video generation failed: ${genError.message}` });
    }
  } catch (error: any) {
    console.error('Error in video generation endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// ── User Creations Routes ────────────────────────────────────────────────────

// Get all creations for the authenticated user
router.get('/api/generations', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const creations = await CreationRepository.findByUserId(userId);

    // Map to camelCase for the frontend
    const mapped = creations.map((c) => ({
      id: c.id,
      mediaType: c.media_type,
      prompt: c.prompt,
      style: c.style,
      aspectRatio: c.aspect_ratio,
      imageSize: c.image_size,
      numberOfImages: c.number_of_images,
      quality: c.quality,
      thinkingLevel: c.thinking_level,
      duration: c.duration,
      templateId: c.template_id,
      s3Urls: c.s3_urls,
      referenceImages: c.reference_images,
      thumbnailUrl: c.thumbnail_url,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return res.json({ creations: mapped });
  } catch (error: any) {
    console.error('[Generations API] Error fetching creations:', error);
    return res.status(500).json({ error: 'Failed to fetch creations' });
  }
});

// Delete a specific creation (owner-only)
router.delete('/api/generations/:id', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const creationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!creationId) {
      return res.status(400).json({ error: 'Creation ID is required' });
    }

    const deleted = await CreationRepository.delete(creationId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Creation not found or not owned by user' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Generations API] Error deleting creation:', error);
    return res.status(500).json({ error: 'Failed to delete creation' });
  }
});

// Delete all creations for the authenticated user
router.delete('/api/generations', requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const count = await CreationRepository.deleteAllByUserId(userId);
    console.log(`[Generations API] Cleared ${count} creations for user ${userId}`);
    return res.json({ success: true, deletedCount: count });
  } catch (error: any) {
    console.error('[Generations API] Error clearing creations:', error);
    return res.status(500).json({ error: 'Failed to clear creations' });
  }
});

// Update creation images after editor save
router.put('/api/generations/:id/images', validate(updateGenerationImagesSchema), requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { userId } = getAuth(req);
    const creationId = req.params.id;
    const { imageUrls: newDataUris } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!creationId) {
      return res.status(400).json({ error: 'Creation ID is required' });
    }

    // Upload new images to S3
    const newS3Urls: string[] = [];
    for (const dataUri of newDataUris) {
      try {
        const s3Url = await uploadToS3(dataUri, userId, 'image');
        newS3Urls.push(s3Url);
      } catch (uploadErr) {
        console.error('[Generations API] S3 upload failed during update:', uploadErr);
      }
    }

    if (newS3Urls.length === 0) {
      return res.status(500).json({ error: 'Failed to upload any images to S3' });
    }

    // Update the creation record (snapshots old images in metadata)
    const updated = await CreationRepository.updateImages(
      creationId,
      userId,
      newS3Urls,
      newS3Urls[0]
    );

    if (!updated) {
      return res.status(404).json({ error: 'Creation not found or not owned by user' });
    }

    return res.json({
      s3Urls: updated.s3_urls,
      creationId: updated.id,
      thumbnailUrl: updated.thumbnail_url,
    });
  } catch (error: any) {
    console.error('[Generations API] Error updating creation images:', error);
    return res.status(500).json({ error: 'Failed to update creation images' });
  }
});

/**
 * Edit an existing image using Gemini AI — no user_creation record is created.
 * This is distinct from /api/generate which always persists a new creation.
 * Credits are deducted at the EDIT rate (1 credit per edit).
 */
router.post('/api/edit-image', validate(editImageSchema), requireAuth(), syncUserMiddleware, async (req, res): Promise<any> => {
  try {
    const { referenceImage, instruction, aspectRatio } = req.body;

    // ── Credit Check ───────────────────────────────────────────
    const { userId } = getAuth(req);
    const editCost = CREDIT_COSTS.EDIT;
    const guard = await checkCredits(userId!, editCost);
    if (!guard.allowed) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits_balance: guard.credits_balance,
        required: editCost,
        upgrade_url: '/pricing',
      });
    }

    const apiKey = process.env.GEMINI_NANO_BANANA_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(500).json({
        error: 'API key is not configured on the server. Please check the GEMINI_NANO_BANANA_API_KEY setting.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [
        instruction,
        {
          inlineData: {
            mimeType: 'image/png',
            data: referenceImage.replace(/^data:image\/\w+;base64,/, ''),
          },
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio } as any,
        thinkingConfig: { thinkingLevel: 'high', includeThoughts: false },
      } as any,
    });

    let editedImageUrl: string | null = null;
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          editedImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!editedImageUrl) {
      throw new Error('Gemini API did not return an edited image.');
    }

    // Deduct credits after successful edit (no user_creation record created)
    const deductResult = await deductForGeneration(
      userId!,
      editCost,
      `AI edit: ${instruction.substring(0, 100)}`,
      { edit_type: 'image-edit', aspect_ratio: aspectRatio }
    );

    if (!deductResult.success) {
      console.error(`[Credit] Image edit deduction FAILED for user ${userId}:`, deductResult);
    }

    return res.json({ editedImageUrl, credit_deducted: deductResult.success });
  } catch (error: any) {
    console.error('Error editing image:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
