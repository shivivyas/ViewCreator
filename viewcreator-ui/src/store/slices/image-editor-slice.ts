import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
};

export type GenerationHistoryItem = {
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
};

export type ImageEditorState = {
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
};

const initialState: ImageEditorState = {
  imageUrls: [],
  selectedIndex: null,
  basePrompt: "",
  style: "None",
  aspectRatio: "1:1",
  editInstruction: "",
  adjustments: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 100,
  },
  cropRatio: "1:1",
  previewUrl: null,
  history: [],
};

const imageEditorSlice = createSlice({
  name: "imageEditor",
  initialState,
  reducers: {
    setImageEditorState(state, action: PayloadAction<Partial<ImageEditorState>>) {
      return {
        ...state,
        ...action.payload,
      };
    },
    resetImageEditor(state) {
      return {
        ...initialState,
        history: state.history, // Preserve history when resetting the editor
      };
    },
    addGenerationToHistory(state, action: PayloadAction<GenerationHistoryItem>) {
      state.history = [action.payload, ...state.history];
    },
    deleteGenerationFromHistory(state, action: PayloadAction<string>) {
      state.history = state.history.filter(item => item.id !== action.payload);
    },
    clearHistory(state) {
      state.history = [];
    },
  },
});

export const { 
  setImageEditorState, 
  resetImageEditor, 
  addGenerationToHistory, 
  deleteGenerationFromHistory,
  clearHistory 
} = imageEditorSlice.actions;
export default imageEditorSlice.reducer;
