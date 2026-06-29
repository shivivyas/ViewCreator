export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

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
  imageUrls: string[];
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
}

export interface Template {
  id: string;
  title: string;
  description: string;
  s3_link: string;
  user_id?: string | null;
  config?: {
    category?: string;
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
