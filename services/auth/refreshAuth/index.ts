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
      return false;
    }

    if (authToken) {
      const expirationDate = getTokenExpirationDate(authToken);
      const now = new Date();
      if (expirationDate && expirationDate < now) {
        await clearAuthDataAndSecureStorage();
        return false;
      }
    } else {
      await clearAuthDataAndSecureStorage();
      return false;
    }

    const localUserData = await getUserById(userID);
    if (!localUserData) {
      await clearAuthDataAndSecureStorage();
      return false;
    }

    // REMOVE: const localQrData = await getQrCodesByUserId(userID);
    // REMOVE:  (LOG_PREFIX_AUTH, "Local QR data loaded for logged-in user.");

    store.dispatch(
      setAuthData({
        token: authToken,
        user: localUserData,
      })
    );
    // MODIFIED: Dispatch thunk to load QR data
    store.dispatch(loadUserQrDataThunk(userID));

    store.dispatch(setSyncStatus({ isSyncing: false, lastSynced: undefined }));

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
    // await Promise.all([
    //   SecureStore.deleteItemAsync("authToken"),
    //   SecureStore.deleteItemAsync("userID"),
    // ]);

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
    // store.dispatch(setQrData([])); // This is fine for initialization
    // store.dispatch(setSyncStatus({ isSyncing: false, lastSynced: undefined }));
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
 * Dispatches a thunk to load QR codes for the GUEST_USER_ID from local DB into Redux.
 */
export async function loadGuestQrData(): Promise<boolean> {
  try {

    // MODIFIED: Dispatch the thunk
    store.dispatch(loadGuestQrDataThunk());
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
    storage.set(GUEST_MODE_KEY, false);
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
}

export async function checkInitialAuth(
  onboardingPending: boolean
): Promise<boolean> {
  try {
    const useGuestModeStorage = await checkGuestModeStatus();

    if (useGuestModeStorage) {
      const guestSessionInitialized = await initializeGuestMode();
      if (guestSessionInitialized) {
        // MODIFIED: loadGuestQrData now dispatches a thunk
        await loadGuestQrData();
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
      return false;
    }
    // MODIFIED: loadLocalData now dispatches a thunk for QR data
    const hasLocalLoggedInData = await loadLocalData();
    const isOffline = store.getState().network.isOffline;
    if (!isOffline && hasLocalLoggedInData) {
      const authToken = await SecureStore.getItemAsync("authToken");
      const currentUserID = store.getState().auth.user?.id;

      if (authToken && currentUserID && currentUserID !== GUEST_USER_ID) {
        setTimeout(async () => {
          const currentLastSynced = store.getState().auth.lastSynced;
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
        }, 0);
      }
    } else if (isOffline && hasLocalLoggedInData) {
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
    return !!storedUserID && storedUserID !== GUEST_USER_ID;
  }

  if (isRefreshing) {
    return false;
  }

  isRefreshing = true;
  let success = false;

  try {
    pb.authStore.save(authToken, null);

    if (!pb.authStore.isValid) {
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
    store.dispatch(loadUserQrDataThunk(user.id));

    dataSyncSuccess = true;
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
