import { trigger } from "react-native-haptic-feedback";

const options = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
};

export const triggerHapticFeedback = () => {
    trigger("impactMedium", options);
}