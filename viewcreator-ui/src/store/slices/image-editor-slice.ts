import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { GenerationHistoryItem, ImageEditorState } from "@/types";

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
  mediaType: "image",
  videoUrls: [],
  duration: 6,
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
      if (action.payload.mediaType === 'video' && action.payload.videoUrls) {
        state.videoUrls = action.payload.videoUrls;
        state.mediaType = 'video';
      } else {
        state.mediaType = 'image';
      }
    },
    deleteGenerationFromHistory(state, action: PayloadAction<string>) {
      state.history = state.history.filter(item => item.id !== action.payload);
    },
    clearHistory(state) {
      state.history = [];
    },
    updateHistoryItemImages(state, action: PayloadAction<{ id: string; imageUrls: string[] }>) {
      const item = state.history.find(i => i.id === action.payload.id);
      if (item) {
        item.imageUrls = action.payload.imageUrls;
      }
    },
  },
});

export const { 
  setImageEditorState, 
  resetImageEditor, 
  addGenerationToHistory, 
  deleteGenerationFromHistory,
  clearHistory,
  updateHistoryItemImages
} = imageEditorSlice.actions;
export default imageEditorSlice.reducer;
