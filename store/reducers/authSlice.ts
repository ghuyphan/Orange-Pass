// In your authSlice.ts file:
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UserRecord from "@/types/userType";
import { AvatarConfig } from "@zamplyy/react-native-nice-avatar";

interface AuthState {
  token: string | null;
  user: UserRecord | null;
  isAuthenticated: boolean;
  avatarConfig: AvatarConfig | null;
  isSyncing: boolean;
  lastSynced: string | null; // ISO string instead of Date
  justLoggedIn: boolean; // <-- ADDED: Flag for initial sync logic
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  avatarConfig: null,
  isSyncing: false,
  lastSynced: null,
  justLoggedIn: false, // <-- ADDED: Initial state
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
      state.justLoggedIn = true; // <-- MODIFIED: Set flag on login

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
      state.lastSynced = null;
      state.justLoggedIn = false; // <-- MODIFIED: Reset flag on logout
    },
    updateAvatarConfig: (state, action: PayloadAction<AvatarConfig>) => {
      state.avatarConfig = action.payload;
      if (state.user) {
        state.user.avatar = action.payload;
      }
    },
    setSyncStatus: (
      state,
      action: PayloadAction<{ isSyncing: boolean; lastSynced?: string }>
    ) => {
      state.isSyncing = action.payload.isSyncing;
      if (action.payload.lastSynced) {
        state.lastSynced = action.payload.lastSynced;
      }
    },
    // --- NEW REDUCER ---
    resetJustLoggedInFlag: (state) => {
      state.justLoggedIn = false;
    },
  },
});

export const {
  setAuthData,
  clearAuthData,
  updateAvatarConfig,
  setSyncStatus,
  resetJustLoggedInFlag, // <-- ADDED: Export the new action
} = authSlice.actions;

export default authSlice.reducer;