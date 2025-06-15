import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Pressable,
  View,
  Platform,
} from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import Animated from "react-native-reanimated";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle, GlassIntensity } from "@/hooks/useGlassStyle";

// --- Type Definitions ---

type ButtonConfig = {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  // --- ADDED ---: Allow individual buttons to be disabled
  disabled?: boolean;
};

export type ThemedDualButtonProps = {
  leftButton: ButtonConfig;
  rightButton: ButtonConfig;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean; // Disables the entire component
  loading?: boolean;
  loadingColor?: string;
  iconSize?: number;
  iconColor?: string;
  leftIconColor?: string;
  rightIconColor?: string;
  debounceTime?: number;
  variant?: "default" | "solid" | "glass" | "outline";
  glassIntensity?: GlassIntensity;
  borderColor?: string;
  borderWidth?: number;
  activeSide?: "left" | "right" | "none";
  activeColor?: string;
};

// --- The New Component ---

export function ThemedDualButton({
  leftButton,
  rightButton,
  style = {},
  disabled = false,
  loading = false,
  loadingColor,
  iconSize = getResponsiveWidth(5),
  iconColor,
  leftIconColor: leftIconColorProp,
  rightIconColor: rightIconColorProp,
  debounceTime = 300,
  variant = "default",
  glassIntensity = "medium",
  borderColor,
  borderWidth = 1,
  activeSide = "none",
  activeColor,
}: ThemedDualButtonProps): JSX.Element {
  const glassStyle = useGlassStyle(
    variant === "glass" ? "strong" : glassIntensity
  );
  const themeIconColor = useThemeColor(
    { light: Colors.light.icon, dark: Colors.dark.icon },
    "icon"
  );
  const themeSolidBg = useThemeColor(
    {
      light: Colors.light.buttonBackground,
      dark: Colors.dark.buttonBackground,
    },
    "buttonBackground"
  );

  const [isLeftDebouncing, setIsLeftDebouncing] = useState(false);
  const [isRightDebouncing, setIsRightDebouncing] = useState(false);
  const leftDebounceTimerRef = useRef<number | null>(null);
  const rightDebounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (leftDebounceTimerRef.current)
        clearTimeout(leftDebounceTimerRef.current);
      if (rightDebounceTimerRef.current)
        clearTimeout(rightDebounceTimerRef.current);
    };
  }, []);

  // --- MODIFIED ---: Calculate disabled state for each button individually
  const isGloballyDisabled = disabled || loading;
  const isLeftDisabled = isGloballyDisabled || leftButton.disabled;
  const isRightDisabled = isGloballyDisabled || rightButton.disabled;

  // --- Memoized Values for Performance ---

  const containerStyle = useMemo<StyleProp<ViewStyle>>(() => {
    // --- MODIFIED ---: Removed opacity from the container style
    const baseStyle: ViewStyle = {
      ...styles.container,
    };

    switch (variant) {
      case "solid":
        return [baseStyle, { backgroundColor: themeSolidBg }, style];
      case "outline":
        return [
          baseStyle,
          {
            backgroundColor: "transparent",
            borderWidth: borderWidth,
            borderColor: borderColor || themeIconColor,
          },
          style,
        ];
      case "glass":
      default:
        return [
          baseStyle,
          {
            backgroundColor: glassStyle.background,
            ...glassStyle.getGlassBorder(),
            ...(Platform.OS === "ios" && { backdropFilter: "blur(10px)" }),
          },
          glassStyle.getGlassShadow(),
          style,
        ];
    }
  }, [
    variant,
    glassStyle,
    style,
    borderWidth,
    borderColor,
    themeIconColor,
    themeSolidBg,
  ]);

  const leftIconColor = leftIconColorProp || iconColor || themeIconColor;
  const rightIconColor = rightIconColorProp || iconColor || themeIconColor;
  const finalActiveColor = activeColor || themeSolidBg;

  // --- Handlers ---

  const handleLeftPress = useCallback(() => {
    if (isLeftDebouncing) return;
    leftButton.onPress();
    setIsLeftDebouncing(true);
    leftDebounceTimerRef.current = setTimeout(
      () => setIsLeftDebouncing(false),
      debounceTime
    );
  }, [leftButton.onPress, isLeftDebouncing, debounceTime]);

  const handleRightPress = useCallback(() => {
    if (isRightDebouncing) return;
    rightButton.onPress();
    setIsRightDebouncing(true);
    rightDebounceTimerRef.current = setTimeout(
      () => setIsRightDebouncing(false),
      debounceTime
    );
  }, [rightButton.onPress, isRightDebouncing, debounceTime]);

  return (
    <Animated.View style={containerStyle}>
      {variant === "default" && (
        <View style={[styles.defaultOverlay, glassStyle.getGlassOverlay()]} />
      )}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size={getResponsiveFontSize(23)}
            color={loadingColor || themeIconColor}
          />
        </View>
      ) : (
        <>
          {/* Left Button Part */}
          <Pressable
            onPress={handleLeftPress}
            // --- MODIFIED ---: Use individual disabled state
            disabled={isLeftDisabled || isLeftDebouncing}
            style={[
              styles.buttonPart,
              activeSide === "left" && { backgroundColor: finalActiveColor },
              // --- MODIFIED ---: Apply opacity based on individual state
              { opacity: isLeftDisabled ? 0.5 : 1 },
            ]}
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name={leftButton.iconName}
              size={iconSize}
              color={leftIconColor}
            />
          </Pressable>

          {/* Separator */}
          <View
            style={[
              styles.separator,
              { backgroundColor: borderColor || themeIconColor },
            ]}
          />

          {/* Right Button Part */}
          <Pressable
            onPress={handleRightPress}
            // --- MODIFIED ---: Use individual disabled state
            disabled={isRightDisabled || isRightDebouncing}
            style={[
              styles.buttonPart,
              activeSide === "right" && { backgroundColor: finalActiveColor },
              // --- MODIFIED ---: Apply opacity based on individual state
              { opacity: isRightDisabled ? 0.5 : 1 },
            ]}
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name={rightButton.iconName}
              size={iconSize}
              color={rightIconColor}
            />
          </Pressable>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 100, // Pill shape
    overflow: "hidden",
    alignSelf: "flex-start", // Shrink-wrap to content
    alignItems: "center",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  buttonPart: {
    padding: getResponsiveWidth(2),
    paddingHorizontal: getResponsiveWidth(3),
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    width: 1,
    height: "60%",
    opacity: 0.5,
  },
  loadingContainer: {
    paddingHorizontal: getResponsiveWidth(10),
    paddingVertical: getResponsiveWidth(2.5),
    justifyContent: "center",
    alignItems: "center",
  },
});