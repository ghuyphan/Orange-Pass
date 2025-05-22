import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from "expo-secure-store";
import { store } from "@/store";
import { setQrData } from "@/store/reducers/qrSlice";
import {
  setAuthData,
  clearAuthData,
  setSyncStatus,
} from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getUserById } from "@/services/localDB/userDB";
import { t } from "@/i18n";
// Ensure getQrCodesByUserId is imported
import { getQrCodesByUserId } from "@/services/localDB/qrDB";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { storage } from "@/utils/storage";

const LOG_PREFIX_AUTH = "[AuthService]";
export const GUEST_MODE_KEY = "useGuestMode";
export const GUEST_USER_ID = ""; // Ensure this is an empty string or a unique constant

const AuthErrorStatus = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  ServerError: 500,
} as const;

interface AuthError extends Error {
  status?: number;
  data?: {
    status?: number;
    message?: string;
  };
}

export function mapRecordToUserData(record: Record<string, any>): UserRecord {
  let avatarData: any = record.avatar ?? {};
  if (typeof record.avatar === "string") {
    try {
      avatarData = JSON.parse(record.avatar);
    } catch (e) {
      console.warn(
        LOG_PREFIX_AUTH,
        "Failed to parse avatar string from record, using raw or default.",
        e
      );
      avatarData = record.avatar ?? {};
    }
  } else if (typeof record.avatar === "object" && record.avatar !== null) {
    avatarData = record.avatar;
  }

  return {
    id: record.id ?? "",
    username: record.username ?? "",
    email: record.email ?? "",
    verified: record.verified ?? false,
    name: record.name ?? "",
    avatar: avatarData,
  };
}

let isRefreshing = false;

async function loadLocalData(): Promise<boolean> {
  try {
    const userID = await SecureStore.getItemAsync("userID");
    const authToken = await SecureStore.getItemAsync("authToken");

    if (!userID || userID === GUEST_USER_ID) {
      console.log(
        LOG_PREFIX_AUTH,
        "No valid userID found in SecureStore for logged-in user."
      );
      return false;
    }
    console.log(LOG_PREFIX_AUTH, `UserID found for logged-in user: ${userID}`);

    if (authToken) {
      const expirationDate = getTokenExpirationDate(authToken);
      const now = new Date();
      if (expirationDate && expirationDate < now) {
        console.log(
          LOG_PREFIX_AUTH,
          "Token expired, cannot authenticate in offline mode with this token."
        );
        await clearAuthDataAndSecureStorage();
        return false;
      }
    } else {
      console.log(
        LOG_PREFIX_AUTH,
        "UserID found but no authToken. Clearing auth."
      );
      await clearAuthDataAndSecureStorage();
      return false;
    }

    const localUserData = await getUserById(userID);
    if (!localUserData) {
      console.log(
        LOG_PREFIX_AUTH,
        "No local user data found for userID. Clearing auth."
      );
      await clearAuthDataAndSecureStorage();
      return false;
    }
    console.log(LOG_PREFIX_AUTH, "Local user data loaded.");

    const localQrData = await getQrCodesByUserId(userID);
    console.log(LOG_PREFIX_AUTH, "Local QR data loaded for logged-in user.");

    store.dispatch(
      setAuthData({
        token: authToken,
        user: localUserData,
      })
    );
    store.dispatch(setQrData(localQrData));
    store.dispatch(setSyncStatus({ isSyncing: false, lastSynced: undefined }));
    console.log(
      LOG_PREFIX_AUTH,
      "Local data dispatched to Redux for logged-in user."
    );

    return true;
  } catch (error) {
    console.error(
      LOG_PREFIX_AUTH,
      "Failed to load local data for logged-in user:",
      error
    );
    await clearAuthDataAndSecureStorage();
    return false;
  }
}

export async function checkGuestModeStatus(): Promise<boolean> {
  try {
    return storage.getBoolean(GUEST_MODE_KEY) ?? false;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "Error checking guest mode status:", error);
    return false;
  }
}

