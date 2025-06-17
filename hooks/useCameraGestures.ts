// src/hooks/useCameraGestures.ts
import { useCallback, useEffect, RefObject } from "react";
import { Camera } from "react-native-vision-camera";
import { throttle } from "lodash";
import { Gesture } from "react-native-gesture-handler";
import {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { ZoomControlHandle } from "@/components/camera/ZoomControl";

const INDICATOR_SIZE = 60;

export const useCameraGestures = (
  cameraRef: RefObject<Camera>,
  zoom: SharedValue<number>,
  minZoom: number,
  maxZoom: number,
  zoomControlRef: RefObject<ZoomControlHandle | null>
) => {
  // --- State for Both Gestures ---
  const focusPoint = useSharedValue({ x: 0, y: 0 });
  const focusOpacity = useSharedValue(0);
  const startZoom = useSharedValue(1); // To store zoom level at pinch start

  // --- Tap-to-Focus Logic (from your useFocusGesture) ---
  const FOCUS_THROTTLE_MS = 500;

  const throttledFocus = useCallback(
    throttle(
      (point: { x: number; y: number }) => {
        if (!cameraRef.current) return;
        focusPoint.value = point;
        focusOpacity.value = 1;
        cameraRef.current.focus(point).catch((e) => {
          if (e.code !== "capture/focus-canceled") console.error("Focus failed", e);
        });
        focusOpacity.value = withTiming(0, { duration: 500 });
      },
      FOCUS_THROTTLE_MS,
      { leading: true, trailing: false }
    ),
    [cameraRef, focusPoint, focusOpacity]
  );

  const attemptSliderDeactivation = useCallback(() => {
    try {
      zoomControlRef.current?.deactivateSlider();
    } catch (error) {
      console.error("Error deactivating zoom slider:", error);
    }
  }, [zoomControlRef]);

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(({ x, y }) => {
      "worklet";
      runOnJS(attemptSliderDeactivation)();
      runOnJS(throttledFocus)({ x, y });
    });

  // --- NEW: Pinch-to-Zoom Logic ---
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      "worklet";
      // Store the current zoom value when the pinch begins
      startZoom.value = zoom.value;
    })
    .onUpdate((event) => {
      "worklet";
      // Calculate the new zoom level based on the starting zoom and pinch scale
      const newZoom = startZoom.value * event.scale;
      // Clamp the new zoom value to the camera's supported range
      zoom.value = Math.max(minZoom, Math.min(newZoom, maxZoom));
    });

  // --- Combine Gestures ---
  // Gesture.Race ensures that only one gesture (tap or pinch) can be active at a time.
  // As soon as one wins, the other is cancelled. This is perfect for this use case.
  const gesture = Gesture.Race(pinchGesture, tapGesture);

  // --- Animated Styles ---
  const animatedFocusStyle = useAnimatedStyle(() => {
    const positionOffset = INDICATOR_SIZE / 2;
    return {
      opacity: focusOpacity.value,
      transform: [
        { translateX: focusPoint.value.x - positionOffset },
        { translateY: focusPoint.value.y - positionOffset },
        { scale: withSpring(focusOpacity.value > 0 ? 1 : 0.5) },
      ],
    };
  });

  // --- Cleanup ---
  useEffect(
    () => () => {
      throttledFocus.cancel();
    },
    [throttledFocus]
  );

  return { gesture, animatedFocusStyle };
};