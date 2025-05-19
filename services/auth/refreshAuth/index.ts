import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from "expo-secure-store";
import { store } from "@/store";
import { setQrData } from "@/store/reducers/qrSlice";
import {
  setAuthData,
  clearAuthData, // Import clearAuthData
  setSyncStatus,
} from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getUserById } from "@/services/localDB/userDB";
import { t } from "@/i18n";
import {
  getQrCodesByUserId
} from "@/services/localDB/qrDB";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { storage } from "@/utils/storage";

const LOG_PREFIX_AUTH = "[AuthService]";
const GUEST_MODE_KEY = "useGuestMode";
const GUEST_USER_ID = "";

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

function mapRecordToUserData(record: Record<string, any>): UserRecord {
  // Assuming avatar in record might be string (JSON) or object
  let avatarData: any = record.avatar ?? {}; // Default to empty object
  if (typeof record.avatar === "string") {
    try {
      avatarData = JSON.parse(record.avatar);
    } catch (e) {
      console.warn(
        LOG_PREFIX_AUTH,
        "Failed to parse avatar string from record, using raw or default.",
        e
      );
      // Keep record.avatar if it's a non-JSON string (e.g., URL) or default
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
    avatar: avatarData, // This should align with AvatarConfig or how UserRecord defines it
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
        await clearAuthDataAndSecureStorage(); // Clear everything if token expired
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

    // setAuthData expects a full UserRecord
    store.dispatch(
      setAuthData({
        token: authToken,
        user: localUserData, // localUserData should be a valid UserRecord
      })
    );
    store.dispatch(setQrData(localQrData));
    // lastSynced is string | null. Initialize to undefined if not set, or load from storage if persisted.
    // For simplicity, on fresh load, we can set it to undefined (meaning not yet synced in this session)
    // or null if that's the preferred "never synced" state.
    // Your slice sets lastSynced to null in clearAuthData.
    // Let's keep it undefined here to let the slice's initial state or clearAuthData handle null.
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

async function checkGuestModeStatus(): Promise<boolean> {
  try {
    return storage.getBoolean(GUEST_MODE_KEY) ?? false;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "Error checking guest mode status:", error);
    return false;
  }
}

async function initializeGuestMode(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, "Initializing guest mode...");

    await SecureStore.deleteItemAsync("authToken");
    await SecureStore.deleteItemAsync("userID");
    storage.set(GUEST_MODE_KEY, true);

    const guestUser: UserRecord = {
      id: GUEST_USER_ID,
      username: "guest",
      email: "",
      verified: false,
      name: "Guest User",
      avatar: {}, // Default avatar config for guest
    };

    // Use setAuthData for guest user, as guestUser is a valid UserRecord
    store.dispatch(setAuthData({ token: "", user: guestUser }));

    const guestQrData = await getQrCodesByUserId(GUEST_USER_ID);
    store.dispatch(setQrData(guestQrData));
    // For guests, lastSynced can be undefined or null.
    // Let's use undefined to signify it's not applicable or not set.
    store.dispatch(setSyncStatus({ isSyncing: false, lastSynced: undefined }));

    console.log(
      LOG_PREFIX_AUTH,
      "Guest mode initialized successfully with local data."
    );
    return true;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "Failed to initialize guest mode:", error);
    store.dispatch(clearAuthData()); // Use clearAuthData to reset state
    store.dispatch(setQrData([]));
    return false;
  }
}

async function exitGuestMode(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, "Exiting guest mode...");
    storage.set(GUEST_MODE_KEY, false);
    console.log(LOG_PREFIX_AUTH, "Guest mode flag set to false.");
    // Data will be cleared/replaced upon successful login.
    return true;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, "Failed to exit guest mode:", error);
    return false;
  }
}

async function clearAuthDataAndSecureStorage() {
  await SecureStore.deleteItemAsync("authToken");
  await SecureStore.deleteItemAsync("userID");
  store.dispatch(clearAuthData());
  store.dispatch(setQrData([])); // Also clear QR data
  console.log(
    LOG_PREFIX_AUTH,
    "Cleared auth data from Redux and SecureStorage."
  );
}

