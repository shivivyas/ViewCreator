import { request } from '../base/api-client';
import type { GenerateParams } from '@/types';

export interface GenerateImagesResponse {
  imageUrls: string[];
}

/**
 * Triggers image generation or edits with the Gemini model using the Express backend API.
 */
export async function generateImages(params: GenerateParams, token?: string): Promise<string[]> {
  const data = await request<GenerateImagesResponse>('/api/generate', {
    method: 'POST',
    body: params,
    token,
  });
  return data.imageUrls || [];
}
