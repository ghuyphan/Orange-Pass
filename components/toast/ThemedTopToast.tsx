import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Portal } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

/**
 * Props for the ThemedTopToast component
 * @interface ThemedTopToastProps
 */
export interface ThemedTopToastProps {
  /** Custom light theme color */
  lightColor?: string;
  /** Custom dark theme color */
  darkColor?: string;
  /** Message text to display in the toast */
  message: string;
  /** Controls the visibility of the toast */
  isVisible?: boolean;
  /** Additional style to apply to the toast container */
  style?: StyleProp<ViewStyle>;
  /** Duration the toast will be visible (in milliseconds) */
  duration?: number;
  /** Callback to toggle visibility of the toast */
  onVisibilityToggle?: (isVisible: boolean) => void;
}

/**
 * A themed text-only toast component displayed at the top with animations
 * @param {ThemedTopToastProps} props - Component properties
 * @returns {React.ReactElement|null} Rendered toast component
 */
export function ThemedTopToast({
  lightColor,
  darkColor,
  message,
  isVisible = false,
  style = {},
  duration = 4000,
  onVisibilityToggle,
}: ThemedTopToastProps) {
  const { currentTheme } = useTheme();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // Memoized toast style with dynamic theming
  const toastStyle = useMemo(
    () => [
      styles.toastContainer,
      {
        backgroundColor:
          currentTheme === 'light'
            ? Colors.light.toastBackground
            : Colors.dark.toastBackground,
      },
      style,
    ],
    [currentTheme, style]
  );

  // Reanimated shared values for entrance/exit animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-getResponsiveHeight(10));

  // Animated style for toast entrance/exit
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Visibility and animation management
  useEffect(() => {
    if (isVisible) {
      // Animate toast in from the top
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });

      // Auto-dismiss timer
      const timer = setTimeout(() => {
        onVisibilityToggle?.(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Animate toast out to the top
      setIsAnimationComplete(true);
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-getResponsiveHeight(10), { duration: 300 });

      // Reset animation state
      setTimeout(() => {
        setIsAnimationComplete(false);
      }, 300);
    }
  }, [isVisible, duration, onVisibilityToggle, opacity, translateY]);

  // Render nothing if not visible and no animation in progress
  if (!isVisible && !isAnimationComplete) {
    return null;
  }

  return (
    <Portal>
      <Animated.View style={[toastStyle, animatedStyle]}>
          <ThemedText
            style={styles.toastText}
            numberOfLines={2}
            ellipsizeMode="tail"
            type="defaultSemiBold"
          >
            {message}
          </ThemedText>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.5),
    paddingHorizontal: getResponsiveWidth(4),
    alignItems: 'center',
    justifyContent: 'center',
    // Position at the top with no fixed width
    position: 'absolute',
    top: getResponsiveHeight(7),
    zIndex: 1000,
    alignSelf: 'center',
    opacity: 0.3,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center content horizontally
  },
  toastText: {
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
  },
});