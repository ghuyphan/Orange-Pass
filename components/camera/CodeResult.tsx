// QRResult.tsx
import React, { useCallback, useMemo } from "react";
import {
  Linking,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { StyleProps } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { analyzeCode } from "@/utils/qrUtils";
import WifiManager from "react-native-wifi-reborn";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
} from "@/utils/responsive";
import { triggerHapticFeedback } from "@/utils/haptic";

// Configuration object for consistent styling, matching ZoomControl
const CONFIG = {
  colors: {
    background: Platform.select({
      ios: "rgba(255, 255, 255, 0.08)",
      android: "rgba(255, 255, 255, 0.15)",
    }),
    borderColor: "rgba(255, 255, 255, 0.2)",
    activeText: "#FFCC00",
    activeIcon: "#FFCC00",
  },
  blur: {
    intensity: 10,
  },
};

// Memoized dimension calculations for responsiveness
const useDimensions = () =>
  useMemo(
    () => ({
      container: {
        height: getResponsiveWidth(10),
        borderRadius: getResponsiveWidth(7),
        borderWidth: 0.5,
        paddingHorizontal: getResponsiveWidth(4),
        gap: getResponsiveWidth(2),
      },
      icon: {
        size: getResponsiveFontSize(18),
      },
      text: {
        fontSize: getResponsiveFontSize(12),
        maxWidth: getResponsiveWidth(50),
      },
    }),
    []
  );

type QRResultProps = {
  codeValue: string;
  codeFormat?: number;
  animatedStyle: StyleProps;
  onNavigateToAdd: (
    codeFormat?: number,
    codeValue?: string,
    bin?: string,
    codeType?: string,
    codeProvider?: string
  ) => void;
};

export const QRResult: React.FC<QRResultProps> = ({
  codeValue,
  codeFormat,
  animatedStyle,
  onNavigateToAdd,
}) => {
  const dimensions = useDimensions();
  const scanResult = analyzeCode(codeValue, { codeFormat });

  const getFormattedText = useCallback(() => {
    switch (scanResult.codeType) {
      case "URL":
        const hostname = new URL(scanResult.rawCodeValue).hostname.replace(
          /^www\./,
          ""
        );
        const domainParts = hostname.split(".");
        let result;
        if (domainParts.length >= 2) {
          result = domainParts.slice(-2).join(".");
          if (
            domainParts.length >= 3 &&
            domainParts[domainParts.length - 2].length <= 3
          ) {
            result = domainParts.slice(-3).join(".");
          }
        } else {
          result = hostname;
        }
        return result;
      case "WIFI":
        return `Connect to Wi-Fi ${scanResult.ssid}?`;
      case "bank":
      case "ewallet":
        return `Add QR Code.`;
      default:
        return scanResult.rawCodeValue;
    }
  }, [scanResult]);

  const onConnectToWifi = async (
    ssid: string,
    password: string,
    isWep: boolean,
    isHidden: boolean
  ) => {
    try {
      await WifiManager.connectToProtectedSSID(ssid, password, isWep, isHidden);
      Alert.alert("Success", "Connected to Wi-Fi network!");
    } catch (error: any) {
      console.error("Connection failed:", error);
      if (error === "didNotFindNetwork") {
        Alert.alert("Error", "Wi-Fi network not found.");
      } else if (error === "authenticationErrorOccurred") {
        Alert.alert("Error", "Incorrect Wi-Fi password.");
      } else if (error === "locationPermissionMissing") {
        Alert.alert(
          "Error",
          "Location permission is required to scan for Wi-Fi networks. Please enable it in settings."
        );
      } else {
        Alert.alert("Error", "Failed to connect to Wi-Fi.");
      }
    }
  };

  const onResultTap = useCallback(() => {
    triggerHapticFeedback();
    switch (scanResult.codeType) {
      case "URL":
        Linking.openURL(scanResult.rawCodeValue);
        break;
      case "WIFI":
        onConnectToWifi(
          scanResult.ssid,
          scanResult.password,
          scanResult.isWEP,
          scanResult.isHidden
        );
        break;
      case "bank":
      case "ewallet":
        onNavigateToAdd(
          scanResult.codeFormat,
          scanResult.rawCodeValue,
          scanResult.bin,
          scanResult.codeType,
          scanResult.provider
        );
        break;
    }
  }, [scanResult, onNavigateToAdd]);

  const formattedText = getFormattedText();
  const resolvedIconName = scanResult.iconName;

  const containerShadowStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    // By setting alignSelf here, the Pressable shrinks to fit its content.
    <Pressable style={{ alignSelf: "center" }} onPress={onResultTap}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            // alignSelf: "center", // <-- This was moved to the Pressable
            backgroundColor: CONFIG.colors.background,
            borderRadius: dimensions.container.borderRadius,
            borderWidth: dimensions.container.borderWidth,
            borderColor: CONFIG.colors.borderColor,
            height: dimensions.container.height,
            paddingHorizontal: dimensions.container.paddingHorizontal,
            gap: dimensions.container.gap,
            ...(Platform.OS === "ios" && {
              backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
            }),
          },
          containerShadowStyle,
          animatedStyle,
        ]}
      >
        <MaterialIcons
          name={resolvedIconName}
          size={dimensions.icon.size}
          color={CONFIG.colors.activeIcon}
        />
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={1}
          style={{
            color: CONFIG.colors.activeText,
            fontSize: dimensions.text.fontSize,
            maxWidth: dimensions.text.maxWidth,
          }}
        >
          {formattedText}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
};