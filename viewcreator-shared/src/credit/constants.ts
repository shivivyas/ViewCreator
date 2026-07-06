/**
 * Central credit cost definitions for all AI-powered operations.
 *
 * Every feature that consumes credits should reference these constants
 * rather than hardcoding values. This ensures a single source of truth
 * for the cost model across the entire application (API, UI, tests).
 */
export const CREDIT_COSTS = {
  /** Standard quality image generation (default) */
  IMAGE_STANDARD: 1,
  /** Premium quality image generation */
  IMAGE_PREMIUM: 2,
  /** Video generation */
  VIDEO: 5,
  /** Image edit operation */
  EDIT: 1,
  /** Template upload to the community library */
  TEMPLATE_UPLOAD: 1,
} as const;

/** Union type of all available credit cost keys */
export type CreditCostKey = keyof typeof CREDIT_COSTS;

/** Maximum images per generation request */
export const MAX_IMAGES_PER_REQUEST = 4;

/** Minimum images per generation request */
export const MIN_IMAGES_PER_REQUEST = 1;
