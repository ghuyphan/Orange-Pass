import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
  interpolate,
} from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth } from '@/utils/responsive';
import { triggerHapticFeedback } from '@/utils/haptic';

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  onZoomChange?: (level: number) => void;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
};

const TIMING_CONFIG = {
  duration: 250,
};

// Pre-calculate sizes to avoid calling these in worklets
const createDimensions = (scale: number = 1) => ({
  containerHeight: getResponsiveWidth(10 * scale),
  containerBorderRadius: getResponsiveWidth(6 * scale),
  containerPadding: getResponsiveWidth(1.5 * scale),
  buttonWidth: getResponsiveWidth(10 * scale),
  inactiveSize: getResponsiveWidth(7 * scale),
  activeSize: getResponsiveWidth(9 * scale),
  xContainerSize: getResponsiveWidth(4 * scale),
  xContainerOffset: getResponsiveWidth(2 * scale),
  xContainerBorderRadius: getResponsiveWidth(2 * scale),
  xTextSize: getResponsiveFontSize(8 * scale),
  inactiveFontSize: getResponsiveFontSize(10 * scale),
  activeFontSize: getResponsiveFontSize(12 * scale),
});

const createStyles = (scale: number = 1) => {
  const dimensions = createDimensions(scale);
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Platform.select({
        ios: 'rgba(255, 255, 255, 0.15)',
        android: 'rgba(255, 255, 255, 0.2)',
      }),
      borderRadius: dimensions.containerBorderRadius,
      height: dimensions.containerHeight,
      gap: 3,
      // paddingHorizontal: dimensions.containerPadding,
    },
    buttonContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: dimensions.buttonWidth,
      height: '100%',
    },
    circle: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: dimensions.containerBorderRadius,
    },
    xContainer: {
      position: 'absolute',
      top: -dimensions.xContainerOffset,
      right: -dimensions.xContainerOffset,
      backgroundColor: '#FFCC00',
      width: dimensions.xContainerSize,
      height: dimensions.xContainerSize,
      borderRadius: dimensions.xContainerBorderRadius,
      justifyContent: 'center',
      alignItems: 'center',
    },
    xText: {
      color: '#000',
      fontSize: dimensions.xTextSize,
      fontWeight: '900',
    },
  });
};

const ZoomButton = React.memo(({ 
  level, 
  targetZoom, 
  onZoomChange,
  scale = 1,
}: {
  level: number;
  targetZoom: SharedValue<number>;
  onZoomChange: (level: number) => void;
  scale?: number;
}) => {
  const isActive = useSharedValue(false);
  const styles = useMemo(() => createStyles(scale), [scale]);
  const dimensions = useMemo(() => createDimensions(scale), [scale]);
  
  const animatedStyle = useAnimatedStyle(() => {
    const active = Math.abs(targetZoom.value - level) < 0.5;
    isActive.value = active;
    
    const size = interpolate(
      active ? 1 : 0,
      [0, 1],
      [dimensions.inactiveSize, dimensions.activeSize]
    );

    return {
      transform: [{ scale: withSpring(active ? 1.1 : 1, SPRING_CONFIG) }],
      width: size,
      height: size,
      backgroundColor: active ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    };
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    color: isActive.value ? '#FFCC00' : '#FFF',
    fontSize: interpolate(
      isActive.value ? 1 : 0,
      [0, 1],
      [dimensions.inactiveFontSize, dimensions.activeFontSize]
    ),
    fontWeight: '600',
  }));

  const xStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isActive.value ? 1 : 0, SPRING_CONFIG),
    transform: [{ scale: withSpring(isActive.value ? 1 : 0, SPRING_CONFIG) }],
  }));

  const handlePress = useCallback(() => {
    onZoomChange(level);
  }, [level, onZoomChange]);

  return (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.circle, animatedStyle]}>
        <Animated.Text style={textStyle}>{level}</Animated.Text>
        <Animated.View style={[styles.xContainer, xStyle]}>
          <Animated.Text style={styles.xText}>×</Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
});

ZoomButton.displayName = 'ZoomButton';

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
}) => {
  const targetZoom = useSharedValue(zoom.value);
  const styles = useMemo(() => createStyles(), []);

  const zoomLevels = useMemo(
    () => [1, 2, 3, 5].filter(level => level >= minZoom && level <= maxZoom),
    [minZoom, maxZoom]
  );

  const handleZoomChange = useCallback(
    (level: number) => {
      'worklet';
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
      targetZoom.value = clampedLevel;
      zoom.value = withTiming(clampedLevel, TIMING_CONFIG);
      runOnJS(triggerHapticFeedback)();
      onZoomChange?.(clampedLevel);
    },
    [minZoom, maxZoom, zoom, targetZoom, onZoomChange]
  );

  return (
    <View style={styles.container}>
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