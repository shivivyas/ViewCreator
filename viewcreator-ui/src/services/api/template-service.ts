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
