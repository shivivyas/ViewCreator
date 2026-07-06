import { request } from '../base/api-client';
import type { GenerateParams, GenerateVideoParams, GenerateImagesResponse, GenerateVideoResponse, UserCreation } from '@/types';

/**
 * Triggers image generation or edits with the Gemini model using the Express backend API.
 * Returns the full response including s3Urls and creationId for persistence.
 */
export async function generateImages(params: GenerateParams, token?: string): Promise<GenerateImagesResponse> {
  return request<GenerateImagesResponse>('/api/generate', {
    method: 'POST',
    body: params,
    token,
  });
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

/**
 * Fetch all user creations (persisted generation history).
 */
export async function getUserCreations(token?: string): Promise<UserCreation[]> {
  const data = await request<{ creations: UserCreation[] }>('/api/generations', {
    method: 'GET',
    token,
  });
  return data.creations || [];
}

/**
 * Delete a single creation by ID.
 */
export async function deleteCreation(id: string, token?: string): Promise<boolean> {
  const data = await request<{ success: boolean }>(`/api/generations/${id}`, {
    method: 'DELETE',
    token,
  });
  return data.success;
}

/**
 * Delete all creations for the current user.
 */
export async function clearCreations(token?: string): Promise<number> {
  const data = await request<{ success: boolean; deletedCount: number }>('/api/generations', {
    method: 'DELETE',
    token,
  });
  return data.deletedCount;
}

/**
 * Update the images of an existing creation (e.g., after editor save).
 * Uploads new data URIs to S3 and returns the S3 URLs.
 */
export async function updateCreationImages(
  id: string,
  imageUrls: string[],
  token?: string
): Promise<{ s3Urls: string[]; creationId: string }> {
  return request<{ s3Urls: string[]; creationId: string }>(`/api/generations/${id}/images`, {
    method: 'PUT',
    body: { imageUrls },
    token,
  });
}
