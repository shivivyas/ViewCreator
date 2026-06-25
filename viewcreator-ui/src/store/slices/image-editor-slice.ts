import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
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
};

const initialState: ImageEditorState = {
  imageUrls: [],
  selectedIndex: null,
  basePrompt: "",
  style: "Product Photo",
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
      return initialState;
    },
  },
});

export const { setImageEditorState, resetImageEditor } = imageEditorSlice.actions;
export default imageEditorSlice.reducer;
