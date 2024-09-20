import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB'
import { t } from '@/i18n';

// Mapping function for UserRecord
const mapRecordtoUserData = (record: any): UserRecord => {
    return {
        id: record.id,
        username: record.username || '',
        email: record.email || '',
        verified: record.verified || false,
        name: record.name || '',
        avatar: record.avatar || ''
    };
};

// Handle errors during token refresh
const handleTokenRefreshError = async (error: any, authToken: string): Promise<boolean> => {
    const errorData: { status: number; message: string } = error as { status: number; message: string };
    const userID = await SecureStore.getItemAsync('userID');

    switch (errorData.status) {
        case 401:
        case 403:
        case 404:
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t(`authRefresh.errors.${errorData.status}`)));
            return true; // Continue using local data
        case 500:
        default:
            store.dispatch(setErrorMessage(t('authRefresh.errors.500')));
            return true; // Continue using local data
    }
};

// Initial authentication check
const checkInitialAuth = async (): Promise<boolean> => {
    try {
        const isOffline = store.getState().network.isOffline;
        const authToken = await SecureStore.getItemAsync('authToken');
        const userID = await SecureStore.getItemAsync('userID');

        if (authToken && userID) {
            // First, attempt to authenticate using local data
            const localUserData = await getUserById(userID);
            if (localUserData) {
                // Set local user data to the store
                store.dispatch(setAuthData({ token: authToken, user: localUserData }));

                // Proceed to refresh token in the background if online
                if (!isOffline) {
                    // Refresh token asynchronously
                    refreshAuthToken(authToken);
                }
                // Return true immediately to allow app to proceed
                return true;
            } else {
                // No local user data found
                store.dispatch(setErrorMessage(t('authRefresh.errors.localUserDataNotFound')));
                return false; // Authentication failed due to missing local data
            }
        } else {
            return false; // No auth token or user ID, not authenticated
        }
    } catch (error) {
        console.error("Error checking initial auth:", error);
        return false; // Handle any other errors
    }
};

// Function to refresh auth token in the background
const refreshAuthToken = async (authToken: string) => {
    try {
        pb.authStore.save(authToken, null);
        if (pb.authStore.isValid) {
            const authData = await pb.collection('users').authRefresh();
            const userData = mapRecordtoUserData(authData.record);
            store.dispatch(setAuthData({ token: authData.token, user: userData }));
            await SecureStore.setItemAsync('authToken', authData.token);
            // Optionally, update local database with new user data
        } else {
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t('authRefresh.errors.401')));
        }
    } catch (error) {
        console.error('Error during auth refresh:', error);
        await handleTokenRefreshError(error, authToken);
    }
};

export { mapRecordtoUserData, checkInitialAuth };
