// services/auth/login.ts
import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from "expo-secure-store";
import { mapRecordToUserData } from "../refreshAuth"; // Assuming this path is correct
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { t } from "@/i18n";
import {
  createTable,
  insertUser,
  getEmailByUserID,
} from "@/services/localDB/userDB";
import { storage } from "@/utils/storage";

const LOGIN_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 3;

// Keys for secure storage (for ALL sensitive data)
export const SECURE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userID",
  SAVED_USER_ID: "savedUserID",
  PASSWORD_PREFIX: "password_",
  TEMPORARY_PASSWORD: "temporaryPassword",
};

// Keys for MMKV storage (for non-sensitive data and preferences)
export const MMKV_KEYS = {
  REMEMBER_ME: "rememberMe",
  QUICK_LOGIN_ENABLED: "quickLoginEnabled",
  QUICK_LOGIN_PREFERENCES: "quickLoginPreferences",
};

// Interface for the structure of quick login preferences
interface QuickLoginPreferences {
  [userId: string]: boolean; // e.g., { "user123": true, "user456": false }
}

interface LoginError extends Error {
  status?: number;
  isTimeout?: boolean;
}

export const getPasswordKeyForUserID = (userID: string): string => {
  return `${SECURE_KEYS.PASSWORD_PREFIX}${userID}`;
};

const clearStoredAuthData = async () => {
  try {
    const promises = [
      SecureStore.deleteItemAsync(SECURE_KEYS.AUTH_TOKEN),
      SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID),
    ];
    await Promise.all(promises);
  } catch (error) {
    console.error("Failed to clear stored auth data:", error);
  }
};

const validateInput = (email: string, password: string) => {
  if (!email || !password) {
    throw new Error(t("loginScreen.errors.emptyFields"));
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    throw new Error(t("loginScreen.errors.invalidEmail"));
  }
  if (password.length < 8) {
    // PocketBase default min password length
    throw new Error(t("loginScreen.errors.passwordTooShort"));
  }
};

const loginWithTimeout = async (
  email: string,
  password: string,
  attempt = 1,
): Promise<any> => {
  const loginPromise = pb.collection("users").authWithPassword(email, password);
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const timeoutError = new Error(
        t("loginScreen.errors.timeout"),
      ) as LoginError;
      timeoutError.isTimeout = true;
      reject(timeoutError);
    }, LOGIN_TIMEOUT);
    loginPromise.finally(() => clearTimeout(timer));
  });

  try {
    const authData = await Promise.race([loginPromise, timeoutPromise]);
    return authData;
  } catch (error) {
    const loginError = error as LoginError;
    if (attempt < MAX_RETRIES && loginError.isTimeout) {
       (`Login attempt ${attempt} timed out, retrying...`);
      return loginWithTimeout(email, password, attempt + 1);
    }
    throw error;
  }
};

export const login = async (
  email: string,
  password: string,
  rememberMe = false,
  setupQuickLoginCredentials = false,
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

    const userId = authData.record.id;
    const secureWritePromises: Promise<void>[] = [
      SecureStore.setItemAsync(SECURE_KEYS.AUTH_TOKEN, authData.token),
      SecureStore.setItemAsync(SECURE_KEYS.USER_ID, userId),
      SecureStore.setItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD, password),
    ];

    if (rememberMe) {
      secureWritePromises.push(
        SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userId),
      );
    }

    if (setupQuickLoginCredentials) {
      if (!rememberMe) {
        secureWritePromises.push(
          SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userId),
        );
      }
      secureWritePromises.push(
        SecureStore.setItemAsync(getPasswordKeyForUserID(userId), password),
      );
    }

    await Promise.all(secureWritePromises);

    storage.set(MMKV_KEYS.REMEMBER_ME, rememberMe ? "true" : "false");

    if (setupQuickLoginCredentials) {
      storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, "true");
      const prefsString =
        storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
      try {
        const prefs: QuickLoginPreferences = JSON.parse(prefsString);
        prefs[userId] = true;
        storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(prefs));
      } catch (e) {
        console.error("Failed to parse QUICK_LOGIN_PREFERENCES, resetting.", e);
        const newPrefs: QuickLoginPreferences = { [userId]: true };
        storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(newPrefs));
      }
    }

    const userData = mapRecordToUserData(authData.record);
    store.dispatch(setAuthData({ token: authData.token, user: userData }));

    await createTable();
    await insertUser(userData);

    return authData;
  } catch (error) {
    console.error("Login error:", error);
    const errorData = error as LoginError;
    let errorMessage = t("loginScreen.errors.unknown");
    if (error instanceof Error) errorMessage = error.message;

    switch (errorData.status) {
      case 400:
        errorMessage = t("loginScreen.errors.invalidCredentials");
        break;
      case 429:
        errorMessage = t("loginScreen.errors.tooManyAttempts");
        break;
      case 500:
        errorMessage = t("loginScreen.errors.500");
        break;
      default:
        if (errorData.isTimeout) {
          errorMessage = t("loginScreen.errors.timeout");
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        break;
    }
    throw new Error(errorMessage);
  }
};

