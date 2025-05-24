import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from "expo-secure-store";
import { store } from "@/store";
// REMOVE: import { setQrData } from "@/store/reducers/qrSlice";
import {
  setAuthData,
  clearAuthData,
  setSyncStatus,
} from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getUserById } from "@/services/localDB/userDB";
import { t } from "@/i18n";
// REMOVE: import { getQrCodesByUserId } from "@/services/localDB/qrDB";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { storage } from "@/utils/storage";

// Import from your constants file
import { GUEST_USER_ID, GUEST_MODE_KEY } from "@/constants/Constants";
// Import your QR thunks
import {
  loadUserQrDataThunk,
  loadGuestQrDataThunk,
} from "@/store/thunks/qrThunks"; // Adjust path if needed

import { setQrData } from "@/store/reducers/qrSlice";

const LOG_PREFIX_AUTH = "[AuthService]"; // Keep local or move to constants if preferred

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

    // REMOVE: const localQrData = await getQrCodesByUserId(userID);
    // REMOVE: console.log(LOG_PREFIX_AUTH, "Local QR data loaded for logged-in user.");

    store.dispatch(
      setAuthData({
        token: authToken,
        user: localUserData,
      })
    );
    // MODIFIED: Dispatch thunk to load QR data
    store.dispatch(loadUserQrDataThunk(userID));

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
    await clearAuthDataAndSecureStorage(); // This will also clear QR data in Redux
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
    // Initialize QR data as empty. loadGuestQrData (via thunk) will populate it.
    store.dispatch(setQrData([])); // This is fine for initialization
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
    store.dispatch(setQrData([])); // Also fine here
    return false;
  }
}

/**
 * Dispatches a thunk to load QR codes for the GUEST_USER_ID from local DB into Redux.
 */
export async function loadGuestQrData(): Promise<boolean> {
  try {
    console.log(
      LOG_PREFIX_AUTH,
      "Dispatching thunk to load QR data for guest user..."
    );
    // MODIFIED: Dispatch the thunk
    await store.dispatch(loadGuestQrDataThunk());
    // The thunk itself should log success/failure.
    // We assume if dispatch doesn't throw, the process was initiated.
    return true;
  } catch (error) {
    // This catch is for errors during the dispatch itself, if any.
    console.error(
      LOG_PREFIX_AUTH,
      "Error dispatching loadGuestQrDataThunk:",
      error
    );
    // store.dispatch(setQrData([])); // The thunk should handle its own error states for qrData
    return false;
  }
}

export async function exitGuestMode(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, "Exiting guest mode...");
    storage.set(GUEST_MODE_KEY, false);
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
  }
  store.dispatch(clearAuthData());
  store.dispatch(setQrData([])); // Explicitly clear QR data from Redux
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
          "checkInitialAuth: Guest session initialized, now loading associated QR data..."
        );
        // MODIFIED: loadGuestQrData now dispatches a thunk
        await loadGuestQrData();
        console.log(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Guest QR data loading initiated."
        );
        return true;
      } else {
        console.warn(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Failed to initialize guest session. No active session."
        );
        return false;
      }
    }

    if (onboardingPending) {
      console.log(
        LOG_PREFIX_AUTH,
        "checkInitialAuth: Onboarding pending, not guest; no active user session."
      );
      return false;
    }

    console.log(
      LOG_PREFIX_AUTH,
      "checkInitialAuth: Onboarding complete, not guest. Checking logged-in user data..."
    );
    // MODIFIED: loadLocalData now dispatches a thunk for QR data
    const hasLocalLoggedInData = await loadLocalData();
    console.log(
      LOG_PREFIX_AUTH,
      `checkInitialAuth: Local logged-in data presence: ${hasLocalLoggedInData}`
    );

    const isOffline = store.getState().network.isOffline;
    if (!isOffline && hasLocalLoggedInData) {
      const authToken = await SecureStore.getItemAsync("authToken");
      const currentUserID = store.getState().auth.user?.id;

      if (authToken && currentUserID && currentUserID !== GUEST_USER_ID) {
        console.log(
          LOG_PREFIX_AUTH,
          "checkInitialAuth: Online, logged-in. Scheduling background token refresh."
        );
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
          // refreshAuthToken will NOT dispatch a thunk for QR data anymore
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
        "checkInitialAuth: Offline, local data exists. Setting offline message."
      );
      store.dispatch(setErrorMessage(t("network.offlineMode")));
    }

    return hasLocalLoggedInData;
  } catch (error) {
    console.error(
      LOG_PREFIX_AUTH,
      "checkInitialAuth: CRITICAL error:",
      error
    );
    await clearAuthDataAndSecureStorage();
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
      return true;
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
  return false;
}

export async function refreshAuthToken(authToken: string): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const storedUserID = await SecureStore.getItemAsync("userID");

  if (isOffline || !storedUserID || storedUserID === GUEST_USER_ID) {
    console.log(
      LOG_PREFIX_AUTH,
      "RefreshAuthToken: Skipped (offline, no userID, or guest)."
    );
    return !!storedUserID && storedUserID !== GUEST_USER_ID;
  }

  if (isRefreshing) {
    console.log(LOG_PREFIX_AUTH, "RefreshAuthToken: Already in progress.");
    return false;
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
        "RefreshAuthToken: Token invalid before refresh."
      );
      await SecureStore.deleteItemAsync("authToken");
      const currentUser = store.getState().auth.user;
      if (currentUser && currentUser.id === storedUserID) {
        store.dispatch(setAuthData({ token: "", user: currentUser }));
      } else {
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
        "RefreshAuthToken: User ID mismatch. Critical error."
      );
      await clearAuthDataAndSecureStorage();
      throw new Error("User ID mismatch after token refresh.");
    }

    await SecureStore.setItemAsync("authToken", newAuthToken);

    // Dispatch auth data first
    store.dispatch(
      setAuthData({
        token: newAuthToken,
        user: userData,
      })
    );
    // REMOVED: store.dispatch(loadUserQrDataThunk(userData.id));

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

  // refreshAuthToken no longer dispatches its own QR data thunk
  const tokenRefreshSuccess = await refreshAuthToken(currentToken);

  if (!tokenRefreshSuccess) {
    console.warn(
      LOG_PREFIX_AUTH,
      "Manual sync failed: Auth token refresh failed."
    );
    store.dispatch(
      setSyncStatus({
        isSyncing: false,
        lastSynced: currentLastSynced ?? undefined,
      })
    );
    return false;
  }

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
    // await qrDB.syncQrCodes(user.id);
    // const serverUpdates = await qrDB.fetchServerData(user.id);
    // await qrDB.insertOrUpdateQrCodes(serverUpdates);

    // After sync operations, reload all local data for the user to update Redux via thunk
    // MODIFIED: Dispatch thunk to load QR data
    store.dispatch(loadUserQrDataThunk(user.id));

    dataSyncSuccess = true;
    console.log(
      LOG_PREFIX_AUTH,
      `Data synchronization successful for user ${user.id}.`
    );
    store.dispatch(setErrorMessage(t("network.syncComplete")));
  } catch (syncError) {
    console.error(
      LOG_PREFIX_AUTH,
      `Data synchronization error for user ${user.id}:`,
      syncError
    );
    store.dispatch(setErrorMessage(t("network.syncFailed")));
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
