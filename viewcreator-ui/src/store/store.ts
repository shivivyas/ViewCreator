import { configureStore } from "@reduxjs/toolkit";

import imageEditorReducer from "@/store/slices/image-editor-slice";

export const makeStore = () =>
  configureStore({
    reducer: {
      imageEditor: imageEditorReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