export const getRememberMeStatus = (): boolean => {
  return storage.getString(MMKV_KEYS.REMEMBER_ME) === "true";
};

export const getQuickLoginStatus = (): boolean => {
  return storage.getString(MMKV_KEYS.QUICK_LOGIN_ENABLED) === "true";
};

export const getSavedUserID = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.SAVED_USER_ID);
  } catch (error) {
    console.error("Failed to get saved userID:", error);
    return null;
  }
};

export const getSavedPasswordForUserID = async (
  userID: string,
): Promise<string | null> => {
  if (!userID) return null;
  try {
    return await SecureStore.getItemAsync(getPasswordKeyForUserID(userID));
  } catch (error) {
    console.error(`Failed to get saved password for ${userID}:`, error);
    return null;
  }
};

export const getTemporaryPassword = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to get temporary password:", error);
    return null;
  }
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.AUTH_TOKEN);
    return !!token;
  } catch (error) {
    console.error("Failed to check authentication status:", error);
    return false;
  }
};

export const attemptAutoLogin = async (): Promise<boolean> => {
  try {
    const userID = await getSavedUserID();
    if (!userID) return false;

    const prefsString =
      storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    const prefs: QuickLoginPreferences = JSON.parse(prefsString);

    if (prefs[userID] === true) {
      const password = await getSavedPasswordForUserID(userID);
      if (password) {
        const email = await getEmailByUserID(userID);
        if (!email) {
          console.error(
            `Auto-login: Email not found for userID ${userID}. Clearing saved credentials.`,
          );
          await disableQuickLogin(userID);
          return false;
        }
        await login(email, password, true, true);
        return true;
      } else {
        console.warn(
          `Auto-login: Password not found for userID ${userID} with quick login pref. Disabling.`,
        );
        await disableQuickLogin(userID);
      }
    }
    return false;
  } catch (error) {
    console.error("Auto-login failed:", error);
    return false;
  }
};

export const quickLogin = async (userID: string): Promise<boolean> => {
  try {
    const prefsString =
      storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    const prefs: QuickLoginPreferences = JSON.parse(prefsString);

    if (prefs[userID] !== true) {
      return false;
    }

    const password = await getSavedPasswordForUserID(userID);
    if (!password) {
      console.warn(
        `Password not found for quick login userID: ${userID}. Disabling.`,
      );
      await disableQuickLogin(userID);
      return false;
    }

    const email = await getEmailByUserID(userID);
    if (!email) {
      console.error(
        `Email not found for quick login userID: ${userID}. Disabling.`,
      );
      await disableQuickLogin(userID);
      return false;
    }

    await login(email, password, true, true);
    return true;
  } catch (error) {
    console.error("Quick login failed:", error);
    return false;
  }
};

export const getQuickLoginAccounts = async (): Promise<string[]> => {
  try {
    const prefsString =
      storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    const prefs: QuickLoginPreferences = JSON.parse(prefsString);
    return Object.entries(prefs)
      .filter(([_, enabled]) => enabled === true)
      .map(([userID_key]) => userID_key); // Renamed to avoid conflict
  } catch (error) {
    console.error("Failed to get quick login accounts:", error);
    return [];
  }
};

export const hasQuickLoginPreference = async (
  userID: string,
): Promise<boolean> => {
  if (!userID) return false;
  try {
    const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES);
    if (!prefsString) return false;
    const prefs: QuickLoginPreferences = JSON.parse(prefsString);
    return prefs[userID] !== undefined;
  } catch (error) {
    console.error("Failed to check quick login preference:", error);
    return false;
  }
};

export const disableQuickLogin = async (userID?: string): Promise<void> => {
  try {
    const prefsString =
      storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    let prefs: QuickLoginPreferences = {};
    try {
      prefs = JSON.parse(prefsString);
    } catch (e) {
      console.error(
        "Failed to parse QUICK_LOGIN_PREFERENCES during disable, resetting.",
        e,
      );
      // prefs remains {} which is a valid QuickLoginPreferences
    }

    if (userID) {
      if (prefs[userID] !== undefined) { // Check if property exists before setting
        prefs[userID] = false;
      }
      await SecureStore.deleteItemAsync(getPasswordKeyForUserID(userID));
    } else {
      // Disable for all users
      const allUserIDs = Object.keys(prefs);
      for (const id of allUserIDs) {
        prefs[id] = false;
        await SecureStore.deleteItemAsync(getPasswordKeyForUserID(id));
      }
    }
    storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(prefs));

    // Check if any user still has quick login enabled to update the global flag
    const anyStillEnabled = Object.values(prefs).some((val) => val === true);
    if (!anyStillEnabled) {
      storage.delete(MMKV_KEYS.QUICK_LOGIN_ENABLED);
    }
  } catch (error) {
    console.error("Failed to disable quick login:", error);
  }
};

export const cleanupTemporaryPassword = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to clean up temporary password:", error);
  }
};
