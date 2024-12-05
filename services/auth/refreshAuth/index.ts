import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';

// Enum for more explicit error handling
enum AuthErrorStatus {
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  ServerError = 500
}

// Enhanced error handling interface
interface AuthError extends Error {
  status?: number;
  data?: {
    status?: number;
    message?: string;
  };
}

/**
 * Maps a PocketBase record to a standardized user record
 * Provides type-safe data extraction with default values
 */
const mapRecordToUserData = (record: Record<string, any>): UserRecord => ({
  id: record.id ?? '',
  username: record.username ?? '',
  email: record.email ?? '',
  verified: record.verified ?? false,
  name: record.name ?? '',
  avatar: record.avatar ?? ''
});

/**
 * Comprehensive token refresh error handler
 * Provides granular error management and user feedback
 */
const handleTokenRefreshError = async (
  error: AuthError, 
  authToken: string
): Promise<boolean> => {
  const errorStatus = error.status ?? error.data?.status ?? AuthErrorStatus.ServerError;

  // Centralized error logging
  console.error('Token Refresh Error:', {
    status: errorStatus,
    message: error.message,
    originalError: error
  });

  switch (errorStatus) {
    case AuthErrorStatus.Unauthorized:
    case AuthErrorStatus.Forbidden:
    case AuthErrorStatus.NotFound:
      await SecureStore.deleteItemAsync('authToken');
      store.dispatch(setErrorMessage(t(`authRefresh.errors.${errorStatus}`)));
      return false;

    case AuthErrorStatus.ServerError:
      // Specific handling for server errors
      store.dispatch(setErrorMessage(t('authRefresh.errors.serverUnavailable')));
      return false;

    default:
      await SecureStore.deleteItemAsync('authToken');
      store.dispatch(setErrorMessage(t('authRefresh.errors.unknown')));
      return false;
  }
};

/**
 * Performs initial authentication check
 * Validates existing token and retrieves user data
 */
const checkInitialAuth = async (): Promise<boolean> => {
  try {
    const { network: { isOffline } } = store.getState();
    const authToken = await SecureStore.getItemAsync('authToken');
    const userID = await SecureStore.getItemAsync('userID');

    // Early exit conditions
    if (!authToken || !userID) return false;

    const expirationDate = getTokenExpirationDate(authToken);
    
    // Token validation
    if (!expirationDate || expirationDate <= new Date()) {
      return isOffline ? false : await refreshAuthToken(authToken);
    }

    // Retrieve and validate local user data
    const localUserData = await getUserById(userID);
    if (!localUserData) return false;

    // Update authentication state
    store.dispatch(setAuthData({ token: authToken, user: localUserData }));

    // Background token refresh
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
};

/**
 * Refreshes authentication token with robust error handling
 * Implements retry and fallback mechanisms
 */
const refreshAuthToken = async (
  authToken: string, 
  retries = 2
): Promise<boolean> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Validate existing auth store
      pb.authStore.save(authToken, null);
      if (!pb.authStore.isValid) {
        await SecureStore.deleteItemAsync('authToken');
        store.dispatch(setErrorMessage(t('authRefresh.errors.invalidToken')));
        return false;
      }

      // Refresh authentication
      const authData = await pb.collection('users').authRefresh();
      
      // Validate refresh response
      if (!authData?.token || !authData?.record) {
        throw new Error("Invalid authentication refresh response");
      }

      // Update authentication details
      const userData = mapRecordToUserData(authData.record);
      await SecureStore.setItemAsync('authToken', authData.token);
      pb.authStore.save(authData.token, authData.record);

      // Update global state
      store.dispatch(setAuthData({ 
        token: authData.token, 
        user: userData 
      }));

      return true;
    } catch (error) {
      // Last attempt
      if (attempt === retries) {
        return handleTokenRefreshError(error as AuthError, authToken);
      }

      // Exponential backoff between retries
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return false;
};

export { 
  mapRecordToUserData, 
  checkInitialAuth, 
  refreshAuthToken 
};