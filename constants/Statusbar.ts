import { Platform, StatusBar, Dimensions } from "react-native";

const { height: screenHeight } = Dimensions.get('window');

// Determine the correct status bar height based on device type
export const STATUSBAR_HEIGHT = Platform.OS === 'ios'
  ? (() => {
      if (screenHeight >= 812) {
        return 59; // Dynamic Island iPhones (newer models)
      } else if (screenHeight >= 667 && screenHeight < 812) {
        return 47; // Notch iPhones (older models)
      } else {
        return 20; // iPhones with no notch or older devices
      }
    })()
  : (StatusBar.currentHeight ? StatusBar.currentHeight : 0); // Android

