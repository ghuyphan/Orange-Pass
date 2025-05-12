import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setQrData } from "@/store/reducers/qrSlice";
import {
  setAuthData,
  setSyncStatus,
} from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';
import { getQrCodesByUserId } from '@/services/localDB/qrDB';
import { getTokenExpirationDate } from "@/utils/JWTdecode";

const LOG_PREFIX_AUTH = '[AuthService]';

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
  return {
    id: record.id ?? '',
    username: record.username ?? '',
    email: record.email ?? '',
    verified: record.verified ?? false,
    name: record.name ?? '',
    avatar:
      typeof record.avatar === 'object' ? record.avatar : record.avatar ?? '',
  };
}

let isRefreshing = false;

async function loadLocalData(): Promise<boolean> {
  try {
    const userID = await SecureStore.getItemAsync('userID');
    const authToken = await SecureStore.getItemAsync('authToken');

    if (!userID) {
      console.log(LOG_PREFIX_AUTH, 'No userID found in SecureStore.');
      return false;
    }
    console.log(LOG_PREFIX_AUTH, `UserID found: ${userID}`);

    // Check token expiration even in offline mode
    if (authToken) {
      const expirationDate = getTokenExpirationDate(authToken);
      const now = new Date();
      
      if (expirationDate && expirationDate < now) {
        console.log(LOG_PREFIX_AUTH, 'Token expired, cannot authenticate in offline mode');
        return false;
      }
    }

    const localUserData = await getUserById(userID);

    if (!localUserData) {
      console.log(LOG_PREFIX_AUTH, 'No local user data found for userID.');
      return false;
    }
    console.log(LOG_PREFIX_AUTH, 'Local user data loaded.');

    const localQrData = await getQrCodesByUserId(userID);
    console.log(LOG_PREFIX_AUTH, 'Local QR data loaded.');

    store.dispatch(setAuthData({
      token: authToken || '',
      user: localUserData,
    }));
    store.dispatch(setQrData(localQrData));
    store.dispatch(setSyncStatus({ isSyncing: false }));
    console.log(LOG_PREFIX_AUTH, 'Local data dispatched to Redux.');

    return true;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, 'Failed to load local data:', error);
    return false;
  }
}

async function checkInitialAuth(): Promise<boolean> {
  try {
    console.log(LOG_PREFIX_AUTH, 'Starting initial auth check...');
    const hasLocalData = await loadLocalData();
    console.log(LOG_PREFIX_AUTH, `Local data presence: ${hasLocalData}`);

    const isOffline = store.getState().network.isOffline;
    console.log(LOG_PREFIX_AUTH, `Network status: ${isOffline ? 'Offline' : 'Online'}`);

    if (!isOffline) {
      console.log(LOG_PREFIX_AUTH, 'Device is online, scheduling background token refresh.');
      setTimeout(async () => {
        console.log(LOG_PREFIX_AUTH, 'Starting background token refresh task...');
        const authToken = await SecureStore.getItemAsync('authToken');
        if (authToken) {
          console.log(LOG_PREFIX_AUTH, 'Auth token found for background refresh.');
          store.dispatch(setSyncStatus({ isSyncing: true }));
          await refreshAuthToken(authToken);
          store.dispatch(setSyncStatus({
            isSyncing: false,
            lastSynced: new Date().toISOString(),
          }));
          console.log(LOG_PREFIX_AUTH, 'Background token refresh task completed.');
        } else {
          console.log(LOG_PREFIX_AUTH, 'No auth token for background refresh.');
        }
      }, 0);
    } else if (hasLocalData) {
      console.log(LOG_PREFIX_AUTH, 'Device is offline, but local data exists. Setting offline message.');
      store.dispatch(setErrorMessage(t('network.offlineMode')));
    }

    return hasLocalData;
  } catch (error) {
    console.error(LOG_PREFIX_AUTH, 'Initial authentication check failed:', error);
    return false;
  }
}