export async function initializeGuestMode(): Promise<boolean> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync("authToken"),
      SecureStore.deleteItemAsync("userID"),
    ]);

    storage.set(GUEST_MODE_KEY, true);

    const guestUser: UserRecord = {
      id: GUEST_USER_ID,
      username: "guest",
      email: "",
      verified: false,
      name: "Guest User",
      avatar: {},
    };

    store.dispatch(setAuthData({ token: "", user: guestUser }));
    // Initialize QR data as empty. loadGuestQrData will populate it if needed.
    store.dispatch(setQrData([]));
    store.dispatch(setSyncStatus({ isSyncing: false, lastSynced: undefined }));

    console.log(LOG_PREFIX_AUTH, "Guest mode session initialized.");
    return true;
  } catch (error) {
    console.error(
      LOG_PREFIX_AUTH,
      "Failed to initialize guest mode session:",
      error
    );
    store.dispatch(clearAuthData());
    store.dispatch(setQrData([]));
    return false;
  }
}

/**
 * Loads QR codes for the GUEST_USER_ID from local DB into Redux.
 * This function is called by RootLayout after guest mode session is confirmed.
 */
export async function loadGuestQrData(): Promise<boolean> {
  try {
    console.log(
      LOG_PREFIX_AUTH,
      "Attempting to load QR data for guest user..."
    );
    const startTime = performance.now(); // Or Date.now()
    const guestQrData = await getQrCodesByUserId(GUEST_USER_ID);
    const endTime = performance.now();
    console.log(
      LOG_PREFIX_AUTH,
      `getQrCodesByUserId took ${endTime - startTime} ms`
    );
    store.dispatch(setQrData(guestQrData));
    console.log(
      LOG_PREFIX_AUTH,
      `Loaded ${guestQrData.length} QR codes for guest user.`
    );
    return true;
  } catch (dbError) {
    console.error(
      LOG_PREFIX_AUTH,
      "Failed to load QR data for guest user from local DB:",
      dbError
    );
    store.dispatch(setQrData([])); // Fallback to empty if DB read fails
    return false;
  }
}

export async function exitGuestMode(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, "Exiting guest mode...");
    storage.set(GUEST_MODE_KEY, false);
    // Note: Clearing auth data (SecureStore, Redux user) will be handled
    // by the subsequent login process or by checkInitialAuth on next app start.
    console.log(LOG_PREFIX_AUTH, "Guest mode flag set to false.");
    return true;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "Failed to exit guest mode:", error);
    return false;
  }
}

export async function clearAuthDataAndSecureStorage() {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync("authToken"),
      SecureStore.deleteItemAsync("userID"),
    ]);
  } catch (secureStoreError) {
    console.error(
      LOG_PREFIX_AUTH,
      "Error clearing SecureStore:",
      secureStoreError
    );
    // Continue to clear Redux state even if SecureStore fails
  }
  store.dispatch(clearAuthData());
  store.dispatch(setQrData([])); // Also clear QR data from Redux
  console.log(
    LOG_PREFIX_AUTH,
    "Cleared auth data from Redux and attempted to clear SecureStorage."
  );
}

