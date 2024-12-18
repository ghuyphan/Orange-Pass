import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UserRecord from "@/types/userType";
import { AvatarConfig } from '@zamplyy/react-native-nice-avatar';

interface AuthState {
  token: string | null;
  user: UserRecord | null;
  isAuthenticated: boolean;
  avatarConfig: AvatarConfig | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  avatarConfig: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthData: (state, action: PayloadAction<{ 
      token: string; 
      user: UserRecord 
    }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;

      // Parse avatar config here
      try {
        const avatarConfigString = action.payload.user?.avatar;
        if (avatarConfigString) {
          state.avatarConfig = typeof avatarConfigString === 'string'
            ? JSON.parse(avatarConfigString)
            : avatarConfigString;
        } else {
          state.avatarConfig = null;
        }
      } catch (error) {
        console.error("Error parsing avatar config:", error);
        state.avatarConfig = null;
      }
    },
    clearAuthData: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.avatarConfig = null;
    },
  },
});

export const { setAuthData, clearAuthData } = authSlice.actions;
export default authSlice.reducer;