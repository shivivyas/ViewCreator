import { request } from '../base/api-client';
import type { Template } from '@/types';

export interface GetTemplatesResponse {
  templates: Template[];
}

/**
 * Fetches all viral image generation templates from the backend.
 */
export async function getTemplates(token?: string): Promise<Template[]> {
  const data = await request<GetTemplatesResponse>('/api/templates', {
    method: 'GET',
    token,
  });
  return data.templates || [];
}

export interface UploadTemplateResponse {
  template: Template;
}

export interface UploadTemplateParams {
  base64Image: string;
  title: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

/**
 * Uploads a template image to the backend for S3 storage and database insertion.
 */
export async function uploadTemplate(params: UploadTemplateParams, token?: string): Promise<Template> {
  const data = await request<UploadTemplateResponse>('/api/templates/upload', {
    method: 'POST',
    body: params,
    token,
  });
  return data.template;
}
