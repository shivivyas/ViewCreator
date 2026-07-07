import { request } from '../base/api-client';
import type { TemplateAnalysis } from '@/types';

export interface AnalyzeResponse {
  analysis: TemplateAnalysis;
  cached: boolean;
}

// ─── Trace helper (frontend-side) ──────────────────────────────────────────
const traceId = () => `f-${Math.random().toString(36).slice(2, 8)}`;
function trace(label: string, ...args: any[]) {
  console.log(`[ANALYZE-FE:${traceId()}] ${label}`, ...args);
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
  trace('analyzeTemplate called', { templateId, hasToken: !!token, tokenPreview: token?.substring(0, 10) + '...' });

  const url = '/api/templates/analyze';
  trace('Sending POST to', url);
  trace('Request body:', JSON.stringify({ templateId }));

  const startTime = Date.now();

  try {
    const result = await request<AnalyzeResponse>(url, {
      method: 'POST',
      body: { templateId },
      token,
    });

    const elapsed = Date.now() - startTime;
    trace(`Response received in ${elapsed}ms`, { cached: result.cached });
    trace('Analysis result:', JSON.stringify(result.analysis).substring(0, 400));
    trace('worksWellFor:', result.analysis.worksWellFor);
    trace('preserves:', result.analysis.preserves);
    trace('customizes:', result.analysis.customizes);
    trace('title:', result.analysis.title);

    return result;
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    trace(`✖ Request FAILED after ${elapsed}ms`);
    trace('Error message:', err.message);
    trace('Error stack:', err.stack);
    throw err;
  }
}
