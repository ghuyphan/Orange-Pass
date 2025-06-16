import React, { memo } from "react";
import { StyleSheet } from "react-native";
import Animated, { AnimatedStyle } from "react-native-reanimated";

// Define constants for styling to ensure consistency
const INDICATOR_SIZE = 60;
const INDICATOR_BORDER_WIDTH = 2;

interface FocusIndicatorProps {
  // The component only needs the final animated style object
  animatedFocusStyle: AnimatedStyle<any>;
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = memo(
  ({ animatedFocusStyle }) => {
    // The component is now stateless and doesn't calculate its own position.
    // It simply renders an Animated.View with the styles passed from the parent hook.
    return (
      <Animated.View
        style={[styles.focusIndicator, animatedFocusStyle]}
        pointerEvents="none"
      />
    );
  }
);

const styles = StyleSheet.create({
  focusIndicator: {
    position: "absolute",
    // Position is set to the top-left corner.
    // The actual on-screen position is controlled by the `transform` property
    // within the animatedFocusStyle.
    top: 0,
    left: 0,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
    borderWidth: INDICATOR_BORDER_WIDTH,
    borderColor: "rgba(255, 255, 255, 1)", // Solid white for visibility
  },
});