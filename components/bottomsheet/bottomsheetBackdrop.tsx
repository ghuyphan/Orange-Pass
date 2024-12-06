import React from "react";
import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "@react-native-community/blur";
import { StyleSheet, TouchableWithoutFeedback } from "react-native";

const CustomBackdrop = ({
  animatedIndex,
  style,
  onPress,
}: BottomSheetBackdropProps & { onPress?: () => void }) => {
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedIndex.value,
      [-1, -0.5, 0],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    ),
    pointerEvents: animatedIndex.value > -1 ? "auto" : "none",
  }));

  const shouldRenderBlurStyle = useAnimatedStyle(() => ({
    display: animatedIndex.value > -1 && animatedIndex.value <= 0 ? "flex" : "none",
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} accessibilityRole="button">
      <Animated.View style={[style, containerAnimatedStyle]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, shouldRenderBlurStyle]}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={5}
            
            reducedTransparencyFallbackColor="gray"
          />
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default CustomBackdrop;
