import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolateColor,
} from "react-native-reanimated";

// Centralized configuration for styling and animations
const CONFIG = {
  spring: { stiffness: 200, damping: 16 },
  cornerSpring: { stiffness: 150, damping: 12 },
  timing: { duration: 250 },
  colors: {
    activeBorder: "#FFCC00",
    inactiveBorder: "rgba(255, 255, 255, 0.8)",
    activeBackground: Platform.select({
      ios: "rgba(255, 204, 0, 0.08)",
      android: "rgba(255, 204, 0, 0.15)",
    }),
    inactiveBackground: "rgba(255, 255, 255, 0)",
  },
  blur: {
    intensity: 8,
  },
};

// Memoized hook for responsive dimensions
const useDimensions = () =>
  useMemo(
    () => ({
      frameSize: 220,
      initialCornerSize: 14,
      initialCornerBorderWidth: 2.5,
      cornerRadius: 6,
    }),
    []
  );

interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  width: number;
  height: number;
}

interface ScannerFrameProps {
  highlight: CameraHighlight | null;
  layout: Layout;
  scanFrame: Layout;
}

// Helper function to calculate scaled values.
const calculateScaledValues = (
  highlight: CameraHighlight,
  scanFrame: Layout,
  layout: Layout
) => {
  const xScale = layout.width / scanFrame.height - 0.025;
  const yScale = layout.height / scanFrame.width - 0.01;
  const widthScale = layout.height / scanFrame.width + 0.1;
  const heightScale = layout.width / scanFrame.height + 0.15;

  return {
    x: highlight.x * xScale,
    y: highlight.y * yScale,
    width: highlight.width * widthScale,
    height: highlight.height * heightScale,
  };
};

