import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';

export type ThemedBottomToastProps = {
  /** The icon to display in the toast */
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** The message to display in the toast */
  message: string;
  /** Whether the toast is visible */
  isVisible?: boolean;
  /** Whether the toast is syncing */
  isSyncing?: boolean;
  /** Background color for the input */
  backgroundColor?: string;
  /** Style for the input */
  style?: StyleProp<ViewStyle>;
  /** The duration of the toast in milliseconds */
  duration?: number;
  /** Callback function to toggle the visibility of the toast */
  onVisibilityToggle?: (isVisible: boolean) => void;
};

export function ThemedBottomToast({
  iconName,
  message,
  isVisible = false,
  isSyncing = false,
  backgroundColor,
  style = {},
  duration = 4000,
  onVisibilityToggle,
}: ThemedBottomToastProps) {
  const { currentTheme } = useTheme();
  const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

  // Reanimated values for animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // useCallback for onVisibilityToggle to prevent unnecessary re-renders
  const handleVisibilityToggle = useCallback(
    (isVisible: boolean) => {
      if (onVisibilityToggle) {
        onVisibilityToggle(isVisible);
      }
    },
    [onVisibilityToggle],
  );

  // Handle visibility and animation
  useEffect(() => {
    if (isVisible) {
      // Show toast with animation
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });

      const timer = setTimeout(() => {
        handleVisibilityToggle(false);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Hide toast with animation
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(50, { duration: 300 });
    }
  }, [isVisible, duration, handleVisibilityToggle, opacity, translateY]);

  // Removed unnecessary isAnimationComplete state and conditional rendering

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          backgroundColor: backgroundColor ? backgroundColor : 
                             currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.toastTitle}>
      {!iconName || isSyncing ? (
          <ActivityIndicator size={15} color={color} />
        ) : (
          <MaterialCommunityIcons name={iconName || 'information-outline'} size={15} color={color} />
        )}
        <ThemedText style={styles.toastText} numberOfLines={2} type="defaultSemiBold">
          {message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toastText: {
    fontSize: 12,
    overflow: 'hidden',
  },
});