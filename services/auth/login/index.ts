import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from "expo-secure-store";
import { mapRecordToUserData } from "../refreshAuth";
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { t } from "@/i18n";
import { createTable, insertUser } from "@/services/localDB/userDB";
import { storage } from "@/utils/storage";

const LOGIN_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 3;

// Keys for secure storage (ONLY for sensitive data)
const SECURE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userID",
};

// Keys for MMKV storage (for non-sensitive data)
const MMKV_KEYS = {
  SAVED_EMAIL: "savedEmail",
  REMEMBER_ME: "rememberMe",
};

interface LoginError {
  status?: number;
  message: string;
  isTimeout?: boolean;
}

const clearStoredAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID);
  } catch (error) {
    console.error("Failed to clear stored auth data:", error);
  }
};

const validateInput = (email: string, password: string) => {
  if (!email || !password) {
    throw new Error(t("loginScreen.errors.emptyFields"));
  }
  if (!email.includes("@")) {
    throw new Error(t("loginScreen.errors.invalidEmail"));
  }
  if (password.length < 6) {
    throw new Error(t("loginScreen.errors.passwordTooShort"));
  }
};

const loginWithTimeout = async (
  email: string,
  password: string,
  attempt = 1
): Promise<any> => {
  const loginPromise = pb.collection("users").authWithPassword(email, password);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const timeoutError: LoginError = new Error(
        t("loginScreen.errors.timeout")
      ) as LoginError;
      timeoutError.isTimeout = true;
      reject(timeoutError);
    }, LOGIN_TIMEOUT);
  });

  try {
    const authData = await Promise.race([loginPromise, timeoutPromise]);
    return authData;
  } catch (error) {
    const loginError = error as LoginError;
    if (attempt < MAX_RETRIES && loginError.isTimeout) {
      return loginWithTimeout(email, password, attempt + 1);
    }
    throw error;
  }
};

export const login = async (
  email: string,
  password: string,
  rememberMe = false
) => {
  Keyboard.dismiss();

  try {
    const isOffline = store.getState().network.isOffline;
    if (isOffline) {
      throw new Error(t("loginScreen.errors.offlineNotice"));
    }

    validateInput(email, password);
    await clearStoredAuthData();

    const authData = await loginWithTimeout(email, password);

    if (!authData?.token || !authData?.record?.id) {
      throw new Error(t("loginScreen.errors.invalidResponse"));
    }

    // Store sensitive data in SecureStore
    await SecureStore.setItemAsync(SECURE_KEYS.AUTH_TOKEN, authData.token);
    await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, authData.record.id);

    // Store non-sensitive data in MMKV
    if (rememberMe) {
      storage.set(MMKV_KEYS.SAVED_EMAIL, email);
      storage.set(MMKV_KEYS.REMEMBER_ME, "true");
    } else {
      storage.delete(MMKV_KEYS.SAVED_EMAIL);
      storage.delete(MMKV_KEYS.REMEMBER_ME);
    }

    const userData = mapRecordToUserData(authData.record);
    store.dispatch(setAuthData({ token: authData.token, user: userData }));

    await createTable();
    await insertUser(userData);

    return authData;
  } catch (error) {
    console.error("Login error:", error);
    const errorData = error as LoginError;

    switch (errorData.status) {
      case 400:
        throw new Error(t("loginScreen.errors.400"));
      case 401:
        throw new Error(t("loginScreen.errors.invalidCredentials"));
      case 429:
        throw new Error(t("loginScreen.errors.tooManyAttempts"));
      case 500:
        throw new Error(t("loginScreen.errors.500"));
      default:
        if (errorData.isTimeout) {
          throw new Error(t("loginScreen.errors.timeout"));
        }
        throw error;
    }
  }
};

// Helper function to get remember me status
export const getRememberMeStatus = (): boolean => {
  return storage.getBoolean(MMKV_KEYS.REMEMBER_ME) ?? false;
};

// Helper function to get saved email
export const getSavedEmail = (): string | undefined => {
  return storage.getString(MMKV_KEYS.SAVED_EMAIL);
};

// Check if a user is currently authenticated (still uses SecureStore)
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.AUTH_TOKEN);
    return !!token;
  } catch (error) {
    console.error("Failed to check authentication status:", error);
    return false;
  }
};

export const attemptAutoLogin = async (password: string): Promise<boolean> => {
  try {
    const email = getSavedEmail(); // No await, using MMKV
    const hasRememberMe = getRememberMeStatus(); // No await, using MMKV

    if (email && hasRememberMe && password) {
      await login(email, password, true);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Auto-login failed:", error);
    return false;
  }
};
