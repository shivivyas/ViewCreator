import { request } from '../base/api-client';
import type { GenerateParams, GenerateVideoParams } from '@/types';

export interface GenerateImagesResponse {
  imageUrls: string[];
}

export interface GenerateVideoResponse {
  videoUrls: string[];
  duration: number;
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

/**
 * Triggers video generation using the Express backend API.
 */
export async function generateVideo(params: GenerateVideoParams, token?: string): Promise<GenerateVideoResponse> {
  return request<GenerateVideoResponse>('/api/generate/video', {
    method: 'POST',
    body: params,
    token,
  });
}
