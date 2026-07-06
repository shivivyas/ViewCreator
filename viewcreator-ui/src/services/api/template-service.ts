import { request } from '../base/api-client';
import type { Template } from '@/types';

export interface GetTemplatesResponse {
  templates: Template[];
}

/**
 * Fetches all viral image generation templates from the backend.
 * @param query Optional query string to append (e.g. "_t=123456" for cache busting).
 */
export async function getTemplates(token?: string, query?: string): Promise<Template[]> {
  const url = query ? `/api/templates?${query}` : '/api/templates';
  const data = await request<GetTemplatesResponse>(url, {
    method: 'GET',
    token,
  });
  return data.templates || [];
}

export interface UploadTemplateResponse {
  template: Template;
}

export interface UploadTemplateParams {
  base64Image?: string;
  base64Video?: string;
  mediaType?: 'image' | 'video';
  title: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * Uploads a template image or video to the backend for S3 storage and database insertion.
 */
export async function uploadTemplate(params: UploadTemplateParams, token?: string): Promise<Template> {
  const data = await request<UploadTemplateResponse>('/api/templates/upload', {
    method: 'POST',
    body: params,
    token,
  });
  return data.template;
}

export interface DeleteTemplateResponse {
  success: boolean;
}

/**
 * Deletes a template by its ID
 */
export async function deleteTemplate(id: string, token?: string): Promise<boolean> {
  const data = await request<DeleteTemplateResponse>(`/api/templates/${id}`, {
    method: 'DELETE',
    token,
  });
  return data.success;
}

export interface VoteResponse {
  template: Template;
}

/**
 * Toggle an upvote on a template
 */
export async function voteTemplate(templateId: string, token?: string): Promise<Template> {
  const data = await request<VoteResponse>(`/api/templates/${templateId}/vote`, {
    method: 'POST',
    body: {},
    token,
  });
  return data.template;
}
