import React, { useCallback, useEffect, ReactNode } from 'react';
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
  
  /** Determines the type of indicator to show */
  indicatorType?: 'none' | 'spinner' | 'icon';
  
  /** Optional icon to show instead of spinner */
  indicatorIcon?: ReactNode;
  
  /** Background color for the toast */
  backgroundColor?: string;
  
  /** Style for the toast container */
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
  indicatorType = 'none',
  indicatorIcon,
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

  // Callback for onVisibilityToggle to prevent unnecessary re-renders
  const handleVisibilityToggle = useCallback(
    (visible: boolean) => {
      if (onVisibilityToggle) {
        onVisibilityToggle(visible);
      }
    },
    [onVisibilityToggle]
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

  // Determine the indicator to render
  const renderIndicator = () => {
    switch (indicatorType) {
      case 'spinner':
        return <ActivityIndicator size={15} color={color} />;
      case 'icon':
        return indicatorIcon || null;
      default:
        return null;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          paddingBottom: Platform.OS === 'ios' ? 20 : 0,
          backgroundColor: backgroundColor || 
            (currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground),
        },
        style,
        animatedStyle,
      ]}
    >
      <View style={styles.toastTitle}>
        {renderIndicator()}
        <ThemedText 
          style={styles.toastText} 
          numberOfLines={2} 
          type="defaultSemiBold"
        >
          {message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    paddingVertical: 5,
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

export default ThemedBottomToast;