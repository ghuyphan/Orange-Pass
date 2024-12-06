import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  runOnJS,
  runOnUI,
  SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';
import { triggerHapticFeedback } from '@/utils/haptic';

const MemoizedThemedText = React.memo(ThemedText);

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({ zoom, minZoom , maxZoom }) => {
  const buttonWidth = 37; // Width of each zoom button

  // Compute zoom levels dynamically using minZoom and maxZoom
  const zoomLevels = React.useMemo(() => {
    const levels = [1, 2, 3, 5];
    // Filter levels to ensure they fall within the provided minZoom and maxZoom range
    return levels.filter((level) => level >= minZoom && level <= maxZoom);
  }, [minZoom, maxZoom]);

  // Default index is the index of 1x if available, otherwise the first zoom level
  const indexOf1x = zoomLevels.indexOf(1);
  const defaultIndex = indexOf1x !== -1 ? indexOf1x : 0;

  const activeButtonIndex = useSharedValue(defaultIndex); // Use SharedValue for button index
  const activeButtonPosition = useSharedValue(activeButtonIndex.value * buttonWidth); // Shared value for zoom circle position
  const activeButtonPositionInitial = useSharedValue(0); // Initial position for pan gesture

  const scale = useSharedValue(1); // Scale for zoom circle

  // Animated style for the zoom circle
  const animatedZoomCircleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeButtonPosition.value }, { scale: scale.value }],
  }));

  // Synchronize activeButtonIndex with React state for rendering
  const [activeIndex, setActiveIndex] = useState(activeButtonIndex.value);

  useDerivedValue(() => {
    runOnJS(setActiveIndex)(activeButtonIndex.value);
  });

  // Handle zoom change when the user taps or swipes
  const onZoomChange = useCallback(
    (level: number, index: number) => {
      'worklet';
      if (index === activeButtonIndex.value || zoom.value === level) {
        return;
      }
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level)); // Clamp zoom between min/max
      activeButtonIndex.value = index; // Update button index
      activeButtonPosition.value = withSpring(index * buttonWidth, {
        damping: 30,
        stiffness: 200,
      });
      zoom.value = withSpring(clampedLevel, { damping: 20, stiffness: 150 }); // Smooth transition for zoom
      runOnJS(triggerHapticFeedback)();
    },
    [minZoom, maxZoom, zoom, activeButtonPosition, buttonWidth, activeButtonIndex]
  );

  // Handle swipe gestures to change zoom levels
  const swipeGesture = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      activeButtonPositionInitial.value = activeButtonPosition.value;
    })
    .onUpdate((e) => {
      'worklet';
      const totalWidth = buttonWidth * (zoomLevels.length - 1);
      const newPosition = activeButtonPositionInitial.value + e.translationX;
      // Clamp the position to stay within the container
      activeButtonPosition.value = Math.max(0, Math.min(newPosition, totalWidth));

      const newIndex = Math.min(
        Math.max(0, Math.round(activeButtonPosition.value / buttonWidth)),
        zoomLevels.length - 1
      );
          
      if (newIndex !== activeButtonIndex.value) {
        activeButtonIndex.value = newIndex;
        const clampedLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevels[newIndex]));
        zoom.value = withSpring(clampedLevel, { damping: 20, stiffness: 150 });
        runOnJS(triggerHapticFeedback)();
      }
    })
    .onEnd(() => {
      'worklet';
      // Snap to the exact position
      activeButtonPosition.value = withSpring(activeButtonIndex.value * buttonWidth, {
        damping: 30,
        stiffness: 200,
      });
      scale.value = withSpring(1, { damping: 20, stiffness: 150 });
    });    

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.zoomControlContainer}>
        {/* Animated zoom circle */}
        <Animated.View style={[styles.activeZoomButton, animatedZoomCircleStyle]} />
        {zoomLevels.map((level, index) => (
          <TouchableWithoutFeedback
            key={index}
            onPress={() => runOnUI(onZoomChange)(level, index)}
          >
            <View style={styles.zoomButton}>
              <MemoizedThemedText
                type="defaultSemiBold"
                style={activeIndex === index ? styles.activeZoomText : styles.zoomText}
              >
                {`${level}${activeIndex === index ? 'x' : ''}`}
              </MemoizedThemedText>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  zoomControlContainer: {
    position: 'absolute',
    bottom: 180,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 37,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: 'white',
    fontSize: 12,
  },
  activeZoomText: {
    color: '#FFCC00',
    fontSize: 12,
  },
  activeZoomButton: {
    position: 'absolute',
    width: 37,
    aspectRatio: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 25,
  },
});
