import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from "expo-secure-store";
import { mapRecordToUserData } from "../refreshAuth";
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

/**
 * Clears sensitive authentication data (token, user ID) from SecureStore.
 */
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
    return await Promise.race([loginPromise, timeoutPromise]);
  } catch (error) {
    const loginError = error as LoginError;
    if (attempt < MAX_RETRIES && loginError.isTimeout) {
      console.log(`Login attempt ${attempt} timed out, retrying...`);
      return loginWithTimeout(email, password, attempt + 1);
    }
    throw error;
  }
};

/**
 * Authenticates a user with email and password, stores credentials, and updates state.
 * @param email The user's email address.
 * @param password The user's password.
 * @param rememberMe If true, saves the user ID for future "remember me" flows.
 * @param setupQuickLoginCredentials If true, saves the password securely for quick login.
 * @returns The PocketBase authentication data record.
 */
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

    const authData = await loginWithTimeout(email, password);

    if (!authData?.token || !authData?.record?.id) {
      throw new Error(t("loginScreen.errors.invalidResponse"));
    }

    // REFINEMENT: Clear old data only AFTER a successful login attempt.
    // This prevents wiping a valid session if the login fails temporarily.
    await clearStoredAuthData();

    const userId = authData.record.id;
    const secureWritePromises: Promise<void>[] = [
      SecureStore.setItemAsync(SECURE_KEYS.AUTH_TOKEN, authData.token),
      SecureStore.setItemAsync(SECURE_KEYS.USER_ID, userId),
      SecureStore.setItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD, password),
    ];

    // REFINEMENT: Simplified logic for saving user ID.
    // Save the user ID if either "Remember Me" or "Quick Login" is enabled.
    if (rememberMe || setupQuickLoginCredentials) {
      secureWritePromises.push(
        SecureStore.setItemAsync(SECURE_KEYS.SAVED_USER_ID, userId),
      );
    }

    if (setupQuickLoginCredentials) {
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

    if (error instanceof Error) {
      errorMessage = error.message;
    }

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
        // The message from validateInput or timeout is already user-friendly.
        // No need to overwrite it unless it's a generic error.
        break;
    }
    throw new Error(errorMessage);
  }
};

// --- Helper and Status Functions (with added JSDoc comments) ---

/**
 * Checks if the "Remember Me" flag is set in storage.
 * @returns True if "Remember Me" is enabled, otherwise false.
 */
export const getRememberMeStatus = (): boolean => {
  return storage.getString(MMKV_KEYS.REMEMBER_ME) === "true";
};

/**
 * Checks if the global "Quick Login" flag is set in storage.
 * @returns True if "Quick Login" is enabled, otherwise false.
 */
export const getQuickLoginStatus = (): boolean => {
  return storage.getString(MMKV_KEYS.QUICK_LOGIN_ENABLED) === "true";
};

/**
 * Retrieves the saved user ID from SecureStore.
 * @returns The user ID string, or null if not found or an error occurs.
 */
export const getSavedUserID = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.SAVED_USER_ID);
  } catch (error) {
    console.error("Failed to get saved userID:", error);
    return null;
  }
};

/**
 * Retrieves a securely stored password for a given user ID.
 * @param userID The ID of the user whose password is to be retrieved.
 * @returns The password string, or null if not found or an error occurs.
 */
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

/**
 * Retrieves the temporary password stored during the current session.
 * @returns The password string, or null if not found or an error occurs.
 */
export const getTemporaryPassword = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SECURE_KEYS.TEMPORARY_PASSWORD);
  } catch (error) {
    console.error("Failed to get temporary password:", error);
    return null;
  }
};

/**
 * Checks for the presence of an auth token in SecureStore.
 * @returns True if a token exists, otherwise false.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.AUTH_TOKEN);
    return !!token;
  } catch (error) {
    console.error("Failed to check authentication status:", error);
    return false;
  }
};

/**
 * Attempts to automatically log in a user if they have a valid quick login preference.
 * @returns True if auto-login was successful, otherwise false.
 */
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

// ... (The rest of the functions like quickLogin, getQuickLoginAccounts, etc., are already well-structured and remain the same)
// ... (I've included them here for completeness)

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
      .map(([userID_key]) => userID_key);
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
    }

    if (userID) {
      if (prefs[userID] !== undefined) {
        prefs[userID] = false;
      }
      await SecureStore.deleteItemAsync(getPasswordKeyForUserID(userID));
    } else {
      const allUserIDs = Object.keys(prefs);
      for (const id of allUserIDs) {
        prefs[id] = false;
        await SecureStore.deleteItemAsync(getPasswordKeyForUserID(id));
      }
    }
    storage.set(MMKV_KEYS.QUICK_LOGIN_PREFERENCES, JSON.stringify(prefs));

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