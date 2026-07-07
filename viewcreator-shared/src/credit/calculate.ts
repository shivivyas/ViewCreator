import { CREDIT_COSTS, MAX_IMAGES_PER_REQUEST, MIN_IMAGES_PER_REQUEST } from './constants.js';

/**
 * Result of a credit calculation, including both the numeric cost and
 * a human-readable breakdown for UI display.
 */
export interface CreditCalculationResult {
  /** Total credits required */
  total: number;
  /** Credits per unit (e.g., per image) */
  perUnit: number;
  /** Human-readable description (e.g., "2 credits × 3 images") */
  label: string;
}

/**
 * Calculate the total credit cost for an image generation request.
 *
 * @param quality - Always 'Standard' (1 credit/image)
 * @param numberOfImages - How many images to generate (clamped to 1-4)
 * @returns The total credit cost
 *
 * @example
 * ```ts
 * calculateGenerationCost(3) // → { total: 3, perUnit: 1, label: "1 credit × 3 images" }
 * calculateGenerationCost(1) // → { total: 1, perUnit: 1, label: "1 credit × 1 image" }
 * ```
 */
export function calculateGenerationCost(
  numberOfImages: number
): CreditCalculationResult {
  const clampedCount = Math.min(
    Math.max(MIN_IMAGES_PER_REQUEST, numberOfImages),
    MAX_IMAGES_PER_REQUEST
  );
  const costPerImage = CREDIT_COSTS.IMAGE_STANDARD;
  const total = costPerImage * clampedCount;

  return {
    total,
    perUnit: costPerImage,
    label: `${costPerImage} credit${costPerImage !== 1 ? 's' : ''} × ${clampedCount} image${clampedCount !== 1 ? 's' : ''}`,
  };
}

/**
 * Calculate the credit cost for video generation.
 * Videos always cost a fixed amount regardless of duration in the current model.
 *
 * @returns The total credit cost for video generation
 */
export function calculateVideoCost(): CreditCalculationResult {
  return {
    total: CREDIT_COSTS.VIDEO,
    perUnit: CREDIT_COSTS.VIDEO,
    label: `${CREDIT_COSTS.VIDEO} credits per video`,
  };
}

/**
 * Calculate the credit cost for an image edit operation.
 *
 * @returns The total credit cost for an edit
 */
export function calculateEditCost(): CreditCalculationResult {
  return {
    total: CREDIT_COSTS.EDIT,
    perUnit: CREDIT_COSTS.EDIT,
    label: `${CREDIT_COSTS.EDIT} credit per edit`,
  };
}

