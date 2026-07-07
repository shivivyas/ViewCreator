import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

/**
 * Express middleware that validates `req.body` against a Zod schema.
 * Returns 400 with `{ error, details }` on mismatch.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}

// ─── Generation Schemas ─────────────────────────────────────────

export const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  aspectRatio: z.string().default('1:1'),
  imageSize: z.string().default('1K'),
  numberOfImages: z.number().int().min(1).max(4).default(1),
  style: z.string().default('None'),
  quality: z.literal('Standard').default('Standard'),
  thinkingLevel: z.enum(['none', 'minimal', 'full']).default('minimal'),
  referenceImages: z.array(z.string()).default([]),
  personGeneration: z.enum(['DONT_ALLOW', 'ALLOW']).default('DONT_ALLOW'),
  templateId: z.string().nullable().optional(),
});

export const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  aspectRatio: z.string().default('16:9'),
  style: z.string().default('None'),
  quality: z.literal('Standard').default('Standard'),
  duration: z.number().int().min(1).max(30).default(6),
  templateId: z.string().nullable().optional(),
});

export const editImageSchema = z.object({
  referenceImage: z.string().min(1, 'Reference image is required'),
  instruction: z.string().min(1, 'Instruction is required').max(2000),
  aspectRatio: z.string().optional(),
});

// ─── Template Schemas ───────────────────────────────────────────

export const uploadTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  base64Image: z.string().optional(),
  base64Video: z.string().optional(),
  mediaType: z.enum(['image', 'video']).default('image'),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.mediaType === 'video' && !data.base64Video) {
    ctx.addIssue({ code: 'custom', path: ['base64Video'], message: 'base64Video is required for video templates' });
  }
  if (data.mediaType !== 'video' && !data.base64Image) {
    ctx.addIssue({ code: 'custom', path: ['base64Image'], message: 'base64Image is required for image templates' });
  }
});

export const analyzeTemplateSchema = z.object({
  templateId: z.string().min(1, 'templateId is required'),
});

// ─── Payment Schemas ────────────────────────────────────────────

export const createCheckoutSchema = z.object({
  plan_id: z.string().min(1, 'plan_id is required'),
  success_url: z.string().optional(),
  cancel_url: z.string().optional(),
});

export const confirmPurchaseSchema = z.object({
  plan_id: z.string().min(1, 'plan_id is required'),
  idempotency_key: z.string().optional(),
});

export const deductCreditsSchema = z.object({
  amount: z.number().int().positive('Amount must be positive'),
  description: z.string().optional(),
  idempotency_key: z.string().optional(),
});

export const grantCreditsSchema = z.object({
  user_id: z.string().min(1, 'user_id is required'),
  amount: z.number().int().positive('Amount must be positive'),
  description: z.string().optional(),
});

// ─── Generations Management ─────────────────────────────────────

export const updateGenerationImagesSchema = z.object({
  imageUrls: z.array(z.string().min(1)).min(1, 'At least one image URL is required'),
});
