import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import { t } from '@/i18n';

export const forgot = async (email: string) => {
    Keyboard.dismiss();
    try {
        const authData = await pb.collection('users').requestPasswordReset(
            email,
        );
        return authData
    } catch (error) {
        throw (t('forgotPasswordScreen.errors.500'))
    }
}
