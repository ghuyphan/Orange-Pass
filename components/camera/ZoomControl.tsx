// src/components/camera/ZoomControl.tsx
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
} from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { getResponsiveFontSize, getResponsiveWidth } from "@/utils/responsive";
import { triggerHapticFeedback } from "@/utils/haptic";

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  onZoomChange?: (level: number) => void;
  scale?: number;
}

export interface ZoomControlHandle {
  deactivateSlider: () => void;
}

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
    sliderTrack: "rgba(255, 255, 255, 0.2)",
    sliderKnob: "#FFFFFF",
    tickMark: "rgba(255, 255, 255, 0.4)",
  },
  blur: {
    intensity: 10,
  },
};

const useDimensions = (scale = 1) =>
  useMemo(
    () => ({
      container: {
        height: getResponsiveWidth(10 * scale),
        borderRadius: getResponsiveWidth(7 * scale),
        borderWidth: 0.5,
        padding: getResponsiveWidth(0.8 * scale),
        sliderWidth: getResponsiveWidth(65 * scale),
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
      slider: {
        trackHeight: getResponsiveWidth(0.5 * scale),
        knobSize: getResponsiveWidth(4 * scale),
        labelFontSize: getResponsiveFontSize(12 * scale),
        tickHeight: getResponsiveWidth(2 * scale),
        tickWidth: getResponsiveWidth(0.5 * scale),
      },
    }),
    [scale]
  );

// Helper function to find the closest zoom level
const findClosestZoomLevel = (currentZoom: number, zoomLevels: number[]): number => {
  "worklet";
  if (zoomLevels.length === 0) return currentZoom;
  
  let closest = zoomLevels[0];
  let minDistance = Math.abs(currentZoom - closest);
  
  for (let i = 1; i < zoomLevels.length; i++) {
    const distance = Math.abs(currentZoom - zoomLevels[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closest = zoomLevels[i];
    }
  }
  
  return closest;
};

// Helper function to determine if a zoom level should be active
const isZoomLevelActive = (currentZoom: number, level: number, zoomLevels: number[]): boolean => {
  "worklet";
  const closestLevel = findClosestZoomLevel(currentZoom, zoomLevels);
  return closestLevel === level;
};

const ZoomButton = React.memo<{
  level: number;
  targetZoom: SharedValue<number>;
  zoomLevels: number[];
  onZoomChange: (level: number) => void;
  scale?: number;
}>(({ level, targetZoom, zoomLevels, onZoomChange, scale = 1 }) => {
  const isActive = useSharedValue(false);
  const dimensions = useDimensions(scale);

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    const active = isZoomLevelActive(targetZoom.value, level, zoomLevels);
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
  }, [dimensions, zoomLevels]);

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
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: dimensions.button.activeSize + 3,
        height: dimensions.container.height,
      }}
    >
      <Pressable
        onPress={handlePress}
        style={{
          alignItems: "center",
          justifyContent: "center",
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
            <Animated.Text style={textStyle}>{level}</Animated.Text>
            <Animated.Text style={[textStyle, crossStyle]}>×</Animated.Text>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
});
ZoomButton.displayName = "ZoomButton";

