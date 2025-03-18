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

async function handleTokenRefreshError(error: AuthError, authToken: string): Promise<boolean> {
  const errorStatus = error.status ?? error.data?.status ?? 0;
  const userID = await SecureStore.getItemAsync('userID');

  console.error('Token Refresh Error:', {
    status: errorStatus,
    message: error.message,
    originalError: error
  });

  if (errorStatus === AuthErrorStatus.ServerError || errorStatus === 0) {
    if (userID) {
      try {
        const expirationDate = getTokenExpirationDate(authToken);
        if (expirationDate && expirationDate > new Date()) {
          const localUserData = await getUserById(userID);
          const localQrData = await getQrCodesByUserId(userID);

          if (localUserData) {
            store.dispatch(setAuthData({ token: authToken, user: localUserData }));
            store.dispatch(setQrData(localQrData));
            store.dispatch(setErrorMessage(t('authRefresh.warnings.usingOfflineData')));
            return true;
          }
        }
        // If we reach here, either token is expired or no local user data
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userID');
        store.dispatch(setErrorMessage(t('authRefresh.errors.sessionExpired')));
      } catch (localDbError) {
        console.error('Failed to retrieve local user or QR data', localDbError);
      }
    }
  }

  if (errorStatus === AuthErrorStatus.Unauthorized) {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userID');
    store.dispatch(setErrorMessage(t('authRefresh.errors.sessionExpired')));
    return false;
  }

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

async function checkInitialAuth(): Promise<boolean> {
  try {
    const { network: { isOffline } } = store.getState();
    const authToken = await SecureStore.getItemAsync('authToken');
    const userID = await SecureStore.getItemAsync('userID');

    if (!authToken || !userID) return false;

    const expirationDate = getTokenExpirationDate(authToken);

    if (!expirationDate || expirationDate <= new Date()) {
      // Attempt to refresh token only if online. Otherwise, continue with local data
      if (!isOffline && !await refreshAuthToken(authToken)) return false;
    }

    const localUserData = await getUserById(userID);
    if (!localUserData) return false;

    store.dispatch(setAuthData({ token: authToken, user: localUserData }));

    // Fetch QR data from local DB regardless of network state
    try {
      const localQrData = await getQrCodesByUserId(userID);
      store.dispatch(setQrData(localQrData));
    } catch (error) {
      console.error('Failed to fetch initial QR data', error);
      // Handle the error appropriately (e.g., show a message to the user)
      store.dispatch(setErrorMessage(t('authRefresh.errors.info.qr.localFetchFailed')));
    }

    // Initiate background refresh only if online
    if (!isOffline) {
      refreshAuthToken(authToken).catch(error => {
        console.warn('Background token refresh failed', error);
      });
    }

    return true;
  } catch (error) {
    console.error('Initial authentication check failed', error);
    return false;
  }
}

async function refreshAuthToken(authToken: string, maxRetries = 5, maxTimeout = 60000): Promise<boolean> {
  const isOffline = store.getState().network.isOffline;
  const userID = await SecureStore.getItemAsync('userID');

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

  if (isRefreshing) return false;
  isRefreshing = true;

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        pb.authStore.save(authToken, null);
        if (!pb.authStore.isValid) {
          await SecureStore.deleteItemAsync('authToken');
          store.dispatch(setErrorMessage(t('authRefresh.errors.invalidToken')));
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
