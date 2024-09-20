import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

interface FocusIndicatorProps {
  focusPoint: { x: number; y: number } | null;
  animatedFocusStyle: any;
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = memo(({ focusPoint, animatedFocusStyle }) => {
  if (!focusPoint) return null;

  return (
    <Animated.View
      style={[
        styles.focusIndicator,
        { left: focusPoint.x - 25, top: focusPoint.y - 25 },
        animatedFocusStyle,
      ]}
    />
  );
});

const styles = StyleSheet.create({
  focusIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
});