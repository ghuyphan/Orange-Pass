import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import UserRecord from "@/types/userType";
import { AvatarConfig } from "@zamplyy/react-native-nice-avatar";

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
  },
});

export const { setAuthData, clearAuthData, updateAvatarConfig } =
  authSlice.actions;
export default authSlice.reducer;