async function handleTokenRefreshError(
  error: AuthError,
): Promise<boolean> {
  const errorStatus = error.status ?? error.data?.status ?? 0;
  const userID = await SecureStore.getItemAsync('userID');

  console.error(LOG_PREFIX_AUTH, 'Token Refresh Error:', {
    status: errorStatus,
    message: error.message,
  });

  if (errorStatus === AuthErrorStatus.ServerError || errorStatus === 0) {
    if (userID) {
      store.dispatch(setErrorMessage(t('authRefresh.warnings.usingOfflineData')));
      return true;
    }
  } else if (errorStatus === AuthErrorStatus.Unauthorized) {
    console.log(LOG_PREFIX_AUTH, 'Unauthorized error during token refresh. Clearing token.');
    await SecureStore.deleteItemAsync('authToken');
    store.dispatch(setErrorMessage(t('authRefresh.warnings.sessionExpiredBackground')));
  } else {
    switch (errorStatus) {
      case AuthErrorStatus.Forbidden:
      case AuthErrorStatus.NotFound:
        store.dispatch(setErrorMessage(t(`authRefresh.warnings.${errorStatus}`)));
        break;
      default:
        store.dispatch(setErrorMessage(t('authRefresh.warnings.syncFailed')));
        break;
    }
  }
  return false;
}

async function refreshAuthToken(
  authToken: string,
  maxRetries = 2,
): Promise<boolean> {
  // Early return conditions
  const isOffline = store.getState().network.isOffline;
  const userID = await SecureStore.getItemAsync('userID');

  if (isOffline || !userID) {
    return !!userID;
  }

  if (isRefreshing) {
    return false;
  }
  
  isRefreshing = true;
  let success = false;

  try {
    // Set authToken in PocketBase
    pb.authStore.save(authToken, null);

    if (!pb.authStore.isValid) {
      await SecureStore.deleteItemAsync('authToken');
      return false;
    }

    // Refresh authentication
    const authData = await pb.collection('users').authRefresh();

    if (!authData?.token || !authData?.record) {
      throw new Error('Invalid authentication refresh response');
    }

    // Save new token and update state
    const userData = mapRecordToUserData(authData.record);
    await SecureStore.setItemAsync('authToken', authData.token);
    pb.authStore.save(authData.token, authData.record);

    // Get updated QR data and update Redux state
    const updatedLocalData = await getQrCodesByUserId(userData.id);
    store.dispatch(setQrData(updatedLocalData));
    store.dispatch(setAuthData({
      token: authData.token,
      user: userData,
    }));

    success = true;
  } catch (error) {
    success = await handleTokenRefreshError(error as AuthError);
  } finally {
    isRefreshing = false;
  }

  return success;
}

async function syncWithServer(): Promise<boolean> {
  const { network: { isOffline } } = store.getState();
  const authToken = await SecureStore.getItemAsync('authToken');

  if (isOffline || !authToken) {
    store.dispatch(setErrorMessage(t('network.syncUnavailable')));
    console.warn(LOG_PREFIX_AUTH, `Sync unavailable: Offline=${isOffline}, AuthTokenPresent=${!!authToken}`);
    return false;
  }

  console.log(LOG_PREFIX_AUTH, 'Manual sync triggered. Setting sync status to true.');
  store.dispatch(setSyncStatus({ isSyncing: true }));
  const success = await refreshAuthToken(authToken);

  if (success) {
    console.log(LOG_PREFIX_AUTH, 'Manual sync successful. Updating Redux.');
    store.dispatch(setSyncStatus({
      isSyncing: false,
      lastSynced: new Date().toISOString(),
    }));
    store.dispatch(setErrorMessage(t('network.syncComplete')));
  } else {
    console.warn(LOG_PREFIX_AUTH, 'Manual sync failed. Resetting sync status.');
    store.dispatch(setSyncStatus({ isSyncing: false }));
  }
  return success;
}

export { mapRecordToUserData, checkInitialAuth, refreshAuthToken, syncWithServer };