const ZoomSlider = React.memo<{
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  trackWidth: number;
  scale?: number;
}>(({ zoom, minZoom, maxZoom, trackWidth, scale = 1 }) => {
  const dimensions = useDimensions(scale);

  const tickMarks = useMemo(() => {
    const marks = [];
    const numTicks = 20;
    for (let i = 0; i <= numTicks; i++) {
      const position = (i / numTicks) * trackWidth;
      marks.push(position);
    }
    return marks;
  }, [trackWidth]);

  const knobAnimatedStyle = useAnimatedStyle(() => {
    const logMax = Math.log(maxZoom);
    const logMin = Math.log(minZoom);
    const logZoom = Math.log(Math.max(minZoom, zoom.value));

    const percentage = (logZoom - logMin) / (logMax - logMin);
    const translateX = Math.max(0, Math.min(trackWidth, percentage * trackWidth));
    return {
      transform: [{ translateX }],
    };
  });

  const AnimatedText = Animated.createAnimatedComponent(Text);
  const animatedLabelProps = useAnimatedProps(() => {
    return {
      text: `${zoom.value.toFixed(1)}x`,
    };
  });

  return (
    <View style={styles.sliderInnerContainer}>
      <View
        style={{
          width: trackWidth,
          height: dimensions.slider.trackHeight,
          borderRadius: dimensions.slider.trackHeight / 2,
          backgroundColor: CONFIG.colors.sliderTrack,
        }}
      />

      <View
        style={{
          position: "absolute",
          width: trackWidth,
          height: dimensions.slider.tickHeight,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {tickMarks.map((position, index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              left: position - dimensions.slider.tickWidth / 2,
              width: dimensions.slider.tickWidth,
              height: dimensions.slider.tickHeight,
              backgroundColor: CONFIG.colors.tickMark,
              borderRadius: dimensions.slider.tickWidth / 2,
            }}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.knobContainer,
          { left: dimensions.container.padding },
          knobAnimatedStyle,
        ]}
      >
        <View
          style={[
            styles.knob,
            {
              width: dimensions.slider.knobSize,
              height: dimensions.slider.knobSize,
              borderRadius: dimensions.slider.knobSize / 2,
              backgroundColor: CONFIG.colors.sliderKnob,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
              elevation: 3,
            },
          ]}
        />
        <AnimatedText
          animatedProps={animatedLabelProps}
          style={[
            styles.sliderLabel,
            {
              bottom: dimensions.slider.knobSize + 5,
              fontSize: dimensions.slider.labelFontSize,
              color: CONFIG.colors.activeText,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
});
ZoomSlider.displayName = "ZoomSlider";

export const ZoomControl = forwardRef<ZoomControlHandle, ZoomControlProps>(
  ({ zoom, minZoom, maxZoom, onZoomChange, scale = 1 }, ref) => {
    const targetZoom = useSharedValue(zoom.value);
    const dimensions = useDimensions(scale);
    const isSliderActive = useSharedValue(false);
    const inactivityTimer = useRef<number | null>(null);
    const isMounted = useRef(true);

    const zoomLevels = useMemo(
      () => [1, 2, 3, 5].filter((level) => level >= minZoom && level <= maxZoom),
      [minZoom, maxZoom]
    );

    const stopInactivityTimer = useCallback(() => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    }, []);

    const startInactivityTimer = useCallback(() => {
      stopInactivityTimer();
      inactivityTimer.current = setTimeout(() => {
        if (isMounted.current) {
          isSliderActive.value = false;
        }
      }, 1000);
    }, [isSliderActive, stopInactivityTimer]);

    // Log when component mounts/unmounts for debugging
    useEffect(() => {
      console.log("🎯 ZoomControl component mounted");
      isMounted.current = true;
      
      return () => {
        console.log("🎯 ZoomControl component unmounted");
        isMounted.current = false;
        stopInactivityTimer();
      };
    }, [stopInactivityTimer]);

    // Expose the imperative handle
    useImperativeHandle(
      ref,
      () => {
        console.log("🎯 ZoomControl imperative handle created");
        return {
          deactivateSlider: () => {
            "worklet";
            console.log("🎯 ZoomControl deactivateSlider called, isSliderActive:", isSliderActive.value);
            
            // Force deactivation regardless of current state
            if (isSliderActive.value) {
              isSliderActive.value = false;
              console.log("✅ ZoomControl slider deactivated");
              runOnJS(stopInactivityTimer)();
            } else {
              console.log("ℹ️ ZoomControl slider was already inactive");
            }
          },
        };
      },
      [isSliderActive, stopInactivityTimer]
    );

    const handleButtonZoomChange = useCallback(
      (level: number) => {
        runOnJS(stopInactivityTimer)();
        const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
        targetZoom.value = clampedLevel;
        zoom.value = withTiming(clampedLevel, CONFIG.timing);
        if (onZoomChange) {
          runOnJS(onZoomChange)(clampedLevel);
        }
        runOnJS(triggerHapticFeedback)();
      },
      [minZoom, maxZoom, zoom, targetZoom, onZoomChange, stopInactivityTimer]
    );

    const panGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .onStart(() => {
        runOnJS(stopInactivityTimer)();
      })
      .onUpdate((event) => {
        if (!isSliderActive.value) {
          isSliderActive.value = true;
          runOnJS(triggerHapticFeedback)();
        }

        const trackWidth =
          dimensions.container.sliderWidth -
          dimensions.container.padding * 2 -
          dimensions.slider.knobSize;
        const positionX =
          event.x -
          dimensions.container.padding -
          dimensions.slider.knobSize / 2;
        const percentage = Math.max(0, Math.min(1, positionX / trackWidth));

        // Use logarithmic scaling for zoom
        const logMin = Math.log(minZoom);
        const logMax = Math.log(maxZoom);
        const logZoom = logMin + percentage * (logMax - logMin);
        const newZoom = Math.exp(logZoom);
        
        // Clamp the zoom value to ensure it's within bounds
        const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
        
        zoom.value = clampedZoom;
        targetZoom.value = clampedZoom;

        if (onZoomChange) {
          runOnJS(onZoomChange)(clampedZoom);
        }
      })
      .onEnd(() => {
        if (isSliderActive.value) {
          runOnJS(startInactivityTimer)();
        }
      });

    const containerAnimatedStyle = useAnimatedStyle(() => {
      const baseWidth =
        (dimensions.button.activeSize + 6) * zoomLevels.length +
        dimensions.container.padding * 2;
      return {
        width: withSpring(
          isSliderActive.value ? dimensions.container.sliderWidth : baseWidth,
          CONFIG.spring
        ),
      };
    });

    const buttonsContainerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: withTiming(isSliderActive.value ? 0 : 1),
      transform: [{ scale: withTiming(isSliderActive.value ? 0.8 : 1) }],
    }));

    const sliderContainerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: withTiming(isSliderActive.value ? 1 : 0),
      transform: [{ scale: withTiming(isSliderActive.value ? 1 : 0.8) }],
      pointerEvents: isSliderActive.value ? "auto" : "none",
    }));

    return (
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.container,
              {
                backgroundColor: CONFIG.colors.background,
                borderRadius: dimensions.container.borderRadius,
                borderWidth: dimensions.container.borderWidth,
                borderColor: CONFIG.colors.borderColor,
                height: dimensions.container.height,
                paddingHorizontal: dimensions.container.padding,
                ...(Platform.OS === "ios" && {
                  backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
                }),
              },
              styles.shadow,
              containerAnimatedStyle,
            ]}
          >
            <Animated.View
              style={[styles.buttonsContainer, buttonsContainerAnimatedStyle]}
              pointerEvents={isSliderActive.value ? "none" : "auto"}
            >
              {zoomLevels.map((level) => (
                <ZoomButton
                  key={level}
                  level={level}
                  targetZoom={targetZoom}
                  zoomLevels={zoomLevels}
                  onZoomChange={handleButtonZoomChange}
                  scale={scale}
                />
              ))}
            </Animated.View>

            <Animated.View
              style={[StyleSheet.absoluteFill, sliderContainerAnimatedStyle]}
            >
              <ZoomSlider
                zoom={zoom}
                minZoom={minZoom}
                maxZoom={maxZoom}
                trackWidth={
                  dimensions.container.sliderWidth -
                  dimensions.container.padding * 2 -
                  dimensions.slider.knobSize
                }
                scale={scale}
              />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
    );
  }
);
ZoomControl.displayName = "ZoomControl";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
    height: "100%",
  },
  sliderInnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  knobContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  knob: {
    justifyContent: "center",
    alignItems: "center",
  },
  sliderLabel: {
    position: "absolute",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});