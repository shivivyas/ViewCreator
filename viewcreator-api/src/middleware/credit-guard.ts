/**
 * Credit guard middleware — thin convenience re-exports from credit-service.
 *
 * This file exists for backward compatibility so existing imports in
 * index.ts and routes/*.ts continue to work without change.
 *
 * New code should import directly from '../services/credit-service.js'.
 */
export { CREDIT_COSTS } from 'viewcreator-shared';
export { checkCredits, deductCredits as deductForGeneration } from '../services/credit-service.js';
export type { CreditGuardResult } from 'viewcreator-shared';