export async function checkInitialAuth(
  onboardingPending: boolean
): Promise<boolean> {
  try {
    console.log(
      LOG_PREFIX_AUTH,
      `checkInitialAuth: Starting... Onboarding pending: ${onboardingPending}`
    );
    const useGuestModeStorage = await checkGuestModeStatus();

    if (useGuestModeStorage) {
      console.log(
        LOG_PREFIX_AUTH,
        "checkInitialAuth: User prefers guest mode (from storage)."
      );
      const guestSessionInitialized = await initializeGuestMode();
      if (guestSessionInitialized) {
        console.log(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Guest session initialized by initializeGuestMode, now loading associated QR data..."
        );
        await loadGuestQrData(); // Load QR data immediately after guest session setup
        console.log(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Guest QR data loading complete."
        );
        return true; // Guest session is active
      } else {
        console.warn(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Failed to initialize guest session despite preference. No active session."
        );
        return false; // Guest session initialization failed
      }
    }

    // Not in guest mode (preference is false)
    if (onboardingPending) {
      console.log(
        LOG_PREFIX_AUTH,
        "checkInitialAuth: Onboarding is pending and not in guest mode; no active user session."
      );
      return false; // No authenticated session if onboarding isn't complete
    }

    // Onboarding is complete, and not in guest mode. Check for logged-in user.
    console.log(
      LOG_PREFIX_AUTH,
      "checkInitialAuth: Onboarding complete, not guest. Checking for logged-in user data..."
    );
    const hasLocalLoggedInData = await loadLocalData();
    console.log(
      LOG_PREFIX_AUTH,
      `checkInitialAuth: Local logged-in data presence: ${hasLocalLoggedInData}`
    );

    // Token refresh logic for authenticated users
    const isOffline = store.getState().network.isOffline;
    if (!isOffline && hasLocalLoggedInData) {
      const authToken = await SecureStore.getItemAsync("authToken");
      const currentUserID = store.getState().auth.user?.id; // Get current user ID from Redux

      // Ensure token and user ID are valid and not for guest
      if (authToken && currentUserID && currentUserID !== GUEST_USER_ID) {
        console.log(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Device online, logged-in user. Scheduling background token refresh."
        );
        // Run as a fire-and-forget, non-blocking task
        setTimeout(async () => {
          const currentLastSynced = store.getState().auth.lastSynced;
          console.log(
            LOG_PREFIX_AUTH,
            "checkInitialAuth: Background token refresh task starting..."
          );
          store.dispatch(
            setSyncStatus({
              isSyncing: true,
              lastSynced: currentLastSynced ?? undefined,
            })
          );
          const refreshSuccess = await refreshAuthToken(authToken);
          store.dispatch(
            setSyncStatus({
              isSyncing: false,
              lastSynced: refreshSuccess
                ? new Date().toISOString()
                : currentLastSynced ?? undefined,
            })
          );
          console.log(
            LOG_PREFIX_AUTH,
            "checkInitialAuth: Background token refresh task completed."
          );
        }, 0);
      }
    } else if (isOffline && hasLocalLoggedInData) {
      console.log(
        LOG_PREFIX_AUTH,
        "checkInitialAuth: Device offline, but local logged-in data exists. Setting offline message."
      );
      store.dispatch(setErrorMessage(t("network.offlineMode")));
    }

    return hasLocalLoggedInData; // True if authenticated user data loaded, false otherwise
  } catch (error) {
    console.error(
      LOG_PREFIX_AUTH,
      "checkInitialAuth: CRITICAL error during initial auth check:",
      error
    );
    await clearAuthDataAndSecureStorage(); // Ensure clean state on critical failure
    return false;
  }
}

async function handleTokenRefreshError(error: AuthError): Promise<boolean> {
  const errorStatus = error.status ?? error.data?.status ?? 0;
  const userID = await SecureStore.getItemAsync("userID");

  console.error(LOG_PREFIX_AUTH, "Token Refresh Error:", {
    status: errorStatus,
    message: error.message,
    data: error.data,
  });

  if (errorStatus === AuthErrorStatus.ServerError || errorStatus === 0) {
    if (userID && userID !== GUEST_USER_ID) {
      store.dispatch(
        setErrorMessage(t("authRefresh.warnings.usingOfflineData"))
      );
      return true; // Indicate fallback to local data
    }
  } else if (errorStatus === AuthErrorStatus.Unauthorized) {
    console.log(
      LOG_PREFIX_AUTH,
      "Unauthorized error during token refresh. Clearing all auth data."
    );
    await clearAuthDataAndSecureStorage();
    store.dispatch(
      setErrorMessage(t("authRefresh.warnings.sessionExpiredBackground"))
    );
  } else {
    switch (errorStatus) {
      case AuthErrorStatus.Forbidden:
      case AuthErrorStatus.NotFound:
        store.dispatch(
          setErrorMessage(t(`authRefresh.warnings.${errorStatus}`))
        );
        break;
      default:
        store.dispatch(setErrorMessage(t("authRefresh.warnings.syncFailed")));
        break;
    }
  }
  return false; // Refresh failed
}

