import { createSlice } from "@reduxjs/toolkit";

type AppState = {
  isInitialized: boolean;
};

const initialState: AppState = {
  isInitialized: true,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {},
});

export default appSlice.reducer;
