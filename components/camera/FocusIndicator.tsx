import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {AnimatedStyle} from 'react-native-reanimated';

interface FocusIndicatorProps {
  focusPoint: { x: number; y: number } | null;
  animatedFocusStyle: AnimatedStyle<any>; // This line assumes a correction based on the library's type definitions
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = memo(({ focusPoint, animatedFocusStyle }) => {
  // 1. Use useMemo for calculating position styles
  const positionStyle = useMemo(() => {
    if (!focusPoint) return null;
    return {
      left: focusPoint.x - 25,
      top: focusPoint.y - 25,
    };
  }, [focusPoint]);

  if (!positionStyle) return null;

  return (
    <Animated.View
      style={[
        styles.focusIndicator,
        positionStyle,
        animatedFocusStyle,
      ]}
      // 4. Add pointerEvents='none' to prevent touch events
      pointerEvents='none'
    />
  );
});

const styles = StyleSheet.create({
  focusIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30, // Using half of width/height is more reliable than a fixed value
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)',
    // 2. Remove unnecessary elevation from StyleSheet (only relevant for Android)
    // 3. Apply opacity directly instead of via color (if needed)
    // opacity: 0.8, // Example if you need to make it semi-transparent
  },
});