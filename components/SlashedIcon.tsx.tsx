import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Reanimated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

const AnimatedLine = Reanimated.createAnimatedComponent(Line);

type AnimatedSlashedIconProps = {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size: number;
  color: string;
  isSlashed?: boolean;
  strokeWidth?: number;
  animationDuration?: number;
  // --- NEW ---: Control how much the line extends beyond the icon
  extensionFactor?: number;
};

export function AnimatedSlashedIcon({
  name,
  size,
  color,
  isSlashed = false,
  strokeWidth = 1.5,
  animationDuration = 300,
  // --- NEW ---: Default to a 15% extension on each side
  extensionFactor = 0.015,
}: AnimatedSlashedIconProps) {
  // --- UPDATED ---: Calculate the new, larger canvas size
  const extension = useMemo(() => size * extensionFactor, [
    size,
    extensionFactor,
  ]);
  const svgContainerSize = useMemo(() => size + extension * 2, [
    size,
    extension,
  ]);

  // --- UPDATED ---: The line's length is now based on the larger container
  const lineLength = useMemo(() => Math.hypot(svgContainerSize, svgContainerSize), [
    svgContainerSize,
  ]);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isSlashed ? 1 : 0, {
      duration: animationDuration,
      easing: Easing.out(Easing.quad),
    });
  }, [isSlashed, progress, animationDuration]);

  const animatedLineProps = useAnimatedProps(() => {
    const strokeDashoffset = lineLength * (1 - progress.value);
    return {
      strokeDasharray: [lineLength, lineLength],
      strokeDashoffset,
    };
  });

  const animatedSvgContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
    };
  });

  return (
    // This outer view still defines the component's layout size
    <View style={{ width: size, height: size }}>
      <MaterialCommunityIcons
        name={name}
        size={size}
        color={color}
        style={styles.icon}
      />
      <Reanimated.View
        // --- UPDATED ---: Style for the larger, centered SVG container
        style={[
          styles.svgContainer,
          {
            width: svgContainerSize,
            height: svgContainerSize,
            // Use negative margins to center the larger box over the icon
            top: -extension,
            left: -extension,
          },
          animatedSvgContainerStyle,
        ]}
      >
        <Svg style={styles.svg}>
          <AnimatedLine
            x1="0"
            y1="0"
            // --- UPDATED ---: Draw the line to the edges of the new, larger container
            x2={svgContainerSize}
            y2={svgContainerSize}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            animatedProps={animatedLineProps}
          />
        </Svg>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    justifyContent: "center",
    alignItems: "center",
  },
  // --- NEW ---: Style for the absolutely positioned SVG container
  svgContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  svg: {
    flex: 1,
  },
});