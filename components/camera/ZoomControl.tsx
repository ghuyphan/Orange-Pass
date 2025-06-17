import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedReaction,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
  activateSlider: () => void;
}

const CONFIG = {
  spring: { damping: 18, stiffness: 180, mass: 0.8 },
  timing: { duration: 200 },
  timingStaggered: { duration: 220 },
  easingOut: { duration: 180, easing: Easing.out(Easing.cubic) },
  easingInOut: { duration: 200, easing: Easing.inOut(Easing.cubic) },
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
    tickMark: "rgba(255, 255, 255, 0.6)",
    activeTickMark: "#FFCC00",
  },
  blur: {
    intensity: 10,
  },
  inactivityTimeout: 3000, // 3 s
  tapFeedback: {
    scale: 1.02,
    duration: 100,
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
        sliderWidth: getResponsiveWidth(75 * scale),
        sliderHorizontalPadding: getResponsiveWidth(4 * scale),
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
        trackHeight: getResponsiveWidth(0.3 * scale),
        knobSize: getResponsiveWidth(4 * scale),
        labelFontSize: getResponsiveFontSize(12 * scale),
        tickSize: getResponsiveWidth(1.5 * scale),
        markerFontSize: getResponsiveFontSize(9 * scale),
        touchTargetHeight: Math.max(44, getResponsiveWidth(4 * scale) + 20),
      },
    }),
    [scale]
  );

/* ---------- helpers ---------------------------------------------------- */

const generateZoomLevels = (minZoom: number, maxZoom: number): number[] => {
  const levels: number[] = [];
  if (minZoom > 1) levels.push(minZoom);

  const std = [1, 2, 3, 5, 8, 10, 15, 20, 30];
  for (const l of std) if (l >= minZoom && l <= maxZoom) levels.push(l);
  if (!levels.includes(maxZoom)) levels.push(maxZoom);

  return [...new Set(levels)].sort((a, b) => a - b);
};

const findClosestZoomLevel = (
  currentZoom: number,
  zoomLevels: number[]
): number => {
  "worklet";
  let closest = zoomLevels[0];
  let minDist = Math.abs(currentZoom - closest);
  for (let i = 1; i < zoomLevels.length; i++) {
    const d = Math.abs(currentZoom - zoomLevels[i]);
    if (d < minDist) {
      minDist = d;
      closest = zoomLevels[i];
    }
  }
  return closest;
};

const isZoomLevelActive = (
  currentZoom: number,
  level: number,
  zoomLevels: number[]
): boolean => {
  "worklet";
  return findClosestZoomLevel(currentZoom, zoomLevels) === level;
};

/* ---------- ZoomButton -------------------------------------------------- */

const ZoomButton = React.memo<{
  level: number;
  targetZoom: SharedValue<number>;
  zoomLevels: number[];
  onZoomChange: (level: number) => void;
  onLongPress: () => void;
  scale?: number;
  isSliderActive: SharedValue<boolean>;
}>(
  ({
    level,
    targetZoom,
    zoomLevels,
    onZoomChange,
    onLongPress,
    scale = 1,
    isSliderActive,
  }) => {
    const isActive = useSharedValue(false);
    const d = useDimensions(scale);

    const buttonAnimatedStyle = useAnimatedStyle(() => {
      const active = isZoomLevelActive(targetZoom.value, level, zoomLevels);
      isActive.value = active;

      const size = interpolate(
        active ? 1 : 0,
        [0, 1],
        [d.button.inactiveSize, d.button.activeSize]
      );

      return {
        transform: [{ scale: withSpring(active ? 1.05 : 1, CONFIG.spring) }],
        width: size,
        height: size,
        borderRadius: d.button.borderRadius,
        borderWidth: d.button.borderWidth,
        borderColor: active
          ? CONFIG.colors.activeBorderColor
          : CONFIG.colors.borderColor,
      };
    });

    const backgroundStyle = useAnimatedStyle(() => ({
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isActive.value
        ? CONFIG.colors.activeBackground
        : CONFIG.colors.inactiveBackground,
      borderRadius: d.button.borderRadius,
      opacity: withSpring(isActive.value ? 0.85 : 0.4, CONFIG.spring),
    }));

    const textStyle = useAnimatedStyle(() => ({
      color: isActive.value
        ? CONFIG.colors.activeText
        : CONFIG.colors.inactiveText,
      fontSize: interpolate(
        isActive.value ? 1 : 0,
        [0, 1],
        [d.text.inactive, d.text.active]
      ),
      fontWeight: "700",
    }));

    const crossStyle = useAnimatedStyle(() => ({
      width: withTiming(isActive.value ? d.text.crossActiveWidth : 0),
      opacity: withTiming(isActive.value ? 1 : 0),
    }));

    const handlePress = useCallback(() => onZoomChange(level), [
      level,
      onZoomChange,
    ]);

    const tap = Gesture.Tap().onEnd((_e, success) => {
      "worklet";
      if (success && !isSliderActive.value) runOnJS(handlePress)();
    });

    const longPress = Gesture.LongPress()
      .minDuration(350)
      .onStart(() => {
        "worklet";
        if (!isSliderActive.value) runOnJS(onLongPress)();
      });

    const composed = Gesture.Exclusive(longPress, tap);

    return (
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: d.button.activeSize + 3,
          height: d.container.height,
        }}
      >
        <GestureDetector gesture={composed}>
          <Animated.View
            style={{ alignItems: "center", justifyContent: "center" }}
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
                <Animated.Text style={textStyle}>
                  {level === Math.floor(level) ? level : level.toFixed(1)}
                </Animated.Text>
                <Animated.Text style={[textStyle, crossStyle]}>
                  ×
                </Animated.Text>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);