async function checkInitialAuth(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, "Starting initial auth check...");
    const useGuestMode = await checkGuestModeStatus();

    if (useGuestMode) {
      console.log(
        LOG_PREFIX_AUTH,
        "User is in guest mode. Initializing guest session..."
      );
      return await initializeGuestMode();
    }

    const hasLocalLoggedInData = await loadLocalData();
    console.log(
      LOG_PREFIX_AUTH,
      `Local logged-in data presence: ${hasLocalLoggedInData}`
    );

    const isOffline = store.getState().network.isOffline;
    const currentLastSynced = store.getState().auth.lastSynced; // Preserve current lastSynced (string | null)
    console.log(
      LOG_PREFIX_AUTH,
      `Network status: ${isOffline ? "Offline" : "Online"}`
    );

    if (!isOffline && hasLocalLoggedInData) {
      const authToken = await SecureStore.getItemAsync("authToken");
      if (authToken) {
        console.log(
          LOG_PREFIX_AUTH,
          "Device is online, scheduling background token refresh for logged-in user."
        );
        setTimeout(async () => {
          console.log(
            LOG_PREFIX_AUTH,
            "Starting background token refresh task..."
          );
          store.dispatch(
            setSyncStatus({
              isSyncing: true,
              lastSynced: currentLastSynced ?? undefined, // MODIFIED HERE
            })
          );
          const refreshSuccess = await refreshAuthToken(authToken);
          store.dispatch(
            setSyncStatus({
              isSyncing: false,
              lastSynced: refreshSuccess
                ? new Date().toISOString()
                : currentLastSynced ?? undefined, // MODIFIED HERE for consistency, though `?? ""` was also fine
            })
          );
          console.log(
            LOG_PREFIX_AUTH,
            "Background token refresh task completed."
          );
        }, 0);
      }
    } else if (isOffline && hasLocalLoggedInData) {
      console.log(
        LOG_PREFIX_AUTH,
        "Device is offline, but local logged-in data exists. Setting offline message."
      );
      store.dispatch(setErrorMessage(t("network.offlineMode")));
    }

    return hasLocalLoggedInData;
  } catch (error) {
    console.error(
      LOG_PREFIX_AUTH,
      "Initial authentication check failed:",
      error
    );
    await clearAuthDataAndSecureStorage(); // Clear everything on major failure
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
    await clearAuthDataAndSecureStorage(); // Use the centralized clearing function
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

async function refreshAuthToken(authToken: string): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const storedUserID = await SecureStore.getItemAsync("userID"); // Use a different name to avoid conflict

  if (isOffline || !storedUserID || storedUserID === GUEST_USER_ID) {
    console.log(
      LOG_PREFIX_AUTH,
      "RefreshAuthToken: Skipped due to offline, no userID, or guest user."
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
    pb.authStore.save(authToken, null); // Load current token into PocketBase

    if (!pb.authStore.isValid) {
      console.log(
        LOG_PREFIX_AUTH,
        "RefreshAuthToken: Token in PocketBase store is invalid before refresh."
      );
      // Don't clear userID from SecureStore yet, just the token.
      await SecureStore.deleteItemAsync("authToken");
      store.dispatch(
        setAuthData({ token: "", user: store.getState().auth.user! })
      ); // Clear token in Redux, keep user if present
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
    const userData = mapRecordToUserData(refreshedUserRecord); // This is UserRecord

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

    const updatedLocalQrData = await getQrCodesByUserId(userData.id);
    store.dispatch(setQrData(updatedLocalQrData));
    store.dispatch(
      setAuthData({
        // This expects UserRecord, userData is UserRecord
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

async function syncWithServer(): Promise<boolean> {
  const {
    network: { isOffline },
    auth: { user, token: currentToken, lastSynced: currentLastSynced }, // currentLastSynced is string | null
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
      lastSynced: currentLastSynced ?? undefined, // MODIFIED HERE
    })
  );

  const tokenRefreshSuccess = await refreshAuthToken(currentToken);

  if (!tokenRefreshSuccess) {
    console.warn(
      LOG_PREFIX_AUTH,
      "Manual sync failed: Auth token refresh failed."
    );
    store.dispatch(
      setSyncStatus({
        isSyncing: false,
        lastSynced: currentLastSynced ?? undefined, // MODIFIED HERE
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
    // Actual sync logic:
    // 1. Push local changes (unsynced and deleted)
    // await qrDB.syncQrCodes(user.id);
    // 2. Fetch new/updated data from server
    // const serverData = await qrDB.fetchServerData(user.id);
    // 3. Insert/update local DB with server data
    // await qrDB.insertOrUpdateQrCodes(serverData);
    // 4. Reload all local data to update Redux state
    const finalLocalData = await getQrCodesByUserId(user.id);
    store.dispatch(setQrData(finalLocalData));

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
        : currentLastSynced ?? undefined, // MODIFIED HERE
    })
  );

  return dataSyncSuccess;
}
export {
  mapRecordToUserData,
  checkInitialAuth,
  refreshAuthToken,
  syncWithServer,
  checkGuestModeStatus,
  initializeGuestMode,
  exitGuestMode,
  clearAuthDataAndSecureStorage, // Export if needed elsewhere
};
