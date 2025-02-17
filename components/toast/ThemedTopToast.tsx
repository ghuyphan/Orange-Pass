import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle, useWindowDimensions } from 'react-native'; // Import useWindowDimensions
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

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
 * A themed top toast component.
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
  const { width: windowWidth } = useWindowDimensions(); // Get window width

  const [localVisible, setLocalVisible] = useState(false);

  // Preprocess maxWidth
  const processedMaxWidth = useMemo(() => {
    if (typeof maxWidth === 'string') {
      if (maxWidth.endsWith('%')) {
        return maxWidth as ReanimatedMaxWidth; // It's a valid percentage
      } else if (maxWidth.endsWith('vw')) {
        const vwValue = parseFloat(maxWidth.slice(0, -2));
        return (vwValue / 100) * windowWidth; // Convert vw to pixels
      }
      // Handle other string formats or invalid strings as needed (e.g., return a default)
      return getResponsiveWidth(90);
    }
    return maxWidth ?? getResponsiveWidth(90);
  }, [maxWidth, windowWidth]);

    const maxWidthStyle = useMemo(() => {
    return {
      maxWidth: processedMaxWidth, // Use the processed value
    };
  }, [processedMaxWidth, currentTheme]);


  const toastStyle = useMemo(
    () => [
      styles.toastContainer,
      {
        backgroundColor:
          currentTheme === 'light'
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

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    const showToast = () => {
      clearTimeout(hideTimer);

      setLocalVisible(true);
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withTiming(10, { duration: 300 });

      showTimer = setTimeout(() => {
        hideToast();
        onVisibilityToggle?.(false);
      }, duration);
    };

    const hideToast = () => {
      clearTimeout(showTimer);
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(-getResponsiveHeight(12), { duration: 300 });

      hideTimer = setTimeout(() => {
        setLocalVisible(false);
      }, 300);
    };

    if (isVisible) {
      showToast();
    } else if (localVisible) {
      hideToast();
    }

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isVisible, duration, onVisibilityToggle]);

  if (!localVisible) {
    return null;
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.5),
    paddingHorizontal: getResponsiveWidth(4),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: getResponsiveHeight(7),
    zIndex: 1000,
    alignSelf: 'center',
  },
  toastText: {
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
  },
});