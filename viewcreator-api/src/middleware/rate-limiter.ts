import rateLimit from 'express-rate-limit';
import { getAuth } from '@clerk/express';
import type { Request, Response } from 'express';

/**
 * Rate limiter for generation endpoints.
 * Limits to 10 generations per minute per authenticated user.
 */
export const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const { userId } = getAuth(req);
    return userId || 'unauthenticated';
  },
  validate: { xForwardedForHeader: false },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      error: 'Too many generation requests. Please wait a moment.',
      retry_after: 60,
    });
  },
});

/**
 * Stricter rate limiter for video generation (more expensive).
 * Limits to 3 generations per minute per authenticated user.
 */
export const videoGenerationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const { userId } = getAuth(req);
    return userId || 'unauthenticated';
  },
  validate: { xForwardedForHeader: false },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      error: 'Too many video generation requests. Please wait a moment.',
      retry_after: 60,
    });
  },
});