ZoomButton.displayName = "ZoomButton";

/* ---------- ZoomLevelTick ---------------------------------------------- */

const ZoomLevelTick = React.memo<{
  level: number;
  position: number;
  zoom: SharedValue<number>;
  zoomLevels: number[];
  scale?: number;
  onTap: (l: number) => void;
}>(({ level, position, zoom, zoomLevels, scale = 1, onTap }) => {
  const d = useDimensions(scale);

  const tickStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      isZoomLevelActive(zoom.value, level, zoomLevels)
        ? CONFIG.colors.activeTickMark
        : CONFIG.colors.tickMark,
      CONFIG.easingOut
    ),
    opacity: withTiming(
      isZoomLevelActive(zoom.value, level, zoomLevels) ? 1 : 0.7,
      CONFIG.easingOut
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: withTiming(
      isZoomLevelActive(zoom.value, level, zoomLevels)
        ? CONFIG.colors.activeText
        : CONFIG.colors.inactiveText,
      CONFIG.easingOut
    ),
    fontWeight: withTiming(
      isZoomLevelActive(zoom.value, level, zoomLevels) ? "700" : "400",
      CONFIG.easingOut
    ),
    opacity: withTiming(
      isZoomLevelActive(zoom.value, level, zoomLevels) ? 1 : 0.8,
      CONFIG.easingOut
    ),
  }));

  const display =
    level === Math.floor(level) ? `${level}` : `${level.toFixed(1)}`;

  const tap = Gesture.Tap().onEnd(() => {
    "worklet";
    runOnJS(onTap)(level);
  });

  return (
    <GestureDetector gesture={tap}>
      <View
        style={{
          position: "absolute",
          left: position,
          transform: [{ translateX: -d.slider.tickSize / 2 }],
          alignItems: "center",
        }}
      >
        <Animated.View
          style={[
            {
              width: d.slider.tickSize,
              height: d.slider.tickSize,
              borderRadius: d.slider.tickSize / 2,
              position: "absolute",
              top: (d.slider.trackHeight - d.slider.tickSize) / 2,
            },
            tickStyle,
          ]}
        />
        <Animated.Text
          style={[
            {
              fontSize: d.slider.markerFontSize,
              marginTop: d.slider.trackHeight + 4,
              textAlign: "center",
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            },
            textStyle,
          ]}
        >
          {display}x
        </Animated.Text>
      </View>
    </GestureDetector>
  );
});
ZoomLevelTick.displayName = "ZoomLevelTick";

/* ---------- ZoomSlider -------------------------------------------------- */

