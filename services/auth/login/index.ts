import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from "expo-secure-store";
import { mapRecordToUserData } from "../refreshAuth";
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { t } from "@/i18n";
import { createTable, insertUser } from "@/services/localDB/userDB";
import { storage } from "@/utils/storage";
import { getEmailByUserID } from "@/services/localDB/userDB";

const LOGIN_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 3;

// Keys for secure storage (for ALL sensitive data)
export const SECURE_KEYS = {
  AUTH_TOKEN: "authToken",
  USER_ID: "userID",
  SAVED_USER_ID: "savedUserID", // Changed from SAVED_EMAIL to SAVED_USER_ID
  PASSWORD_PREFIX: "password_", // Prefix for storing passwords by userID
  TEMPORARY_PASSWORD: "temporaryPassword",
};

// Keys for MMKV storage (for non-sensitive data and preferences)
export const MMKV_KEYS = {
  REMEMBER_ME: "rememberMe",
  QUICK_LOGIN_ENABLED: "quickLoginEnabled",
  QUICK_LOGIN_PREFERENCES: "quickLoginPreferences",
};

interface LoginError {
  status?: number;
  message: string;
  isTimeout?: boolean;
}

// Helper to get the secure key for a specific email's password
// Now exported so it can be used in other files
export const getPasswordKeyForUserID = (userID: string): string => {
  return `${SECURE_KEYS.PASSWORD_PREFIX}${userID}`;
};


const clearStoredAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(SECURE_KEYS.USER_ID);
    // Don't clear saved credentials here - they're needed for quick login
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
  rememberMe = false,
  enableQuickLogin = false
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

    // Store auth data in SecureStore
    await SecureStore.setItemAsync(SECURE_KEYS.AUTH_TOKEN, authData.token);
    await SecureStore.setItemAsync(SECURE_KEYS.USER_ID, authData.record.id);
    
    // Store the password temporarily for the quick login prompt
    await SecureStore.setItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD, password);

    // Handle remember me preference
    if (rememberMe) {
      await SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, authData.record.id);
      storage.set(MMKV_KEYS.REMEMBER_ME, "true");
    } else {
      storage.set(MMKV_KEYS.REMEMBER_ME, "false");
    }
    
    // Only set up quick login if explicitly enabled
    if (enableQuickLogin) {
      await SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, authData.record.id);
      // Store password for this specific userID
      await SecureStore.setItemAsync(getPasswordKeyForUserID(authData.record.id), password);
      storage.set(MMKV_KEYS.QUICK_LOGIN_ENABLED, "true");
      
      // Update quick login preferences for this userID
      const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
      try {
        const prefs = JSON.parse(prefsString);
        prefs[authData.record.id] = true;
        storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(prefs));
      } catch (e) {
        // If parsing fails, create a new preferences object
        const newPrefs = { [authData.record.id]: true };
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

// Helper function to check if quick login is enabled
export const getQuickLoginStatus = (): boolean => {
  return storage.getBoolean(MMKV_KEYS.QUICK_LOGIN_ENABLED) ?? false;
};

// Helper function to get saved email (now from SecureStore)
export const getSavedUserID = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.SAVED_USER_ID);
  } catch (error) {
    console.error("Failed to get saved userID:", error);
    return null;
  }
};


// Helper function to get saved password for a specific email
export const getSavedPasswordForUserID = async (userID: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(getPasswordKeyForUserID(userID));
  } catch (error) {
    console.error(`Failed to get saved password for ${userID}:`, error);
    return null;
  }
};

// Helper function to get temporary password
export const getTemporaryPassword = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to get temporary password:", error);
    return null;
  }
};

// Check if a user is currently authenticated
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.AUTH_TOKEN);
    return !!token;
  } catch (error) {
    console.error("Failed to check authentication status:", error);
    return false;
  }
};

