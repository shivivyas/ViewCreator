import { request } from '../base/api-client';
import type { Template } from '@/types';

export interface GetTemplatesResponse {
  templates: Template[];
}

export interface GetTemplateResponse {
  template: Template;
}

/**
 * Fetches a single template by ID with vote count and save status.
 * Guests can view individual templates without authentication.
 */
export async function getTemplate(id: string, token?: string): Promise<Template> {
  const data = await request<GetTemplateResponse>(`/api/templates/${id}`, {
    method: 'GET',
    token,
  });
  return data.template;
}

/**
 * Fetches all viral image generation templates from the backend.
 * @param query Optional cache-busting timestamp or query string.
 * @param savedOnly When true, only returns templates saved by current user.
 */
export async function getTemplates(token?: string, query?: string, savedOnly?: boolean): Promise<Template[]> {
  const params = new URLSearchParams();
  if (savedOnly) params.set('saved', 'true');
  const qs = params.toString();
  // Append cache-busting query param if provided (legacy callers pass "_t=123456")
  const url = query
    ? `/api/templates?${qs}${qs ? '&' : ''}${query}`
    : qs ? `/api/templates?${qs}` : '/api/templates';
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
  base64Images?: string[];
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

// ── Categories ────────────────────────────────────────────────

export interface GetCategoriesResponse {
  categories: string[];
}

/**
 * Fetch unique category tags derived from templates visible to current user.
 * Guests only see categories from public templates.
 */
export async function getCategories(token?: string): Promise<string[]> {
  const data = await request<GetCategoriesResponse>('/api/categories', {
    method: 'GET',
    token,
  });
  return data.categories || [];
}

// ── Saved Templates ───────────────────────────────────────────

export interface SaveResponse {
  saved: boolean;
  template: Template;
}

/**
 * Toggle save (bookmark) on a template.
 */
export async function saveTemplate(templateId: string, token?: string): Promise<{ saved: boolean; template: Template }> {
  return request<SaveResponse>(`/api/templates/${templateId}/save`, {
    method: 'POST',
    body: {},
    token,
  });
}
