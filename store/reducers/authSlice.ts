// In your authSlice.ts file:
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UserRecord from "@/types/userType";
import { AvatarConfig } from "@zamplyy/react-native-nice-avatar";

interface AuthState {
  token: string | null;
  user: UserRecord | null;
  isAuthenticated: boolean;
  avatarConfig: AvatarConfig | null;
  // Store dates as strings for Redux serialization
  isSyncing: boolean;
  lastSynced: string | null; // ISO string instead of Date
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  avatarConfig: null,
  isSyncing: false,
  lastSynced: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthData: (
      state,
      action: PayloadAction<{ token: string; user: UserRecord }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;

      // Parse avatar config from the user record.
      try {
        const avatarConfigData = action.payload.user?.avatar;
        if (avatarConfigData) {
          state.avatarConfig =
            typeof avatarConfigData === "string"
              ? JSON.parse(avatarConfigData)
              : avatarConfigData;
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
      // Keep sync information when clearing auth
      state.lastSynced = null;
    },
    updateAvatarConfig: (
      state,
      action: PayloadAction<AvatarConfig>
    ) => {
      // Update the avatarConfig in the global state.
      state.avatarConfig = action.payload;
      // Also update the user record with the new avatar configuration as an object.
      if (state.user) {
        state.user.avatar = action.payload;
      }
    },
    // Modified to accept string instead of Date
    setSyncStatus: (
      state,
      action: PayloadAction<{ isSyncing: boolean; lastSynced?: string }>
    ) => {
      state.isSyncing = action.payload.isSyncing;
      if (action.payload.lastSynced) {
        state.lastSynced = action.payload.lastSynced;
      }
    },
  },
});

export const { 
  setAuthData, 
  clearAuthData, 
  updateAvatarConfig,
  setSyncStatus 
} = authSlice.actions;

export default authSlice.reducer;
