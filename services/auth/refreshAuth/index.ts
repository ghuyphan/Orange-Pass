import pb from "@/services/pocketBase";
import UserRecord from "@/types/userType";
import * as SecureStore from 'expo-secure-store';
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { setErrorMessage } from "@/store/reducers/errorSlice";
import { getTokenExpirationDate } from "@/utils/JWTdecode";
import { getUserById } from '@/services/localDB/userDB';
import { t } from '@/i18n';

// Mapping function for UserRecord
const mapRecordtoUserData = (record: any): UserRecord => ({
    id: record.id,
    username: record.username || '',
    email: record.email || '',
    verified: record.verified || false,
    name: record.name || '',
    avatar: record.avatar || ''
});

// Handle errors during token refresh
const handleTokenRefreshError = async (error: any, authToken: string): Promise<boolean> => {
    const errorData: { status: number; message: string } = error as { status: number; message: string };
    await SecureStore.deleteItemAsync('authToken');

    switch (errorData.status) {
        case 401:
        case 403:
        case 404:
            store.dispatch(setErrorMessage(t(`authRefresh.errors.${errorData.status}`)));
            return true;
        default:
            store.dispatch(setErrorMessage(t('authRefresh.errors.500')));
            return true;
    }
};

// Initial authentication check
const checkInitialAuth = async (): Promise<boolean> => {
    try {
        const isOffline = store.getState().network.isOffline;
        const authToken = await SecureStore.getItemAsync('authToken');
        const userID = await SecureStore.getItemAsync('userID');

        if (authToken && userID) {
            const expirationDate = getTokenExpirationDate(authToken);

            if (expirationDate && expirationDate > new Date()) {
                const localUserData = await getUserById(userID);

                if (localUserData) {
                    store.dispatch(setAuthData({ token: authToken, user: localUserData }));

                    // Only refresh if online
                    if (!isOffline) { 
                        // Refresh token in the background (no need to wait)
                        refreshAuthToken(authToken); 
                    }
                    return true;
                }
            } else if (!isOffline) { // Only refresh if online
                const refreshSuccess = await refreshAuthToken(authToken);
                return refreshSuccess;
            }
        }
        return false;
    } catch {
        return false;
    }
};

// Function to refresh auth token in the background
const refreshAuthToken = async (authToken: string): Promise<boolean> => {
    try {
        pb.authStore.save(authToken, null);

        if (!pb.authStore.isValid) {
            await SecureStore.deleteItemAsync('authToken');
            store.dispatch(setErrorMessage(t('authRefresh.errors.401')));
            return false;
        }

        const authData = await pb.collection('users').authRefresh();

        if (!authData?.token || !authData?.record) {
            throw new Error("Invalid auth refresh response");
        }

        const userData = mapRecordtoUserData(authData.record);
        await SecureStore.setItemAsync('authToken', authData.token);
        pb.authStore.save(authData.token, authData.record);

        store.dispatch(setAuthData({ token: authData.token, user: userData }));
        return true;
    } catch (error: any) {
        await handleTokenRefreshError(error, authToken);
        return false;
    }
};

export { mapRecordtoUserData, checkInitialAuth };
