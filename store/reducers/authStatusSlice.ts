// store/slices/authStatusSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthStatusState {
  isLoginInProgress: boolean;
}

const initialState: AuthStatusState = {
  isLoginInProgress: false,
};

const authStatusSlice = createSlice({
  name: "authStatus",
  initialState,
  reducers: {
    setLoginInProgress(state, action: PayloadAction<boolean>) {
      state.isLoginInProgress = action.payload;
    },
  },
});

export const { setLoginInProgress } = authStatusSlice.actions;
export default authStatusSlice.reducer;
