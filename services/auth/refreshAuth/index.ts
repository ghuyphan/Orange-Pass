import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';

// Enhanced type definitions
interface AuthErrorData {
    status: number;
    message: string;
}

// More robust mapping function with type safety
const mapRecordToUserData = (record: Record<string, any>): UserRecord => {
    return {
        id: record.id ?? '',
        username: record.username ?? '',
        email: record.email ?? '',
        verified: record.verified ?? false,
        name: record.name ?? '',
        avatar: record.avatar ?? ''
    };
};

// Centralized error handling with more specific error types
const handleTokenRefreshError = async (
    error: Error & { data?: AuthErrorData }, 
    authToken: string
): Promise<boolean> => {
    const errorStatus = error.data?.status ?? 500;

    switch (errorStatus) {
        case 401:   // Unauthorized
        case 403:   // Forbidden
        case 404:   // Not Found
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t(`authRefresh.errors.${errorStatus}`)));
            return true;
        
        case 500:   // Internal Server Error
            store.dispatch(setErrorMessage(t('authRefresh.errors.500')));
            console.warn('Token refresh encountered a server error', error);
            return false;
        
        default:
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t('authRefresh.errors.unknown')));
            console.error('Unexpected token refresh error', error);
            return true;
    }
};

// Comprehensive initial authentication check
const checkInitialAuth = async (): Promise<boolean> => {
    try {
        const { network: { isOffline } } = store.getState();
        const authToken = await SecureStore.getItemAsync('authToken');
        const userID = await SecureStore.getItemAsync('userID');

        // Early return if no token or user ID
        if (!authToken || !userID) return false;

        const expirationDate = getTokenExpirationDate(authToken);
        
        // Check token validity
        if (!expirationDate || expirationDate <= new Date()) {
            return isOffline ? false : await refreshAuthToken(authToken);
        }

        // Retrieve local user data
        const localUserData = await getUserById(userID);
        if (!localUserData) return false;

        // Update auth state
        store.dispatch(setAuthData({ token: authToken, user: localUserData }));

        // Attempt token refresh in background if online
        if (!isOffline) {
            refreshAuthToken(authToken).catch(error => {
                console.warn('Background token refresh failed', error);
            });
        }

        return true;
    } catch (error) {
        console.error('Authentication check failed', error);
        return false;
    }
};

// Refined token refresh with improved error handling
const refreshAuthToken = async (authToken: string): Promise<boolean> => {
    try {
        // Validate existing auth store
        pb.authStore.save(authToken, null);
        if (!pb.authStore.isValid) {
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t('authRefresh.errors.401')));
            return false;
        }

        // Attempt to refresh authentication
        const authData = await pb.collection('users').authRefresh();
        
        // Validate refresh response
        if (!authData?.token || !authData?.record) {
            throw new Error("Invalid authentication refresh response");
        }

        // Update stored authentication details
        const userData = mapRecordToUserData(authData.record);
        await SecureStore.setItemAsync('authToken', authData.token);
        pb.authStore.save(authData.token, authData.record);

        // Update global state
        store.dispatch(setAuthData({ 
            token: authData.token, 
            user: userData 
        }));

        return true;
    } catch (error: any) {
        return handleTokenRefreshError(error, authToken);
    }
};

export { 
    mapRecordToUserData, 
    checkInitialAuth, 
    refreshAuthToken 
};