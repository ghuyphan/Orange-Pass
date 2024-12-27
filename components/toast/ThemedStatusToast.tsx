import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
 * Props for the ThemedStatusToast component
 * @interface ThemedStatusToastProps
 */
export interface ThemedStatusToastProps {
  /** Custom light theme color */
  lightColor?: string;
  /** Custom dark theme color */
  darkColor?: string;
  /** Name of the icon to display (from MaterialIcons) */
  iconName?: keyof typeof MaterialIcons.glyphMap;
  /** Name of the dismiss icon (from MaterialIcons) */
  dismissIconName?: keyof typeof MaterialIcons.glyphMap;
  /** Callback function when toast is dismissed */
  onDismiss?: () => void;
  /** Message text to display in the toast */
  message: string;
  /** Controls the visibility of the toast */
  isVisible?: boolean;
  /** Indicates if a sync operation is in progress */
  isSyncing?: boolean;
  /** Additional style to apply to the toast container */
  style?: StyleProp<ViewStyle>;
  /** Duration the toast will be visible (in milliseconds) */
  duration?: number;
  /** Callback to toggle visibility of the toast */
  onVisibilityToggle?: (isVisible: boolean) => void;
  /** Flag to force show loading indicator */
  forceLoading?: boolean;
}

/**
 * A customizable toast component with theme support and animations
 * @param {ThemedStatusToastProps} props - Component properties
 * @returns {React.ReactElement|null} Rendered toast component
 */
export function ThemedStatusToast({
  lightColor,
  darkColor,
  iconName = 'info',
  dismissIconName = 'close',
  onDismiss,
  message,
  isVisible = false,
  isSyncing = false,
  style = {},
  duration = 4000,
  onVisibilityToggle,
  forceLoading = false, // New prop to force loading state
}: ThemedStatusToastProps) {
  const { currentTheme } = useTheme();
  const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
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
  const translateY = useSharedValue(getResponsiveHeight(6));

  // Animated style for toast entrance/exit
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Visibility and animation management
  useEffect(() => {
    if (isVisible) {
      // Animate toast in
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });

      // Auto-dismiss timer
      const timer = setTimeout(() => {
        onVisibilityToggle?.(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Animate toast out
      setIsAnimationComplete(true);
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(getResponsiveHeight(6), { duration: 300 });

      // Reset animation state
      setTimeout(() => {
        setIsAnimationComplete(false);
      }, 300);
    }
  }, [isVisible, duration, onVisibilityToggle, opacity, translateY]);

  const handleOnDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss();
    }
    if (onVisibilityToggle) {
      onVisibilityToggle(false);
    }
  }, [onDismiss, onVisibilityToggle]);

  // Render nothing if not visible and no animation in progress
  if (!isVisible && !isAnimationComplete) {
    return null;
  }

  // Determine whether to show loading indicator
  const showLoadingIndicator = forceLoading || isSyncing;

  return (
    <Portal>
      <Animated.View style={[toastStyle, animatedStyle]}>
        <View style={styles.toastContent}>
          <View style={styles.toastTitle}>
            {showLoadingIndicator ? (
              <ActivityIndicator size={getResponsiveFontSize(16)} color={color} />
            ) : (
              <MaterialIcons
                name={iconName}
                size={getResponsiveFontSize(20)}
                color={color}
              />
            )}
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
          {!showLoadingIndicator && (
            <Pressable
              onPress={handleOnDismiss}
              hitSlop={{
                top: getResponsiveHeight(3.6),
                bottom: getResponsiveHeight(3.6),
                left: getResponsiveWidth(3.6),
                right: getResponsiveWidth(3.6),
              }}
              style={styles.iconTouchable}
            >
              <MaterialIcons
                name={dismissIconName}
                size={getResponsiveFontSize(20)}
                color={color}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  toastTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: getResponsiveWidth(2.4),
  },
  messageContainer: {
    flex: 1,
    marginRight: getResponsiveWidth(1.2), // Ensures space for the close button
  },
  toastText: {
    fontSize: getResponsiveFontSize(14),
    overflow: 'hidden',
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12),
  },
});