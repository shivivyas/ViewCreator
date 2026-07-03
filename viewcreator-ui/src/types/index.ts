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

// ── Payment & Subscription Types ───────────────────────────────────────────

export type PlanType = 'credits' | 'subscription';
export type SubscriptionInterval = 'month' | 'year';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: PlanType;
  credits: number;
  price_cents: number;
  currency: string;
  interval: SubscriptionInterval | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  sentra_price_id: string | null;
  /** Computed display price, e.g. "$9" */
  display_price: string;
  /** Per-unit display, e.g. "$0.09/credit" */
  display_per_unit?: string;
}

export interface UserCredits {
  balance: number;
  lifetime_credits: number;
}

export interface UserSubscription {
  id: string;
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
}

export interface UserPaymentStatus {
  credits: UserCredits | null;
  subscription: UserSubscription | null;
}
