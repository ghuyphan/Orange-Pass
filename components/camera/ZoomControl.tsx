import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth } from '@/utils/responsive';
import { triggerHapticFeedback } from '@/utils/haptic';

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
}

const BASE_STYLES = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: getResponsiveWidth(6),
    height: getResponsiveWidth(10),
    gap: 3,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: getResponsiveWidth(10),
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: getResponsiveWidth(6),
  },
  xContainer: {
    position: 'absolute',
    top: -getResponsiveWidth(2),
    right: -getResponsiveWidth(2),
    backgroundColor: '#FFCC00',
    width: getResponsiveWidth(4),
    height: getResponsiveWidth(4),
    borderRadius: getResponsiveWidth(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  xText: {
    color: 'black',
    fontSize: getResponsiveFontSize(8),
    fontWeight: '900',
  },
});

const DIMENSIONS = {
  active: {
    width: getResponsiveWidth(9),
    height: getResponsiveWidth(9),
    fontSize: getResponsiveFontSize(12),
  },
  inactive: {
    width: getResponsiveWidth(7),
    height: getResponsiveWidth(7),
    fontSize: getResponsiveFontSize(10),
  },
};

const ZoomButton: React.FC<{
  level: number;
  targetZoom: SharedValue<number>;
  onZoomChange: (level: number) => void;
}> = React.memo(({ level, targetZoom, onZoomChange }) => {
  const isActive = useSharedValue(false);

  const animatedStyle = useAnimatedStyle(() => {
    isActive.value = Math.abs(targetZoom.value - level) < 0.5;
    return {
      transform: [{ scale: withSpring(isActive.value ? 1.1 : 1) }],
      width: isActive.value ? DIMENSIONS.active.width : DIMENSIONS.inactive.width,
      height: isActive.value ? DIMENSIONS.active.height : DIMENSIONS.inactive.height,
      backgroundColor: isActive.value ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    };
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    color: isActive.value ? '#FFCC00' : 'white',
    fontSize: isActive.value ? DIMENSIONS.active.fontSize : DIMENSIONS.inactive.fontSize,
    fontWeight: '600',
  }));

  const xStyle = useAnimatedStyle(() => ({
    opacity: isActive.value ? 1 : 0,
    transform: [
      { scale: withSpring(isActive.value ? 1 : 0) },
    ],
  }));

  return (
    <TouchableOpacity
      style={BASE_STYLES.buttonContainer}
      onPress={() => onZoomChange(level)}
    >
      <Animated.View style={[BASE_STYLES.circle, animatedStyle]}>
        <Animated.Text style={textStyle}>{level}</Animated.Text>
        <Animated.View style={[BASE_STYLES.xContainer, xStyle]}>
          <Animated.Text style={BASE_STYLES.xText}>×</Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  minZoom,
  maxZoom,
}) => {
  const targetZoom = useSharedValue(zoom.value);

  const zoomLevels = useMemo(
    () => [1, 2, 3, 5].filter(level => level >= minZoom && level <= maxZoom),
    [minZoom, maxZoom]
  );

  const handleZoomChange = useCallback(
    (level: number) => {
      'worklet';
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
      targetZoom.value = clampedLevel;
      zoom.value = withTiming(clampedLevel, {
        duration: 250,
      });
      runOnJS(triggerHapticFeedback)();
    },
    [minZoom, maxZoom, zoom, targetZoom]
  );

  return (
    <View style={BASE_STYLES.container}>
      {zoomLevels.map((level) => (
        <ZoomButton
          key={level}
          level={level}
          targetZoom={targetZoom}
          onZoomChange={handleZoomChange}
        />
      ))}
    </View>
  );
};