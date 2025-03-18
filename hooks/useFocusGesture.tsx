import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera } from 'react-native-vision-camera';
import { throttle } from 'lodash';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

export const useFocusGesture = (
  cameraRef: React.RefObject<Camera>,
  zoom: SharedValue<number>
) => {
  const [focusPoint, setFocusPoint] = useState<null | { x: number; y: number }>(null);
  const focusOpacity = useSharedValue(0);
  const FOCUS_THROTTLE_MS = 500; // Increased throttle interval to 1000ms

  // Throttle the focus request
  const throttledFocus = useCallback(
    throttle(
      (point: { x: number; y: number }) => {
        if (!cameraRef.current) {
          console.warn('Camera not ready yet.');
          return;
        }

        runOnJS(setFocusPoint)(point);
        focusOpacity.value = 1;

        const adjustedPoint = {
          x: point.x / zoom.value,
          y: point.y / zoom.value,
        };

        cameraRef.current
          .focus(adjustedPoint)
          .then(() => console.log('Focus successful'))
          .catch((error) => {
            if (error.code !== 'capture/focus-canceled') {
              console.error('Focus failed:', error);
            }
          });

        focusOpacity.value = withTiming(0, { duration: 300 });
      },
      FOCUS_THROTTLE_MS,
      { leading: true, trailing: false } // Throttle options
    ),
    [zoom.value]
  );

  // Gesture handler
  const gesture = useMemo(
    () =>
      Gesture.Tap().onEnd(({ x, y }) => {
        runOnJS(throttledFocus)({ x, y });
      }),
    [throttledFocus]
  );

  // Animated style for focus indicator
  const animatedFocusStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [{ scale: withSpring(focusOpacity.value ? 1 : 0.5) }],
  }));

  // Cleanup throttled function on unmount
  useEffect(() => () => {
    throttledFocus.cancel();
  }, [throttledFocus]);

  return { gesture, focusPoint, animatedFocusStyle };
};
