import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { mapRecordToUserData } from "../refreshAuth";
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { t } from '@/i18n';
import { createTable, insertUser } from "@/services/localDB/userDB";

const LOGIN_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 3;

interface LoginError {
  status?: number;
  message: string;
  isTimeout?: boolean;  // New flag for timeout errors
}

const clearStoredAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userID');
  } catch (error) {
    console.error('Failed to clear stored auth data:', error);
  }
};

const validateInput = (email: string, password: string) => {
  if (!email || !password) {
    throw new Error(t('loginScreen.errors.emptyFields'));
  }
  if (!email.includes('@')) {
    throw new Error(t('loginScreen.errors.invalidEmail'));
  }
  if (password.length < 6) {
    throw new Error(t('loginScreen.errors.passwordTooShort'));
  }
};

const loginWithTimeout = async (email: string, password: string, attempt = 1): Promise<any> => {
  const loginPromise = await pb.collection('users').authWithPassword(email, password);
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const timeoutError: LoginError = new Error(t('loginScreen.errors.timeout')) as LoginError;
      timeoutError.isTimeout = true;  // Set the timeout flag
      reject(timeoutError);
    }, LOGIN_TIMEOUT);
  });

  try {
    const authData = await Promise.race([loginPromise, timeoutPromise]);
    return authData;
  } catch (error) {
    const loginError = error as LoginError;
    if (attempt < MAX_RETRIES && loginError.isTimeout) {  // Check the timeout flag instead
      return loginWithTimeout(email, password, attempt + 1);
    }
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  Keyboard.dismiss();

  try {
    // Check network status
    const isOffline = store.getState().network.isOffline;
    if (isOffline) {
      throw new Error(t('loginScreen.errors.offlineNotice'));
    }

    // Validate input
    validateInput(email, password);

    // Check if there's any existing auth data and clear it
    await clearStoredAuthData();

    // Attempt login with timeout and retries
    const authData = await loginWithTimeout(email, password);
    
    // Verify authData structure
    if (!authData?.token || !authData?.record?.id) {
      throw new Error(t('loginScreen.errors.invalidResponse'));
    }

    // Store authentication data
    try {
      await Promise.all([
        SecureStore.setItemAsync('authToken', authData.token),
        SecureStore.setItemAsync('userID', authData.record.id)
      ]);
    } catch (storageError) {
      console.error('Failed to store auth data:', storageError);
      throw new Error(t('loginScreen.errors.storageError'));
    }

    // Map and store user data
    const userData = mapRecordToUserData(authData.record);
    store.dispatch(setAuthData({ token: authData.token, user: userData }));

    // Setup local database
    try {
      await createTable();
      await insertUser(userData);
    } catch (dbError) {
      console.error('Failed to setup local database:', dbError);
      throw new Error(t('loginScreen.errors.databaseError'));
    }

    return authData;

  } catch (error) {
    console.error('Login error:', error);
    
    const errorData = error as LoginError;
    
    // Handle specific error cases
    switch (errorData.status) {
      case 400:
        throw new Error(t('loginScreen.errors.400'));
      case 401:
        throw new Error(t('loginScreen.errors.invalidCredentials'));
      case 429:
        throw new Error(t('loginScreen.errors.tooManyAttempts'));
      case 500:
        throw new Error(t('loginScreen.errors.500'));
      default:
        if (errorData.isTimeout) {  // Check the timeout flag instead of message
          throw new Error(t('loginScreen.errors.timeout'));
        }
        throw error;
    }
  }
};