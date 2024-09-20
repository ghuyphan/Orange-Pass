import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import { store } from "@/store";
import { t } from '@/i18n'

export const register = async (name: string, email: string, password: string, passwordConfirm: string) => {
    const isOffline = store.getState().network.isOffline;
    Keyboard.dismiss();
    if (isOffline) {
        throw new Error(t('registerScreen.errors.offlineNotice'));
    } else {
        try {
            const authData = await pb.collection('users').create({
                name: name,
                email: email,
                password: password,
                passwordConfirm: passwordConfirm,
            });
            return authData
        } catch (error) {
            const errorData: { status: number; message: string } = error as { status: number; message: string };
            switch (errorData.status) {
                case 400:
                    throw (t('registerScreen.errors.400'))
                case 403:
                    throw (t('registerScreen.errors.403'))
                case 500:
                    throw (t('registerScreen.errors.500'))
                default:
                    throw error
            }
        }
    }
}