const ZoomSlider = React.memo<{
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  containerWidth: number;
  zoomLevels: number[];
  scale?: number;
  onTapToZoom: (l: number) => void;
}>(
  ({
    zoom,
    minZoom,
    maxZoom,
    containerWidth,
    zoomLevels,
    scale = 1,
    onTapToZoom,
  }) => {
    const d = useDimensions(scale);
    const trackPressedScale = useSharedValue(1);

    const trackWidth =
      containerWidth - d.container.sliderHorizontalPadding * 2;

    const ticks = useMemo(
      () =>
        zoomLevels.map((l) => {
          const pct = (l - minZoom) / (maxZoom - minZoom);
          return { level: l, position: pct * trackWidth };
        }),
      [minZoom, maxZoom, trackWidth, zoomLevels]
    );

    const knobStyle = useAnimatedStyle(() => {
      const pct = (zoom.value - minZoom) / (maxZoom - minZoom);
      return {
        transform: [
          {
            translateX: pct * trackWidth - d.slider.knobSize / 2,
          },
        ],
      };
    });

    const trackStyle = useAnimatedStyle(() => ({
      transform: [{ scaleY: trackPressedScale.value }],
    }));

    // Tap gesture for the track
    const trackTap = Gesture.Tap()
      .onBegin(() => {
        "worklet";
        trackPressedScale.value = withTiming(CONFIG.tapFeedback.scale, {
          duration: CONFIG.tapFeedback.duration,
        });
      })
      .onFinalize(() => {
        "worklet";
        trackPressedScale.value = withTiming(1, {
          duration: CONFIG.tapFeedback.duration + 50,
        });
      })
      .onEnd((e) => {
        "worklet";
        const tapX = e.x - d.container.sliderHorizontalPadding;
        const pct = Math.max(0, Math.min(1, tapX / trackWidth));
        const newZoom = minZoom + pct * (maxZoom - minZoom);
        
        // Snap to nearest zoom level for better UX
        const closestLevel = findClosestZoomLevel(newZoom, zoomLevels);
        runOnJS(onTapToZoom)(closestLevel);
      });

    return (
      <View style={styles.sliderInnerContainer}>
        {/* Expanded tap area for better UX */}
        <GestureDetector gesture={trackTap}>
          <View
            style={{
              width: trackWidth,
              height: d.slider.touchTargetHeight,
              justifyContent: "center",
              marginHorizontal: d.container.sliderHorizontalPadding,
            }}
          >
            {/* Actual track */}
            <Animated.View
              style={[
                {
                  width: trackWidth,
                  height: d.slider.trackHeight,
                  borderRadius: d.slider.trackHeight / 2,
                  backgroundColor: CONFIG.colors.sliderTrack,
                },
                trackStyle,
              ]}
            />
          </View>
        </GestureDetector>

        {/* ticks */}
        <View
          style={{
            position: "absolute",
            width: trackWidth,
            height: d.slider.trackHeight,
            left: d.container.sliderHorizontalPadding,
          }}
        >
          {ticks.map(({ level, position }) => (
            <ZoomLevelTick
              key={level}
              level={level}
              position={position}
              zoom={zoom}
              zoomLevels={zoomLevels}
              scale={scale}
              onTap={onTapToZoom}
            />
          ))}
        </View>

        {/* knob */}
        <Animated.View
          style={[
            styles.knobContainer,
            { left: d.container.sliderHorizontalPadding },
            knobStyle,
          ]}
        >
          <View
            style={[
              styles.knob,
              {
                width: d.slider.knobSize,
                height: d.slider.knobSize,
                borderRadius: d.slider.knobSize / 2,
                backgroundColor: CONFIG.colors.sliderKnob,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 3,
              },
            ]}
          />
        </Animated.View>
      </View>
    );
  }
);
ZoomSlider.displayName = "ZoomSlider";

/* ---------- ZoomControl (public) --------------------------------------- */

