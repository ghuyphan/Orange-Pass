import React, { useCallback, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth } from '@/utils/responsive';
import { triggerHapticFeedback } from '@/utils/haptic';

interface ZoomControlProps {
  zoom: SharedValue<number>;
  minZoom: number;
  maxZoom: number;
  onZoomChange?: (level: number) => void;
  scale?: number;
}

// Unified configuration for better performance and readability
const CONFIG = {
  spring: { damping: 15, stiffness: 200 },
  timing: { duration: 250 },
  colors: {
    background: Platform.select({
      ios: 'rgba(255, 255, 255, 0.15)',
      android: 'rgba(255, 255, 255, 0.2)',
    }),
    activeBackground: 'rgba(0, 0, 0, 0.3)',
    inactiveBackground: 'rgba(0, 0, 0, 0.2)',
    activeText: '#FFCC00',
    inactiveText: '#FFF',
    xContainer: '#FFCC00',
  },
};

// Memoized dimension calculations
const useDimensions = (scale = 1) => useMemo(() => ({
  container: {
    height: getResponsiveWidth(10 * scale),
    borderRadius: getResponsiveWidth(6 * scale),
  },
  button: {
    inactiveSize: getResponsiveWidth(7 * scale),
    activeSize: getResponsiveWidth(9 * scale),
  },
  text: {
    inactive: getResponsiveFontSize(10 * scale),
    active: getResponsiveFontSize(12 * scale),
  },
  x: {
    size: getResponsiveWidth(4 * scale),
    offset: getResponsiveWidth(2 * scale),
    borderRadius: getResponsiveWidth(2 * scale),
    textSize: getResponsiveFontSize(8 * scale),
  },
}), [scale]);

const ZoomButton = React.memo<{
  level: number;
  targetZoom: SharedValue<number>;
  onZoomChange: (level: number) => void;
  scale?: number;
}>(({ 
  level, 
  targetZoom, 
  onZoomChange,
  scale = 1,
}) => {
  const isActive = useSharedValue(false);
  const dimensions = useDimensions(scale);

  const animatedStyle = useAnimatedStyle(() => {
    const active = Math.abs(targetZoom.value - level) < 0.5;
    isActive.value = active;
    
    const size = interpolate(
      active ? 1 : 0,
      [0, 1],
      [dimensions.button.inactiveSize, dimensions.button.activeSize]
    );

    return {
      transform: [{ scale: withSpring(active ? 1.1 : 1, CONFIG.spring) }],
      width: size,
      height: size,
      backgroundColor: active 
        ? CONFIG.colors.activeBackground 
        : CONFIG.colors.inactiveBackground,
    };
  }, [level, targetZoom]);

  const textStyle = useAnimatedStyle(() => ({
    color: isActive.value ? CONFIG.colors.activeText : CONFIG.colors.inactiveText,
    fontSize: interpolate(
      isActive.value ? 1 : 0,
      [0, 1],
      [dimensions.text.inactive, dimensions.text.active]
    ),
    fontWeight: '600',
  }));

  const xStyle = useAnimatedStyle(() => ({
    opacity: withSpring(isActive.value ? 1 : 0, CONFIG.spring),
    transform: [{ scale: withSpring(isActive.value ? 1 : 0, CONFIG.spring) }],
  }));

  const handlePress = useCallback(() => {
    onZoomChange(level);
  }, [level, onZoomChange]);

  return (
    <Pressable
      onPress={handlePress}
      style={{ 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: dimensions.button.activeSize, 
        height: '100%' 
      }}
    >
      <Animated.View 
        style={[
          { 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRadius: dimensions.container.borderRadius 
          }, 
          animatedStyle
        ]}
      >
        <Animated.Text style={textStyle}>{level}</Animated.Text>
        <Animated.View 
          style={[
            {
              position: 'absolute',
              top: -dimensions.x.offset,
              right: -dimensions.x.offset,
              backgroundColor: CONFIG.colors.xContainer,
              width: dimensions.x.size,
              height: dimensions.x.size,
              borderRadius: dimensions.x.borderRadius,
              justifyContent: 'center',
              alignItems: 'center',
            }, 
            xStyle
          ]}
        >
          <Animated.Text 
            style={{ 
              color: '#000', 
              fontSize: dimensions.x.textSize, 
              fontWeight: '900' 
            }}
          >
            ×
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
});

ZoomButton.displayName = 'ZoomButton';

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
    () => [1, 2, 3, 5].filter(level => level >= minZoom && level <= maxZoom),
    [minZoom, maxZoom]
  );

  const handleZoomChange = useCallback(
    (level: number) => {
      'worklet';
      const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
      targetZoom.value = clampedLevel;
      zoom.value = withTiming(clampedLevel, CONFIG.timing);
      runOnJS(triggerHapticFeedback)();
      onZoomChange?.(clampedLevel);
    },
    [minZoom, maxZoom, zoom, targetZoom, onZoomChange]
  );

  return (
    <View 
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CONFIG.colors.background,
        borderRadius: dimensions.container.borderRadius,
        height: dimensions.container.height,
        gap: 3,
      }}
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