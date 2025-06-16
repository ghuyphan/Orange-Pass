// src/hooks/useFocusGesture.ts
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

// Define a constant for the indicator size to be used in calculations
const INDICATOR_SIZE = 60;

export const useFocusGesture = (
  cameraRef: RefObject<Camera>,
  zoom: SharedValue<number>,
  zoomControlRef: RefObject<ZoomControlHandle | null>
) => {
  // Use shared values for both position and opacity to keep them on the UI thread
  const focusPoint = useSharedValue({ x: 0, y: 0 });
  const focusOpacity = useSharedValue(0);
  const FOCUS_THROTTLE_MS = 500;

  // Track ref availability for debugging
  useEffect(() => {
    const checkRefAvailability = () => {
      console.log("🔗 ZoomControl ref status:", {
        refExists: !!zoomControlRef.current,
        deactivateSliderExists: !!zoomControlRef.current?.deactivateSlider,
      });
    };

    // Check ref availability with a slight delay to allow for mounting
    const timeoutId = setTimeout(checkRefAvailability, 100);
    
    return () => clearTimeout(timeoutId);
  }, [zoomControlRef]);

  // Throttle the focus request to avoid spamming the camera hardware
  const throttledFocus = useCallback(
    throttle(
      (point: { x: number; y: number }) => {
        if (!cameraRef.current) {
          console.warn("Camera not ready yet.");
          return;
        }

        focusPoint.value = point;
        focusOpacity.value = 1; // Show the indicator

        cameraRef.current
          .focus(point)
          .then(() => {
            console.log("✅ Focus successful at:", point);
          })
          .catch((error) => {
            if (error.code !== "capture/focus-canceled") {
              console.error("❌ Focus failed:", error);
            }
          });

        // Fade out the indicator after a delay
        focusOpacity.value = withTiming(0, { duration: 500 });
      },
      FOCUS_THROTTLE_MS,
      { leading: true, trailing: false }
    ),
    [cameraRef, focusPoint, focusOpacity]
  );

  // Safe deactivation function that handles ref availability
  const attemptSliderDeactivation = useCallback(() => {
    console.log("🔍 Attempting to deactivate zoom slider");
    console.log("📱 ZoomControl ref available:", !!zoomControlRef.current);
    console.log("🎯 DeactivateSlider method available:", !!zoomControlRef.current?.deactivateSlider);

    try {
      if (zoomControlRef.current?.deactivateSlider) {
        zoomControlRef.current.deactivateSlider();
        console.log("✅ Zoom slider deactivation called successfully");
      } else {
        console.log("⚠️ Zoom control deactivation not available");
        // Fallback: Try again after a short delay in case of mounting timing issues
        setTimeout(() => {
          if (zoomControlRef.current?.deactivateSlider) {
            console.log("🔄 Retry: Calling zoom slider deactivation");
            zoomControlRef.current.deactivateSlider();
          } else {
            console.log("❌ Retry failed: ZoomControl still not available");
          }
        }, 50);
      }
    } catch (error) {
      console.error("❌ Error during zoom slider deactivation:", error);
    }
  }, [zoomControlRef]);

  // The gesture handler that triggers the focus action
  const gesture = Gesture.Tap()
    .maxDuration(250) // Limit tap duration to distinguish from pan
    .shouldCancelWhenOutside(true)
    .onEnd(({ x, y }) => {
      "worklet";
      
      // Try to deactivate the zoom slider
      runOnJS(attemptSliderDeactivation)();

      // Trigger the focus action
      runOnJS(throttledFocus)({ x, y });
    });

  // The animated style now controls position, opacity, and scale together
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
  }, [focusPoint, focusOpacity]);

  // Clean up the throttled function on unmount to prevent memory leaks
  useEffect(
    () => () => {
      throttledFocus.cancel();
    },
    [throttledFocus]
  );

  // Return the gesture handler and the self-contained animated style
  return { gesture, animatedFocusStyle };
};