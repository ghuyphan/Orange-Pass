import pb from "@/services/pocketBase";
import { Keyboard } from "react-native";
import { store } from "@/store";
import { t } from "@/i18n";

/**
 * Updates the current user's profile in PocketBase.
 * @param updateData - Object containing fields to update (name, email, currentPassword, newPassword)
 * @param token - The user's auth token
 * @returns The updated user object
 * @throws Error with translated message
 */
export const updateUserProfile = async (
  updateData: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  },
  token: string
) => {
  const isOffline = store.getState().network.isOffline;
  Keyboard.dismiss();

  if (isOffline) {
    throw new Error(t("editProfileScreen.errors.offlineNotice"));
  }

  try {
    // Get current user ID from authStore
    const userId = pb.authStore.model?.id;
    if (!userId) {
      throw new Error(t("authRefresh.errors.invalidToken"));
    }

    // If changing password, PocketBase expects both old and new password fields
    const dataToSend: any = { ...updateData };
    if (updateData.newPassword) {
      dataToSend.password = updateData.newPassword;
      dataToSend.oldPassword = updateData.currentPassword;
      delete dataToSend.currentPassword;
      delete dataToSend.newPassword;
    }

    // Update user in PocketBase
    const updatedUser = await pb.collection("users").update(userId, dataToSend, {
      headers: { Authorization: token },
    });

    return updatedUser;
  } catch (error: any) {
    // PocketBase error format: { status: number, message: string }
    const errorData: { status?: number; message?: string } = error ?? {};
    switch (errorData.status) {
      case 400:
        throw new Error(t("editProfileScreen.errors.400"));
      case 403:
        throw new Error(t("editProfileScreen.errors.403"));
      case 500:
        throw new Error(t("editProfileScreen.errors.500"));
      default:
        throw new Error(errorData.message || t("editProfileScreen.errors.unknown"));
    }
  }
};
