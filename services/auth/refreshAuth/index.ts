import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setQrData } from "@/store/reducers/qrSlice";
import { setAuthData, clearAuthData, setSyncStatus } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';
import { getQrCodesByUserId } from '@/services/localDB/qrDB';

const AuthErrorStatus = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  ServerError: 500
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
    avatar: typeof record.avatar === 'object' ? record.avatar : record.avatar ?? ''
  };
}

let isRefreshing = false;

/**
 * Loads local user data and QR codes without waiting for network
 * Returns true if local data is available, false otherwise
 */
async function loadLocalData(): Promise<boolean> {
  try {
    const userID = await SecureStore.getItemAsync('userID');
    const authToken = await SecureStore.getItemAsync('authToken');
    
    if (!userID) return false;
    
    const localUserData = await getUserById(userID);
    if (!localUserData) return false;
    
    const localQrData = await getQrCodesByUserId(userID);
    
    // Dispatch local data to Redux store immediately
    store.dispatch(setAuthData({ 
      token: authToken || '', 
      user: localUserData
    }));
    store.dispatch(setQrData(localQrData));
    
    // Initialize sync status
    store.dispatch(setSyncStatus({ isSyncing: false }));
    
    return true;
  } catch (error) {
    console.error('Failed to load local data', error);
    return false;
  }
}

/**
 * Start app with local data, then initiate background sync if online
 */
async function checkInitialAuth(): Promise<boolean> {
  try {
    // Load local data immediately - this is the key to the local-first approach
    const hasLocalData = await loadLocalData();
    
    // Get network status from store
    const isOffline = store.getState().network.isOffline;
    
    // Start background sync process if online
    if (!isOffline) {
      // Use setTimeout to make sure this runs non-blocking
      setTimeout(async () => {
        const authToken = await SecureStore.getItemAsync('authToken');
        if (authToken) {
          store.dispatch(setSyncStatus({ isSyncing: true }));
          await refreshAuthToken(authToken);
          store.dispatch(setSyncStatus({ 
            isSyncing: false, 
            lastSynced: new Date().toISOString() // Convert Date to ISO string
          }));
        }
      }, 0);
    } else if (hasLocalData) {
      // If offline but has local data, show offline mode message
      store.dispatch(setErrorMessage(t('network.offlineMode')));
    }
    
    return hasLocalData;
  } catch (error) {
    console.error('Initial authentication check failed', error);
    return false;
  }
}

async function handleTokenRefreshError(error: AuthError, authToken: string): Promise<boolean> {
  const errorStatus = error.status ?? error.data?.status ?? 0;
  const userID = await SecureStore.getItemAsync('userID');

  console.error('Token Refresh Error:', {
    status: errorStatus,
    message: error.message,
    originalError: error
  });

  // For server errors, just continue with local data
  if (errorStatus === AuthErrorStatus.ServerError || errorStatus === 0) {
    if (userID) {
      store.dispatch(setErrorMessage(t('authRefresh.warnings.usingOfflineData')));
      return true; // Continue with local data
    }
  }

  // For auth errors, silently update state but don't interrupt user
  if (errorStatus === AuthErrorStatus.Unauthorized) {
    await SecureStore.deleteItemAsync('authToken');
    store.dispatch(setErrorMessage(t('authRefresh.warnings.sessionExpiredBackground')));
    return false;
  }

  switch (errorStatus) {
    case AuthErrorStatus.Forbidden:
    case AuthErrorStatus.NotFound:
      store.dispatch(setErrorMessage(t(`authRefresh.warnings.${errorStatus}`)));
      return false;
    default:
      store.dispatch(setErrorMessage(t('authRefresh.warnings.syncFailed')));
      return false;
  }
}

async function refreshAuthToken(authToken: string, maxRetries = 2, maxTimeout = 10000): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const userID = await SecureStore.getItemAsync('userID');

  if (isOffline || !userID) {
    return userID ? true : false; // Just use local data if offline
  }

  if (isRefreshing) return false;
  isRefreshing = true;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        pb.authStore.save(authToken, null);
        if (!pb.authStore.isValid) {
          await SecureStore.deleteItemAsync('authToken');
          return false;
        }

        const authData = await pb.collection('users').authRefresh();

        if (!authData?.token || !authData?.record) {
          throw new Error("Invalid authentication refresh response");
        }

        const userData = mapRecordToUserData(authData.record);
        await SecureStore.setItemAsync('authToken', authData.token);
        pb.authStore.save(authData.token, authData.record);

        const updatedLocalData = await getQrCodesByUserId(userData.id);
        store.dispatch(setQrData(updatedLocalData));
        store.dispatch(setAuthData({
          token: authData.token,
          user: userData
        }));

        return true;
      } catch (error) {
        if (attempt === maxRetries) {
          return handleTokenRefreshError(error as AuthError, authToken);
        }

        // Use shorter backoff times to avoid long waits
        const backoffTime = Math.min(Math.pow(2, attempt) * 500, maxTimeout);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  } finally {
    isRefreshing = false;
  }

  return false;
}

// Function to manually trigger sync when user requests it
async function syncWithServer(): Promise<boolean> {
  const { network: { isOffline } } = store.getState();
  const authToken = await SecureStore.getItemAsync('authToken');
  
  if (isOffline || !authToken) {
    store.dispatch(setErrorMessage(t('network.syncUnavailable')));
    return false;
  }
  
  store.dispatch(setSyncStatus({ isSyncing: true }));
  const success = await refreshAuthToken(authToken);
  
  if (success) {
    store.dispatch(setSyncStatus({ 
      isSyncing: false, 
      lastSynced: new Date().toISOString() // Convert Date to ISO string
    }));
    store.dispatch(setErrorMessage(t('network.syncComplete')));
  } else {
    store.dispatch(setSyncStatus({ isSyncing: false }));
  }
  
  return success;
}

export { mapRecordToUserData, checkInitialAuth, refreshAuthToken, syncWithServer };
