import { request } from '../base/api-client';
import type { TemplateAnalysis } from '@/types';

export interface AnalyzeResponse {
  analysis: TemplateAnalysis;
  cached: boolean;
}

/**
 * Analyze a template image using Gemini AI.
 *
 * Returns structured insights: what industries it works for, what to preserve,
 * and what to customize. Results are cached server-side in the template config.
 *
 * This is a FREE call — no credits are checked or deducted.
 */
export async function analyzeTemplate(templateId: string, token?: string): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>('/api/templates/analyze', {
    method: 'POST',
    body: { templateId },
    token,
  });
}
