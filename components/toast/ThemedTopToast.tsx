import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

// Interface for the props of the ThemedTopToast component.
export interface ThemedTopToastProps {
  lightColor?: string; // Custom background color for light mode (optional).
  darkColor?: string;  // Custom background color for dark mode (optional).
  message: string;      // The message to display in the toast.
  isVisible?: boolean; // Controls the visibility of the toast (optional, defaults to false).
  style?: StyleProp<ViewStyle>; // Additional styles for the toast container (optional).
  duration?: number;     // Duration the toast should be visible (in milliseconds, defaults to 4000).
  onVisibilityToggle?: (isVisible: boolean) => void; // Callback when visibility changes (optional).
}

/**
 * A themed top toast component that animates in and out.
 * Uses react-native-reanimated for smooth animations.
 */
export function ThemedTopToast({
  lightColor,
  darkColor,
  message,
  isVisible = false, // Default to hidden if not explicitly shown.
  style = {},
  duration = 4000,   // Default duration of 4 seconds.
  onVisibilityToggle,
}: ThemedTopToastProps) {
  const { currentTheme } = useTheme(); // Get the current theme from the context.

  // Internal visibility state.  We use this to control the *hiding* animation,
  // after the display duration has passed.  Starts hidden.
  const [localVisible, setLocalVisible] = useState(false);

  // Memoize the toast style to avoid unnecessary recalculations.
  const toastStyle = useMemo(
    () => [
      styles.toastContainer,
      {
        // Dynamically set the background color based on the theme.
        backgroundColor:
          currentTheme === 'light'
            ? Colors.light.toastBackground
            : Colors.dark.toastBackground,
      },
      style, // Apply any custom styles passed via props.
    ],
    [currentTheme, style] // Recalculate only when theme or custom styles change.
  );

  // Shared values for animation (using react-native-reanimated).
  const opacity = useSharedValue(0);       // Initial opacity: 0 (hidden).
  const translateY = useSharedValue(-getResponsiveHeight(10)); // Initial position: above the screen.

  // Define the animated style using useAnimatedStyle.
  // This automatically updates the component's style whenever opacity or translateY change.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // useEffect hook to handle showing and hiding the toast.
  useEffect(() => {
    let timer: NodeJS.Timeout; // Variable to hold the timeout ID.

    if (isVisible) {
      // --- Showing the toast ---

      // Set localVisible to true immediately.  This ensures the component is rendered.
      setLocalVisible(true);

      // Animate the opacity to 1 (fully visible) over 300ms.
      opacity.value = withTiming(1, { duration: 300 });
      // Animate the translateY value to bring the toast into view.
      translateY.value = withTiming(2, { duration: 300 });

      // Set a timeout to hide the toast after the specified duration.
      timer = setTimeout(() => {
        // After the duration, set localVisible to false. This triggers the hiding animation.
        setLocalVisible(false);
        // Call the onVisibilityToggle callback, if provided, to notify the parent.
        onVisibilityToggle?.(false);
      }, duration);

    } else if (localVisible) {
      // --- Hiding the toast ---
        // Only animate out if we were PREVIOUSLY visible. This prevents animation glitches
        // if isVisible is set to false *before* the timeout fires.

        // Animate the opacity to 0 (hidden) over 300ms.
        opacity.value = withTiming(0, { duration: 300 });
        // Animate the translateY value to move the toast off-screen.
        translateY.value = withTiming(-getResponsiveHeight(12), { duration: 300 });
    }

    // Cleanup function: Clear the timeout if the component unmounts or
    // if the dependencies change before the timeout fires.  This is crucial
    // to prevent memory leaks and unexpected behavior.
    return () => clearTimeout(timer);

    // Dependency array.  This useEffect runs whenever isVisible, localVisible,
    // duration, or onVisibilityToggle changes.  This ensures the toast
    // correctly responds to changes in these props.
  }, [isVisible, localVisible, duration, onVisibilityToggle]);

  // Only render the toast if localVisible is true. This reflects the
  // *animated* visibility state.
  if (!localVisible) {
    return null;
  }

  return (
      <Animated.View style={[toastStyle, animatedStyle]}>
        <ThemedText
          style={styles.toastText}
          numberOfLines={2} // Limit the text to a maximum of 2 lines.
          ellipsizeMode="tail" // If the text is too long, truncate with "..." at the end.
          type="defaultSemiBold"
        >
          {message}
        </ThemedText>
      </Animated.View>
  );
}

// StyleSheet for the component.
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
    fontSize: getResponsiveFontSize(14), // Responsive font size.
    textAlign: 'center',                  // Center the text.
  },
});