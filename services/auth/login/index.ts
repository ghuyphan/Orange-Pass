import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import * as SecureStore from 'expo-secure-store';
import { mapRecordtoUserData } from "../refreshAuth";
import { store } from "@/store";
import { setAuthData } from "@/store/reducers/authSlice";
import { t } from '@/i18n';

import { createTable, insertUser } from "@/services/localDB/userDB";

export const login = async (email: string, password: string) => {
    const isOffline = store.getState().network.isOffline;
    Keyboard.dismiss();
    if (isOffline) {
        throw new Error(t('loginScreen.errors.offlineNotice'));
    } else {
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            console.log(authData);
            await SecureStore.setItemAsync('authToken', authData.token);
            await SecureStore.setItemAsync('userID', authData.record.id)
            const userData = mapRecordtoUserData(authData.record);
            store.dispatch(setAuthData({ token: authData.token, user: userData }));
            await createTable();
            await insertUser(userData);
            return authData
        } catch (error) {
            console.error(error)
            const errorData: { status: number; message: string } = error as { status: number; message: string };
            switch (errorData.status) {
                case 400:
                    throw (t('loginScreen.errors.400'))
                case 500:
                    throw (t('loginScreen.errors.500'))
                default:
                    throw error
            }
        }
    }
}
