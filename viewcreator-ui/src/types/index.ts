export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export type MediaType = 'image' | 'video';

export interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  numberOfImages: number;
  imageSize: string;
  thinkingLevel: string;
  quality: 'Standard' | 'Premium';
  mediaType: MediaType;
  imageUrls: string[];
  videoUrls?: string[];
  duration?: number;
  referenceImages?: string[];
  templateId?: string | null;
}

export interface ImageEditorState {
  imageUrls: string[];
  selectedIndex: number | null;
  basePrompt: string;
  style: string;
  aspectRatio: string;
  editInstruction: string;
  adjustments: ImageAdjustments;
  cropRatio: string;
  previewUrl: string | null;
  history: GenerationHistoryItem[];
  activeHistoryItemId?: string;
  mediaType: MediaType;
  videoUrls: string[];
  duration: number;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  s3_link: string;
  media_type?: MediaType;
  user_id?: string | null;
  created_at?: string;
  upvotes?: number;
  user_upvoted?: boolean;
  config?: {
    category?: string;
    tags?: string[];
    stylePreset?: string;
    aspectRatio?: string;
    recommendedPrompts?: string[];
  };
}

export interface GenerateParams {
  prompt: string;
  style: string;
  aspectRatio: string;
  numberOfImages: number;
  imageSize: string;
  thinkingLevel: string;
  quality: 'Standard' | 'Premium';
  referenceImages: string[];
  templateId: string | null;
}

export interface GenerateVideoParams {
  prompt: string;
  style: string;
  aspectRatio: string;
  quality: 'Standard' | 'Premium';
  duration: number;
  templateId: string | null;
}
