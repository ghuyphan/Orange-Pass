import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "../ThemedText";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";

// Define a type for valid Reanimated maxWidth values
type ReanimatedMaxWidth = number | `${number}%`;

// Interface for the props.
export interface ThemedTopToastProps {
  lightColor?: string;
  darkColor?: string;
  message: string;
  isVisible?: boolean;
  style?: StyleProp<ViewStyle>;
  duration?: number;
  onVisibilityToggle?: (isVisible: boolean) => void;
  maxWidth?: ReanimatedMaxWidth | string; // Allow string, but we'll preprocess
}

/**
 * A themed top toast component with slide-up-to-dismiss gesture.
 */
export function ThemedTopToast({
  lightColor,
  darkColor,
  message,
  isVisible = false,
  style = {},
  duration = 4000,
  onVisibilityToggle,
  maxWidth,
}: ThemedTopToastProps) {
  const { currentTheme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const [localVisible, setLocalVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  // Preprocess maxWidth
  const processedMaxWidth = useMemo(() => {
    if (typeof maxWidth === "string") {
      if (maxWidth.endsWith("%")) {
        return maxWidth as ReanimatedMaxWidth; // It's a valid percentage
      } else if (maxWidth.endsWith("vw")) {
        const vwValue = parseFloat(maxWidth.slice(0, -2));
        return (vwValue / 100) * windowWidth; // Convert vw to pixels
      }
      return getResponsiveWidth(90);
    }
    return maxWidth ?? getResponsiveWidth(90);
  }, [maxWidth, windowWidth]);

  const maxWidthStyle = useMemo(() => {
    return {
      maxWidth: processedMaxWidth,
    };
  }, [processedMaxWidth]);

  const toastStyle = useMemo(
    () => [
      styles.toastContainer,
      {
        backgroundColor:
          currentTheme === "light"
            ? Colors.light.toastBackground
            : Colors.dark.toastBackground,
      },
      maxWidthStyle,
      style,
    ],
    [currentTheme, style, maxWidthStyle]
  );

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-getResponsiveHeight(10));
  const dragContext = useSharedValue({ startY: 0 });

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const hideToast = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    opacity.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(-getResponsiveHeight(12), { duration: 300 });

    setTimeout(() => {
      setLocalVisible(false);
    }, 300);
  }, [opacity, translateY]);

  const handleDismiss = useCallback(() => {
    onVisibilityToggle?.(false);
    hideToast();
  }, [onVisibilityToggle, hideToast]);

  useEffect(() => {
    const showToast = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setLocalVisible(true);
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 });

      hideTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    };

    if (isVisible) {
      showToast();
    } else if (localVisible) {
      hideToast();
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isVisible, duration, localVisible, handleDismiss, hideToast, opacity, translateY]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Cancel auto-hide timer when user interacts
      if (hideTimerRef.current) {
        runOnJS(clearTimeout)(hideTimerRef.current);
      }
      dragContext.value = { startY: translateY.value };
    })
    .onUpdate((event) => {
      // Allow dragging upwards
      translateY.value = dragContext.value.startY + event.translationY;
    })
    .onEnd((event) => {
      // Dismiss if swiped up with enough velocity or distance
      if (event.translationY < -20 || event.velocityY < -500) {
        runOnJS(handleDismiss)();
      } else {
        // Otherwise, snap back to the original position
        translateY.value = withTiming(10, { duration: 300 });
      }
    });

  if (!localVisible) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[toastStyle, animatedStyle]}>
        <ThemedText
          style={styles.toastText}
          numberOfLines={1}
          ellipsizeMode="tail"
          type="defaultSemiBold"
        >
          {message}
        </ThemedText>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.5),
    paddingHorizontal: getResponsiveWidth(4),
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: getResponsiveHeight(7),
    zIndex: 1000,
    alignSelf: "center",
  },
  toastText: {
    fontSize: getResponsiveFontSize(14),
    textAlign: "center",
  },
});