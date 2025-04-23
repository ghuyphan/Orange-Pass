import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';

// Define size as a constant
const INDICATOR_SIZE = 60;
const INDICATOR_BORDER_WIDTH = 2;

interface FocusIndicatorProps {
  focusPoint: { x: number; y: number } | null;
  animatedFocusStyle: AnimatedStyle<any>; // Keeping 'any' as in original, but could be stricter if needed
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = memo(
  ({ focusPoint, animatedFocusStyle }) => {
    // Calculate the offset based on the constant size
    const positionOffset = useMemo(() => INDICATOR_SIZE / 2, []);

    const positionStyle = useMemo(() => {
      if (!focusPoint) return null;
      // Use the calculated offset
      return {
        left: focusPoint.x - positionOffset,
        top: focusPoint.y - positionOffset,
      };
    }, [focusPoint, positionOffset]); // Include positionOffset in deps

    if (!positionStyle) return null;

    return (
      <Animated.View
        style={[styles.focusIndicator, positionStyle, animatedFocusStyle]}
        pointerEvents="none"
      />
    );
  }
);

const styles = StyleSheet.create({
  focusIndicator: {
    position: 'absolute',
    // Use the constant for size
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    // Calculate borderRadius based on the constant
    borderRadius: INDICATOR_SIZE / 2,
    borderWidth: INDICATOR_BORDER_WIDTH,
    borderColor: 'rgba(255, 255, 255, 1)', // Solid white
  },
});
