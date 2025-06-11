import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { getResponsiveFontSize, getResponsiveWidth } from "@/utils/responsive";
import { triggerHapticFeedback } from "@/utils/haptic";

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  onZoomChange?: (level: number) => void;
  scale?: number;
}

// Enhanced configuration with glassmorphism support
const CONFIG = {
  spring: { damping: 15, stiffness: 200 },
  timing: { duration: 250 },
  colors: {
    background: Platform.select({
      ios: "rgba(255, 255, 255, 0.08)",
      android: "rgba(255, 255, 255, 0.15)",
    }),
    activeBackground: "rgba(255, 204, 0, 0.15)",
    inactiveBackground: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    activeBorderColor: "rgba(255, 204, 0, 0.3)",
    activeText: "#FFCC00",
    inactiveText: "#FFFFFF",
  },
  blur: {
    intensity: 10,
  },
};

// Memoized dimension calculations
const useDimensions = (scale = 1) =>
  useMemo(
    () => ({
      container: {
        height: getResponsiveWidth(10 * scale),
        borderRadius: getResponsiveWidth(7 * scale),
        borderWidth: 0.5,
        // padding: getResponsiveWidth(0.8 * scale),
      },
      button: {
        inactiveSize: getResponsiveWidth(7 * scale),
        activeSize: getResponsiveWidth(8.5 * scale),
        borderRadius: getResponsiveWidth(5 * scale),
        borderWidth: 0.5,
      },
      text: {
        inactive: getResponsiveFontSize(10 * scale),
        active: getResponsiveFontSize(11 * scale),
        crossActiveWidth: getResponsiveFontSize(8 * scale),
      },
    }),
    [scale]
  );

const ZoomButton = React.memo<{
  level: number;
  targetZoom: SharedValue<number>;
  onZoomChange: (level: number) => void;
  scale?: number;
}>(({ level, targetZoom, onZoomChange, scale = 1 }) => {
  const isActive = useSharedValue(false);
  const dimensions = useDimensions(scale);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const active = Math.abs(targetZoom.value - level) < 0.5;
    isActive.value = active;

    const size = interpolate(
      active ? 1 : 0,
      [0, 1],
      [dimensions.button.inactiveSize, dimensions.button.activeSize]
    );

    return {
      transform: [{ scale: withSpring(active ? 1.05 : 1, CONFIG.spring) }],
      width: size,
      height: size,
      borderRadius: dimensions.button.borderRadius,
      borderWidth: dimensions.button.borderWidth,
      borderColor: active
        ? CONFIG.colors.activeBorderColor
        : CONFIG.colors.borderColor,
    };
  }, [dimensions]);

  const backgroundStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isActive.value
      ? CONFIG.colors.activeBackground
      : CONFIG.colors.inactiveBackground,
    borderRadius: dimensions.button.borderRadius,
    opacity: withSpring(isActive.value ? 0.85 : 0.4, CONFIG.spring),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: isActive.value
      ? CONFIG.colors.activeText
      : CONFIG.colors.inactiveText,
    fontSize: interpolate(
      isActive.value ? 1 : 0,
      [0, 1],
      [dimensions.text.inactive, dimensions.text.active]
    ),
    fontWeight: "700",
  }));

  const crossStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive.value ? dimensions.text.crossActiveWidth : 0),
      opacity: withTiming(isActive.value ? 1 : 0),
    };
  }, [dimensions]);

  const handlePress = useCallback(() => {
    onZoomChange(level);
  }, [level, onZoomChange]);

  return (
    <Pressable
      onPress={handlePress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: dimensions.button.activeSize + 3,
        height: "100%",
      }}
    >
      <Animated.View style={buttonAnimatedStyle}>
        <Animated.View style={backgroundStyle} />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {/* Removed textShadowStyle from here */}
          <Animated.Text style={textStyle}>{level}</Animated.Text>
          {/* Removed textShadowStyle from here */}
          <Animated.Text style={[textStyle, crossStyle]}>×</Animated.Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});

ZoomButton.displayName = "ZoomButton";

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  scale = 1,
}) => {
  const targetZoom = useSharedValue(zoom.value);
  const dimensions = useDimensions(scale);

  const zoomLevels = useMemo(
    () => [1, 2, 3, 5].filter((level) => level >= minZoom && level <= maxZoom),
    [minZoom, maxZoom]
  );

  const handleZoomChange = useCallback(
    (level: number) => {
      "worklet";
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
      targetZoom.value = clampedLevel;
      zoom.value = withTiming(clampedLevel, CONFIG.timing);
      runOnJS(triggerHapticFeedback)();
      onZoomChange?.(clampedLevel);
    },
    [minZoom, maxZoom, zoom, targetZoom, onZoomChange]
  );

  // This shadow is for the container, not the text, so it remains.
  const containerShadowStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: CONFIG.colors.background,
          borderRadius: dimensions.container.borderRadius,
          borderWidth: dimensions.container.borderWidth,
          borderColor: CONFIG.colors.borderColor,
          height: dimensions.container.height,
          paddingHorizontal: dimensions.container.padding,
          gap: 3,
          ...(Platform.OS === "ios" && {
            backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
          }),
        },
        containerShadowStyle,
      ]}
    >
      {zoomLevels.map((level) => (
        <ZoomButton
          key={level}
          level={level}
          targetZoom={targetZoom}
          onZoomChange={handleZoomChange}
          scale={scale}
        />
      ))}
    </View>
  );
};