export async function refreshAuthToken(authToken: string): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const storedUserID = await SecureStore.getItemAsync("userID");

  if (isOffline || !storedUserID || storedUserID === GUEST_USER_ID) {
    console.log(
      LOG_PREFIX_AUTH,
      "RefreshAuthToken: Skipped due to offline, no userID, or guest user."
    );
    // Return true if there's a valid non-guest user ID, even if offline,
    // as the session might still be considered valid locally.
    return !!storedUserID && storedUserID !== GUEST_USER_ID;
  }

  if (isRefreshing) {
    console.log(LOG_PREFIX_AUTH, "RefreshAuthToken: Already in progress.");
    return false; // Or return a promise that resolves when the current refresh completes
  }

  isRefreshing = true;
  let success = false;
  console.log(
    LOG_PREFIX_AUTH,
    `RefreshAuthToken: Attempting for user ${storedUserID}`
  );

  try {
    pb.authStore.save(authToken, null);

    if (!pb.authStore.isValid) {
      console.log(
        LOG_PREFIX_AUTH,
        "RefreshAuthToken: Token in PocketBase store is invalid before refresh."
      );
      await SecureStore.deleteItemAsync("authToken");
      const currentUser = store.getState().auth.user;
      if (currentUser && currentUser.id === storedUserID) {
        // Ensure we only modify current user's token
        store.dispatch(setAuthData({ token: "", user: currentUser }));
      } else {
        // This case should ideally not happen if storedUserID matches Redux user.
        // If they don't match, clearing all might be too aggressive.
        // Consider just clearing the token from Redux if user is null or different.
        store.dispatch(clearAuthData());
      }
      throw {
        status: AuthErrorStatus.Unauthorized,
        message: "Token invalid before refresh",
      } as AuthError;
    }

    const authDataResponse = await pb.collection("users").authRefresh();

    if (!authDataResponse?.token || !authDataResponse?.record) {
      console.error(
        LOG_PREFIX_AUTH,
        "RefreshAuthToken: Invalid response from authRefresh."
      );
      throw new Error("Invalid authentication refresh response");
    }

    const newAuthToken = authDataResponse.token;
    const refreshedUserRecord = authDataResponse.record;
    const userData = mapRecordToUserData(refreshedUserRecord);

    if (userData.id !== storedUserID) {
      console.error(
        LOG_PREFIX_AUTH,
        "RefreshAuthToken: User ID mismatch after refresh. Critical error."
      );
      await clearAuthDataAndSecureStorage(); // Clear everything on mismatch
      throw new Error("User ID mismatch after token refresh.");
    }

    await SecureStore.setItemAsync("authToken", newAuthToken);
    // pb.authStore is already updated by authRefresh()

    // Refresh local QR data for the user after successful token refresh
    const updatedLocalQrData = await getQrCodesByUserId(userData.id);
    store.dispatch(setQrData(updatedLocalQrData));
    store.dispatch(
      setAuthData({
        token: newAuthToken,
        user: userData,
      })
    );
    console.log(
      LOG_PREFIX_AUTH,
      `RefreshAuthToken: Success for user ${userData.id}`
    );
    success = true;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "RefreshAuthToken: Error caught.", error);
    success = await handleTokenRefreshError(error as AuthError);
  } finally {
    isRefreshing = false;
  }
  return success;
}

