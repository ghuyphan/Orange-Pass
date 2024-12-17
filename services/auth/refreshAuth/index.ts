import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setQrData } from "@/store/reducers/qrSlice";
import { setAuthData } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';
import { getQrCodesByUserId } from '@/services/localDB/qrDB';

// Define possible HTTP error status codes
const AuthErrorStatus = {
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  ServerError: 500
} as const;

// Define a custom error type for authentication
interface AuthError extends Error {
  status?: number;
  data?: {
    status?: number;
    message?: string;
  };
}

// Helper function to convert a PocketBase record to a UserRecord type
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

// Refresh token lock
let isRefreshing = false;

// Handle errors that occur during token refresh
async function handleTokenRefreshError(error: AuthError, authToken: string): Promise<boolean> {
  const errorStatus = error.status ?? error.data?.status ?? 0;
  const userID = await SecureStore.getItemAsync('userID');

  console.error('Token Refresh Error:', {
    status: errorStatus,
    message: error.message,
    originalError: error
  });

  // If the server is down or there's an unknown error, try using local data
  if (errorStatus === AuthErrorStatus.ServerError || errorStatus === 0) {
    if (userID) {
      try {
        // But first, check if the token is expired
        const expirationDate = getTokenExpirationDate(authToken);
        if (expirationDate && expirationDate > new Date()) {
          const localUserData = await getUserById(userID);
          const localQrData = await getQrCodesByUserId(userID);

          if (localUserData) {
            // If there's valid local user data, use it to keep the user logged in
            store.dispatch(setAuthData({ token: authToken, user: localUserData }));
            store.dispatch(setQrData(localQrData));
            store.dispatch(setErrorMessage(t('authRefresh.warnings.usingOfflineData')));
            return true;
          }
        }
      } catch (localDbError) {
        console.error('Failed to retrieve local user or QR data', localDbError);
      }
    }
  }

  // Handle potentially revoked or expired refresh token
  if (errorStatus === AuthErrorStatus.Unauthorized) {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userID');
    store.dispatch(setErrorMessage(t('authRefresh.errors.sessionExpired')));
    // Redirect to login (you'll need to implement the redirect logic here)
    // ...
    return false;
  }

  // Handle other types of errors
  switch (errorStatus) {
    case AuthErrorStatus.Forbidden:
    case AuthErrorStatus.NotFound:
      await SecureStore.deleteItemAsync('authToken');
      store.dispatch(setErrorMessage(t(`authRefresh.errors.${errorStatus}`)));
      return false;
    default:
      await SecureStore.deleteItemAsync('authToken');
      store.dispatch(setErrorMessage(t('authRefresh.errors.unknown')));
      return false;
  }
}

// Check if the user is already authenticated when the app starts
async function checkInitialAuth(): Promise<boolean> {
  try {
    const { network: { isOffline } } = store.getState();
    const authToken = await SecureStore.getItemAsync('authToken');
    const userID = await SecureStore.getItemAsync('userID');

    // If no token or userID is stored, the user is not authenticated
    if (!authToken || !userID) return false;

    const expirationDate = getTokenExpirationDate(authToken);

    // If the token is expired, try to refresh it (unless the app is offline)
    if (!expirationDate || expirationDate <= new Date()) {
      return isOffline ? false : await refreshAuthToken(authToken);
    }

    // If the token is valid, get the user data from the local database
    const localUserData = await getUserById(userID);
    if (!localUserData) return false;

    // Update the authentication state in the store
    store.dispatch(setAuthData({ token: authToken, user: localUserData }));

    // Try to refresh the token in the background (if online)
    if (!isOffline) {
      refreshAuthToken(authToken).catch(error => {
        console.warn('Background token refresh failed', error);
      });
    } else {
      // When offline, explicitly fetch local QR data
      const userID = await SecureStore.getItemAsync('userID');
      if (userID) {
        try {
          const localQrData = await getQrCodesByUserId(userID);
          store.dispatch(setQrData(localQrData));
          console.log('update local qrdata from auth refresh');
        } catch (localQrError) {
          console.error('Failed to fetch local QR data in offline mode', localQrError);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Initial authentication check failed', error);
    return false;
  }
}

// Refresh the authentication token
async function refreshAuthToken(authToken: string, maxRetries = 5, maxTimeout = 60000): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const userID = await SecureStore.getItemAsync('userID');

  // Offline mode handling with early return
  if (isOffline || !userID) {
    try {
      if (userID) {
        const localQrData = await getQrCodesByUserId(userID);
        store.dispatch(setQrData(localQrData));
        store.dispatch(setErrorMessage(t('network.offlineMode')));
      }
      return userID ? true : false;
    } catch (localQrError) {
      store.dispatch(setErrorMessage(t('authRefresh.errors.info.qr.localFetchFailed')));
      return false;
    }
  }

  if (isRefreshing) {
    // console.warn('Token refresh already in progress.');
    return false;
  }

  isRefreshing = true;

  try {
    // Online token refresh attempts
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Validate current token
        pb.authStore.save(authToken, null);
        if (!pb.authStore.isValid) {
          await SecureStore.deleteItemAsync('authToken');
          store.dispatch(setErrorMessage(t('authRefresh.errors.invalidToken')));
          return false;
        }

        // Attempt token refresh
        const authData = await pb.collection('users').authRefresh();

        // Validate refresh response
        if (!authData?.token || !authData?.record) {
          throw new Error("Invalid authentication refresh response");
        }

        // Update authentication details
        const userData = mapRecordToUserData(authData.record);
        await SecureStore.setItemAsync('authToken', authData.token);
        pb.authStore.save(authData.token, authData.record);

        // Fetch and update QR codes
        const updatedLocalData = await getQrCodesByUserId(userData.id);
        store.dispatch(setQrData(updatedLocalData));

        // Update global state
        store.dispatch(setAuthData({
          token: authData.token,
          user: userData
        }));

        return true;

      } catch (error) {
        const errorStatus = (error as AuthError).status ?? (error as AuthError).data?.status ?? 0;
        const isOfflineOrServerError =
          errorStatus === AuthErrorStatus.ServerError ||
          errorStatus === 0 ||
          store.getState().network.isOffline;

        // Attempt to use local QR data on server errors
        if (isOfflineOrServerError && userID) {
          try {
            const localQrData = await getQrCodesByUserId(userID);
            store.dispatch(setQrData(localQrData));
          } catch (localQrError) {
            console.error('Failed to fetch local QR data during server error', localQrError);
          }
        }

        // Handle final error attempt
        if (attempt === maxRetries) {
          return handleTokenRefreshError(error as AuthError, authToken);
        }

        // Exponential backoff with jitter
        const backoffTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        const timeout = Math.min(backoffTime, maxTimeout);
        await new Promise(resolve => setTimeout(resolve, timeout));
      }
    }
  } finally {
    isRefreshing = false;
  }

  return false;
}

export { mapRecordToUserData, checkInitialAuth, refreshAuthToken };