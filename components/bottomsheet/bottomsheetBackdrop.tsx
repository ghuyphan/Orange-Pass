import React from "react";
import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { StyleSheet, TouchableWithoutFeedback } from "react-native";
import { View } from "moti";

interface CustomBackdropProps extends BottomSheetBackdropProps {
  onPress?: () => void;
  backgroundColor?: string;
  pressThreshold?: number; // Added to control press sensitivity
}

const CustomBackdrop = ({
  animatedIndex,
  style,
  onPress,
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  pressThreshold = 0, // Default threshold for press
}: CustomBackdropProps) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, -0.1, 1], // Adjusted interpolation range
      [0, 0.5, 1],
      Extrapolation.CLAMP
    ),
    pointerEvents: animatedIndex.value >= pressThreshold ? "auto" : "none",
  }));

  const shouldRenderBackdropStyle = useAnimatedStyle(() => ({
    display: animatedIndex.value > -1 ? "flex" : "none",
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} accessible={false}>
      <Animated.View style={[style, containerAnimatedStyle, { zIndex: 0 }]}>
        <Animated.View 
          style={[
            StyleSheet.absoluteFillObject, 
            shouldRenderBackdropStyle,
            { backgroundColor }
          ]}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default CustomBackdrop;