export async function syncWithServer(): Promise<boolean> {
  const {
    network: { isOffline },
    auth: { user, token: currentToken, lastSynced: currentLastSynced },
  } = store.getState();

  if (isOffline) {
    store.dispatch(setErrorMessage(t("network.syncUnavailableOffline")));
    console.warn(LOG_PREFIX_AUTH, "Sync unavailable: Offline");
    return false;
  }

  if (!user || user.id === GUEST_USER_ID || !currentToken) {
    store.dispatch(setErrorMessage(t("network.syncUnavailableNotLoggedIn")));
    console.warn(
      LOG_PREFIX_AUTH,
      `Sync unavailable: User not logged in or no token. User ID: ${user?.id}`
    );
    return false;
  }

  console.log(LOG_PREFIX_AUTH, `Manual sync triggered for user ${user.id}.`);
  store.dispatch(
    setSyncStatus({
      isSyncing: true,
      lastSynced: currentLastSynced ?? undefined,
    })
  );

  // Attempt to refresh token before syncing data
  const tokenRefreshSuccess = await refreshAuthToken(currentToken);

  if (!tokenRefreshSuccess) {
    console.warn(
      LOG_PREFIX_AUTH,
      "Manual sync failed: Auth token refresh failed."
    );
    // Don't set error message here, refreshAuthToken might have set one
    // or indicated fallback to local data.
    store.dispatch(
      setSyncStatus({
        isSyncing: false,
        lastSynced: currentLastSynced ?? undefined, // Keep last synced if refresh failed
      })
    );
    return false; // Sync cannot proceed if token refresh fails and doesn't allow fallback
  }

  // Token is now valid (either refreshed or was already valid and didn't need refresh)
  // Or, refresh failed but handleTokenRefreshError returned true (allowing offline data use)
  // We need to re-fetch the token from store as refreshAuthToken might have updated it.
  const potentiallyRefreshedToken = store.getState().auth.token;
  if (!potentiallyRefreshedToken) {
    console.warn(
      LOG_PREFIX_AUTH,
      "Sync failed: No valid token after refresh attempt."
    );
    store.dispatch(
      setSyncStatus({
        isSyncing: false,
        lastSynced: currentLastSynced ?? undefined,
      })
    );
    return false;
  }

  let dataSyncSuccess = false;
  try {
    console.log(
      LOG_PREFIX_AUTH,
      `Starting data synchronization for user ${user.id}...`
    );
    // Placeholder for actual data push/pull logic with server using qrDB's sync functions
    // For example:
    // await qrDB.syncQrCodes(user.id); // Pushes local changes
    // const serverUpdates = await qrDB.fetchServerData(user.id); // Fetches server changes
    // await qrDB.insertOrUpdateQrCodes(serverUpdates); // Applies server changes locally

    // After sync operations, reload all local data for the user to update Redux
    const finalLocalData = await getQrCodesByUserId(user.id);
    store.dispatch(setQrData(finalLocalData));

    dataSyncSuccess = true;
    console.log(
      LOG_PREFIX_AUTH,
      `Data synchronization successful for user ${user.id}.`
    );
    store.dispatch(setErrorMessage(t("network.syncComplete"))); // Success message
  } catch (syncError) {
    console.error(
      LOG_PREFIX_AUTH,
      `Data synchronization error for user ${user.id}:`,
      syncError
    );
    store.dispatch(setErrorMessage(t("network.syncFailed"))); // Failure message
    dataSyncSuccess = false;
  }

  store.dispatch(
    setSyncStatus({
      isSyncing: false,
      lastSynced: dataSyncSuccess
        ? new Date().toISOString()
        : currentLastSynced ?? undefined,
    })
  );

  return dataSyncSuccess;
}

// Ensure all necessary functions are exported
// checkInitialAuth is already exported by being a top-level async function
// Other functions like refreshAuthToken, syncWithServer, etc., are also top-level and thus exported.