export const ScannerFrame: React.FC<ScannerFrameProps> = ({
  highlight,
  layout,
  scanFrame,
}) => {
  const dimensions = useDimensions();
  const [layoutReady, setLayoutReady] = useState(false);
  
  // Add a state to track if we have an active highlight
  const [hasActiveHighlight, setHasActiveHighlight] = useState(false);

  const centerPosition = useMemo(() => {
    if (layout.width && layout.height) {
      return {
        x: (layout.width - dimensions.frameSize) / 2,
        y: (layout.height - dimensions.frameSize) / 2,
      };
    }
    return { x: 0, y: 0 };
  }, [layout.width, layout.height, dimensions.frameSize]);

  // Shared values for frame geometry
  const frameX = useSharedValue(centerPosition.x);
  const frameY = useSharedValue(centerPosition.y);
  const frameWidth = useSharedValue(dimensions.frameSize);
  const frameHeight = useSharedValue(dimensions.frameSize);
  const cornerSize = useSharedValue(dimensions.initialCornerSize);
  const cornerBorderWidth = useSharedValue(dimensions.initialCornerBorderWidth);

  // A single shared value to drive all state-dependent animations (0 = inactive, 1 = active)
  const isActive = useSharedValue(0);

  const calculateScalingFactor = (width: number, height: number) => {
    const minDimension = Math.min(width, height);
    return Math.max(0.7, minDimension / dimensions.frameSize);
  };

  const animatedFrameStyle = useAnimatedStyle(() => {
    // Interpolate background color based on the isActive state
    const backgroundColor = interpolateColor(
      isActive.value,
      [0, 1],
      [CONFIG.colors.inactiveBackground, CONFIG.colors.activeBackground ?? '']
    );

    return {
      position: "absolute",
      borderRadius: dimensions.cornerRadius,
      pointerEvents: "box-none",
      left: frameX.value,
      top: frameY.value,
      width: frameWidth.value,
      height: frameHeight.value,
      backgroundColor: backgroundColor,
      ...(Platform.OS === "ios" && {
        backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
      }),
    };
  });

  const animatedBorderStyle = useAnimatedStyle(() => {
    // Interpolate border color based on the isActive state
    const borderColor = interpolateColor(
      isActive.value,
      [0, 1],
      [CONFIG.colors.inactiveBorder, CONFIG.colors.activeBorder]
    );

    return {
      borderColor: borderColor,
      width: cornerSize.value,
      height: cornerSize.value,
      borderWidth: cornerBorderWidth.value,
    };
  });

  const cornerStyles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          position: "absolute",
        },
        topLeft: {
          top: 0,
          left: 0,
          borderTopLeftRadius: dimensions.cornerRadius,
          borderRightWidth: 0,
          borderBottomWidth: 0,
        },
        topRight: {
          top: 0,
          right: 0,
          borderTopRightRadius: dimensions.cornerRadius,
          borderLeftWidth: 0,
          borderBottomWidth: 0,
        },
        bottomLeft: {
          bottom: 0,
          left: 0,
          borderBottomLeftRadius: dimensions.cornerRadius,
          borderRightWidth: 0,
          borderTopWidth: 0,
        },
        bottomRight: {
          bottom: 0,
          right: 0,
          borderBottomRightRadius: dimensions.cornerRadius,
          borderLeftWidth: 0,
          borderTopWidth: 0,
        },
      }),
    [dimensions.cornerRadius]
  );

  const corners = useMemo(
    () => (
      <>
        <Animated.View
          style={[cornerStyles.base, cornerStyles.topLeft, animatedBorderStyle]}
        />
        <Animated.View
          style={[
            cornerStyles.base,
            cornerStyles.topRight,
            animatedBorderStyle,
          ]}
        />
        <Animated.View
          style={[
            cornerStyles.base,
            cornerStyles.bottomLeft,
            animatedBorderStyle,
          ]}
        />
        <Animated.View
          style={[
            cornerStyles.base,
            cornerStyles.bottomRight,
            animatedBorderStyle,
          ]}
        />
      </>
    ),
    [animatedBorderStyle, cornerStyles]
  );

  // Update center position when layout changes
  useEffect(() => {
    if (layout.width && layout.height) {
      frameX.value = centerPosition.x;
      frameY.value = centerPosition.y;
    }
  }, [centerPosition.x, centerPosition.y]);

  useEffect(() => {
    if (layout.width && layout.height && !layoutReady) {
      setLayoutReady(true);
      frameX.value = centerPosition.x;
      frameY.value = centerPosition.y;
      return;
    }

    if (!layoutReady) return;

    // Check if we have a valid highlight
    const hasValidHighlight = highlight && 
      scanFrame && 
      scanFrame.width > 0 && 
      scanFrame.height > 0 &&
      highlight.width > 0 && 
      highlight.height > 0;

    if (hasValidHighlight) {
      // Animate to active state
      setHasActiveHighlight(true);
      isActive.value = withTiming(1, CONFIG.timing);

      const scaled = calculateScaledValues(highlight, scanFrame, layout);
      frameX.value = withSpring(scaled.x, CONFIG.spring);
      frameY.value = withSpring(scaled.y, CONFIG.spring);
      frameWidth.value = withSpring(scaled.width, CONFIG.spring);
      frameHeight.value = withSpring(scaled.height, CONFIG.spring);

      const scalingFactor = calculateScalingFactor(scaled.width, scaled.height);
      cornerSize.value = withSpring(
        dimensions.initialCornerSize * scalingFactor,
        CONFIG.cornerSpring
      );
      cornerBorderWidth.value = withSpring(
        dimensions.initialCornerBorderWidth * scalingFactor,
        CONFIG.cornerSpring
      );
    } else if (hasActiveHighlight) {
      // Only animate back to center if we previously had an active highlight
      // This prevents unnecessary animations on initial load
      setHasActiveHighlight(false);
      
      // Animate to inactive state (back to center)
      isActive.value = withTiming(0, CONFIG.timing);

      frameX.value = withTiming(centerPosition.x, CONFIG.timing);
      frameY.value = withTiming(centerPosition.y, CONFIG.timing);
      frameWidth.value = withTiming(dimensions.frameSize, CONFIG.timing);
      frameHeight.value = withTiming(dimensions.frameSize, CONFIG.timing);

      cornerSize.value = withTiming(
        dimensions.initialCornerSize,
        CONFIG.timing
      );
      cornerBorderWidth.value = withTiming(
        dimensions.initialCornerBorderWidth,
        CONFIG.timing
      );
    }
  }, [
    highlight,
    layout,
    scanFrame,
    layoutReady,
    centerPosition,
    dimensions,
    hasActiveHighlight,
  ]);

  if (!layoutReady) {
    return null;
  }

  return <Animated.View style={animatedFrameStyle}>{corners}</Animated.View>;
};

export default ScannerFrame;