import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera } from 'react-native-vision-camera';
import { debounce } from 'lodash';
import { Gesture } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring
} from 'react-native-reanimated';

export const useFocusGesture = (
  cameraRef: React.RefObject<Camera>, 
  zoom: SharedValue<number>
) => {
  const [focusPoint, setFocusPoint] = useState<null | { x: number; y: number }>(null);
  const focusOpacity = useSharedValue(0);
  const FOCUS_DEBOUNCE_MS = 50;

  const debouncedFocus = useCallback(
    debounce((point: { x: number; y: number }) => {
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

      cameraRef.current.focus(adjustedPoint)
        .then(() => console.log('Focus successful'))
        .catch(error => console.error('Focus failed:', error));

      focusOpacity.value = withTiming(0, { duration: 300 });
    }, FOCUS_DEBOUNCE_MS),
    [zoom.value]
  );

  const gesture = useMemo(
    () => Gesture.Tap().onEnd(({ x, y }) => {
      runOnJS(debouncedFocus)({ x, y });
    }),
    [debouncedFocus]
  );

  const animatedFocusStyle = useAnimatedStyle(() => ({
    opacity: focusOpacity.value,
    transform: [{ scale: withSpring(focusOpacity.value ? 1 : 0.5) }],
  }));

  useEffect(() => () => {
    debouncedFocus.cancel();
  }, [debouncedFocus]);

  return { gesture, focusPoint, animatedFocusStyle };
};