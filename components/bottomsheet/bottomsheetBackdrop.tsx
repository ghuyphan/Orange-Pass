import React from "react";
import { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "@react-native-community/blur";
import { StyleSheet, TouchableWithoutFeedback } from "react-native";
import { View } from "moti";

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
    // Allow touches to propagate when the backdrop is fully closed
    pointerEvents: animatedIndex.value >= 0 ? "auto" : "none",
  }));


  const shouldRenderBlurStyle = useAnimatedStyle(() => ({
    display: animatedIndex.value > -1 && animatedIndex.value <= 0 ? "flex" : "none",
  }));

  return (
    <TouchableWithoutFeedback onPress={onPress} accessible={false}>
      <Animated.View style={[style, containerAnimatedStyle, {zIndex: 0}]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, shouldRenderBlurStyle]}>
          {/* <BlurView
            style={StyleSheet.absoluteFillObject}
            blurType="dark"
            blurAmount={5}
            reducedTransparencyFallbackColor="gray"
          /> */}
          <View style={[StyleSheet.absoluteFillObject, {backgroundColor: 'rgba(0, 0, 0, 0.7)'}]}/>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>

  );
};

export default CustomBackdrop;