// Attempt auto login with saved credentials
export const attemptAutoLogin = async (): Promise<boolean> => {
  try {
    const userID = await getSavedUserID();
    if (!userID) return false;
    
    const password = await getSavedPasswordForUserID(userID);
    const quickLoginEnabled = getQuickLoginStatus();
    const rememberMe = getRememberMeStatus();

    if (userID && password && quickLoginEnabled) {
      // Retrieve the email associated with the userID
      const email = await getEmailByUserID(userID);
      if (!email) {
        throw new Error("Email not found for userID");
      }

      // Use quick login (with email and password)
      await login(email, password, rememberMe, quickLoginEnabled);
      return true;
    } else if (userID && rememberMe) {
      // We have userID but no password - can't auto login but can prefill userID
      return false;
    }

    return false;
  } catch (error) {
    console.error("Auto-login failed:", error);
    return false;
  }
};



// Quick login with a specific email
export const quickLogin = async (userID: string): Promise<boolean> => {
  try {
    // Check if quick login is enabled for this userID
    const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    const prefs = JSON.parse(prefsString);
    
    if (!prefs[userID]) {
      throw new Error("Quick login not enabled for this userID");
    }
    
    // Get the saved password for this specific userID
    const password = await getSavedPasswordForUserID(userID);
    if (!password) {
      throw new Error("Password not available for quick login");
    }

    // Retrieve the email associated with the userID
    const email = await getEmailByUserID(userID);
    if (!email) {
      throw new Error("Email not found for userID");
    }
    
    // Perform login
    await login(email, password, true, true);
    return true;
  } catch (error) {
    console.error("Quick login failed:", error);
    return false;
  }
};

// Get all accounts with quick login enabled
export const getQuickLoginAccounts = async (): Promise<string[]> => {
  try {
    const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
    const prefs = JSON.parse(prefsString);
    
    // Filter userIDs that have quick login enabled
    return Object.entries(prefs)
      .filter(([_, enabled]) => enabled === true)
      .map(([userID]) => userID);
  } catch (error) {
    console.error("Failed to get quick login accounts:", error);
    return [];
  }
};


// Check if user has already made a decision about quick login
export const hasQuickLoginPreference = async (email: string): Promise<boolean> => {
  try {
    const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES);
    if (!prefsString) {
      return false;
    }

    const prefs = JSON.parse(prefsString);
    return prefs[email] !== undefined;
  } catch (error) {
    console.error("Failed to check quick login preference:", error);
    return false;
  }
};

// Disable quick login for a specific email or all emails
export const disableQuickLogin = async (userID?: string): Promise<void> => {
  try {
    if (userID) {
      // Disable for specific userID
      const prefsString = storage.getString(MMKV_KEYS.QUICK_LOGIN_PREFERENCES) || "{}";
      try {
        const prefs = JSON.parse(prefsString);
        if (prefs[userID]) {
          prefs[userID] = false;
          storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(prefs));
        }
      } catch (e) {
        console.error("Failed to update quick login preferences:", e);
      }
      
      // Delete the password for this specific userID
      await SecureStore.deleteItemAsync(getPasswordKeyForUserID(userID));
      
      // If this is the currently saved userID, update quick login enabled status
      const savedUserID = await getSavedUserID();
      if (savedUserID === userID) {
        storage.delete(MMKV_KEYS.QUICK_LOGIN_ENABLED);
      }
    } else {
      // Disable for all userIDs
      const accounts = await getQuickLoginAccounts();
      
      // Delete passwords for all accounts
      for (const userID of accounts) {
        await SecureStore.deleteItemAsync(getPasswordKeyForUserID(userID));
      }
      
      storage.delete(MMKV_KEYS.QUICK_LOGIN_PREFERENCES);
      storage.delete(MMKV_KEYS.QUICK_LOGIN_ENABLED);
    }
    
    // Always clean up temporary password
    await SecureStore.deleteItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to disable quick login:", error);
  }
};

// Clean up temporary password
export const cleanupTemporaryPassword = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to clean up temporary password:", error);
  }
};
