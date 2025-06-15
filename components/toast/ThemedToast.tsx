import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, View, StyleProp, ViewStyle, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Portal } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "../ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";

export type ThemedToastProps = {
  lightColor?: string;
  darkColor?: string;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  dismissIconName?: keyof typeof MaterialIcons.glyphMap;
  onDismiss?: () => void;
  message: string;
  duration?: number;
  isVisible?: boolean;
  style?: StyleProp<ViewStyle>;
  onVisibilityToggle?: (isVisible: boolean) => void;
};

/**
 * A themed toast component that displays a message with an icon
 * and supports swipe-down-to-dismiss.
 *
 * @param {ThemedToastProps} props - The component props.
 * @returns {JSX.Element | null} - The rendered toast component or null if not visible.
 */
export function ThemedToast({
  lightColor,
  darkColor,
  iconName,
  dismissIconName,
  onDismiss,
  message,
  duration = 4000,
  isVisible = false,
  style = {},
  onVisibilityToggle, // Kept for compatibility, but onDismiss is preferred
}: ThemedToastProps) {
  const { currentTheme } = useTheme();
  const color = currentTheme === "light" ? Colors.light.text : Colors.dark.text;

  const [isRendered, setIsRendered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const toastStyle = useMemo(
    () => [
      styles.toastContainer,
      {
        backgroundColor:
          currentTheme === "light"
            ? Colors.light.cardBackground
            : Colors.dark.cardBackground,
      },
      style,
    ],
    [currentTheme, style]
  );

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);
  const dragContext = useSharedValue({ startY: 0 });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  // A stable dismiss handler for both gesture and button press
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    } else if (onVisibilityToggle) {
      // Fallback to onVisibilityToggle if onDismiss is not provided
      onVisibilityToggle(false);
    }
  }, [onDismiss, onVisibilityToggle]);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (isVisible) {
      setIsRendered(true);
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });

      hideTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else if (isRendered) {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(50, { duration: 300 });

      // Wait for animation to finish before unmounting
      setTimeout(() => {
        setIsRendered(false);
      }, 300);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isVisible, duration, handleDismiss, isRendered, opacity, translateY]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Cancel auto-hide timer when user interacts
      if (hideTimerRef.current) {
        runOnJS(clearTimeout)(hideTimerRef.current);
      }
      dragContext.value = { startY: translateY.value };
    })
    .onUpdate((event) => {
      // Allow dragging downwards, but not above the initial position (0)
      const newY = dragContext.value.startY + event.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((event) => {
      // Dismiss if swiped down with enough velocity or distance
      if (event.translationY > 50 || event.velocityY > 500) {
        runOnJS(handleDismiss)();
      } else {
        // Otherwise, snap back to the original position
        translateY.value = withTiming(0, { duration: 300 });
      }
    });

  if (!isRendered) {
    return null;
  }

  return (
    <Portal>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.wrapper, animatedStyle]}>
          <View style={toastStyle}>
            <View style={styles.toastContent}>
              <View style={styles.toastTitle}>
                <MaterialIcons
                  name={iconName || "info"}
                  size={20}
                  color={color}
                />
                <View style={styles.messageContainer}>
                  <ThemedText
                    style={styles.toastText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    type="defaultSemiBold"
                  >
                    {message}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={handleDismiss}
                style={styles.iconTouchable}
                hitSlop={30}
              >
                <MaterialIcons
                  name={dismissIconName || "close"}
                  size={20}
                  color={color}
                />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Portal>
  );
}

const styles = StyleSheet.create({
  // New wrapper style for positioning and gesture handling
  wrapper: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  toastContainer: {
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    // Shadow for better visibility
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  toastTitle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  messageContainer: {
    flex: 1,
    marginRight: 5,
  },
  toastText: {
    fontSize: 14,
    overflow: "hidden",
  },
  iconTouchable: {
    borderRadius: 50,
  },
});