export const ZoomControl = forwardRef<ZoomControlHandle, ZoomControlProps>(
  ({ zoom, minZoom, maxZoom, onZoomChange, scale = 1 }, ref) => {
    const targetZoom = useSharedValue(zoom.value);
    const d = useDimensions(scale);
    const isSliderActive = useSharedValue(false);
    const inactivityTimer = useRef<number | null>(null);
    const isMounted = useRef(true);
    const isGestureActive = useSharedValue(false);

    const zoomLevels = useMemo(
      () => generateZoomLevels(minZoom, maxZoom),
      [minZoom, maxZoom]
    );

    /* --- timer helpers ------------------------------------------------- */
    const stopTimer = useCallback(() => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = null;
      }
    }, []);

    const startTimer = useCallback(() => {
      stopTimer();
      inactivityTimer.current = setTimeout(() => {
        if (isMounted.current && !isGestureActive.value) {
          isSliderActive.value = false;
        }
      }, CONFIG.inactivityTimeout);
    }, [stopTimer, isGestureActive, isSliderActive]);

    useEffect(() => {
      isMounted.current = true;
      return () => {
        isMounted.current = false;
        stopTimer();
      };
    }, [stopTimer]);

    /* --- sync external zoom value ------------------------------------- */
    useAnimatedReaction(
      () => zoom.value,
      (currentZoom, previousZoom) => {
        if (currentZoom !== previousZoom) {
          targetZoom.value = currentZoom;
        }
      },
      [zoom]
    );

    useImperativeHandle(
      ref,
      () => ({
        deactivateSlider: () => {
          "worklet";
          if (isSliderActive.value) {
            isSliderActive.value = false;
            runOnJS(stopTimer)();
          }
        },
        activateSlider: () => {
          "worklet";
          if (!isSliderActive.value) {
            isSliderActive.value = true;
            runOnJS(startTimer)();
          }
        },
      }),
      [stopTimer, startTimer, isSliderActive]
    );

    /* --- button handlers ---------------------------------------------- */
    const handleButtonZoom = useCallback(
      (level: number) => {
        stopTimer();
        const clamped = Math.max(minZoom, Math.min(maxZoom, level));
        zoom.value = withTiming(clamped, CONFIG.timing);
        onZoomChange?.(clamped);
        triggerHapticFeedback();
      },
      [minZoom, maxZoom, zoom, onZoomChange, stopTimer]
    );

    const handleLongPress = useCallback(() => {
      stopTimer();
      if (!isSliderActive.value) {
        isSliderActive.value = true;
        triggerHapticFeedback();
        startTimer();
      }
    }, [isSliderActive, stopTimer, startTimer]);

    /* --- tap on tick / track ------------------------------------------ */
    const handleTapTick = useCallback(
      (lvl: number) => {
        const z = Math.max(minZoom, Math.min(maxZoom, lvl));
        targetZoom.value = z;
        zoom.value = withTiming(z, CONFIG.timing);
        onZoomChange?.(z);
        triggerHapticFeedback();
        startTimer();
      },
      [minZoom, maxZoom, targetZoom, zoom, onZoomChange, startTimer]
    );

    /* --- pan gesture --------------------------------------------------- */
    const pan = Gesture.Pan()
      .activeOffsetX([-5, 5])
      .onStart(() => {
        "worklet";
        isGestureActive.value = true;
        runOnJS(stopTimer)();
        if (!isSliderActive.value) {
          isSliderActive.value = true;
          runOnJS(triggerHapticFeedback)();
        }
      })
      .onUpdate((e) => {
        "worklet";
        const trackW =
          d.container.sliderWidth - d.container.sliderHorizontalPadding * 2;
        const posX = e.x - d.container.sliderHorizontalPadding;
        const pct = Math.max(0, Math.min(1, posX / trackW));
        const newZ = minZoom + pct * (maxZoom - minZoom);
        zoom.value = newZ;
        targetZoom.value = newZ;
        if (onZoomChange) runOnJS(onZoomChange)(newZ);
      })
      .onEnd(() => {
        "worklet";
        isGestureActive.value = false;
        if (isSliderActive.value) runOnJS(startTimer)();
      });

    /* --- animated container widths ------------------------------------ */
    const containerStyle = useAnimatedStyle(() => {
      const btnWidth =
        (d.button.activeSize + 6) * zoomLevels.length +
        d.container.padding * 2;
      return {
        width: withSpring(
          isSliderActive.value ? d.container.sliderWidth : btnWidth,
          CONFIG.spring
        ),
      };
    });

    // Enhanced staggered animations
    const buttonsStyle = useAnimatedStyle(() => ({
      opacity: withTiming(
        isSliderActive.value ? 0 : 1,
        isSliderActive.value ? CONFIG.easingOut : CONFIG.timingStaggered
      ),
      transform: [
        {
          scale: withTiming(
            isSliderActive.value ? 0.9 : 1,
            CONFIG.easingInOut
          ),
        },
      ],
    }));

    const sliderStyle = useAnimatedStyle(() => ({
      opacity: withTiming(
        isSliderActive.value ? 1 : 0,
        {
          duration: isSliderActive.value ? CONFIG.timingStaggered.duration : CONFIG.easingOut.duration,
          delay: isSliderActive.value ? 50 : 0,
          easing: CONFIG.easingInOut.easing,
        }
      ),
      transform: [
        {
          scale: withTiming(
            isSliderActive.value ? 1 : 0.95,
            CONFIG.easingInOut
          ),
        },
      ],
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: CONFIG.colors.background,
              borderRadius: d.container.borderRadius,
              borderWidth: d.container.borderWidth,
              borderColor: CONFIG.colors.borderColor,
              height: d.container.height,
              paddingHorizontal: d.container.padding,
              ...(Platform.OS === "ios" && {
                backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
              }),
            },
            styles.shadow,
            containerStyle,
          ]}
        >
          <Animated.View
            style={[styles.buttonsContainer, buttonsStyle]}
            pointerEvents={isSliderActive.value ? "none" : "auto"}
          >
            {zoomLevels.map((l) => (
              <ZoomButton
                key={l}
                level={l}
                targetZoom={targetZoom}
                zoomLevels={zoomLevels}
                onZoomChange={handleButtonZoom}
                onLongPress={handleLongPress}
                scale={scale}
                isSliderActive={isSliderActive}
              />
            ))}
          </Animated.View>

          <Animated.View
            style={[StyleSheet.absoluteFill, sliderStyle]}
            pointerEvents={isSliderActive.value ? "auto" : "none"}
          >
            <ZoomSlider
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={maxZoom}
              containerWidth={d.container.sliderWidth}
              zoomLevels={zoomLevels}
              scale={scale}
              onTapToZoom={handleTapTick}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    );
  }
);
ZoomControl.displayName = "ZoomControl";

/* ---------- static styles ---------------------------------------------- */

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
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});