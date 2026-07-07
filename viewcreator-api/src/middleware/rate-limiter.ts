import rateLimit from 'express-rate-limit';
import { getAuth } from '@clerk/express';
import type { Request, Response } from 'express';

/**
 * Create a rate limiter middleware for generation endpoints.
 * @param maxRequests - Max requests per minute for this limiter
 * @param label - Human-readable label for the error message
 */
function createRateLimiter(maxRequests: number, label: string) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      const { userId } = getAuth(req);
      return userId || 'unauthenticated';
    },
    validate: { xForwardedForHeader: false },
    handler: (_req: Request, res: Response) => {
      return res.status(429).json({
        error: `Too many ${label} requests. Please wait a moment.`,
        retry_after: 60,
      });
    },
  });
}

/** Limits to 10 image generations per minute per authenticated user. */
export const generationRateLimiter = createRateLimiter(10, 'generation');

/** Limits to 3 video generations per minute per authenticated user. */
export const videoGenerationRateLimiter = createRateLimiter(3, 'video generation');
