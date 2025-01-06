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

interface ZoomButtonProps {
  level: number;
  targetZoom: SharedValue<number>;
  onZoomChange: (level: number) => void;
  styles: ReturnType<typeof createStyles>;
}

const ZoomButton: React.FC<ZoomButtonProps> = React.memo(({ 
  level, 
  targetZoom, 
  onZoomChange, 
  styles 
}) => {
  const isActive = useSharedValue(false);

  const animatedStyles = {
    scale: useAnimatedStyle(() => ({
      transform: [{ scale: withSpring(isActive.value ? 1.1 : 1) }],
    })),
    
    circle: useAnimatedStyle(() => ({
      width: isActive.value ? styles.activeCircle.width : styles.inactiveCircle.width,
      height: isActive.value ? styles.activeCircle.height : styles.inactiveCircle.height,
      backgroundColor: isActive.value ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    })),
    
    text: useAnimatedStyle(() => ({
      color: isActive.value ? '#FFCC00' : 'white',
      fontSize: isActive.value ? styles.activeText.fontSize : styles.inactiveText.fontSize,
    })),
  };

  useAnimatedStyle(() => {
    isActive.value = Math.abs(targetZoom.value - level) < 0.5;
    return {};
  }, [targetZoom]);

  return (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={() => onZoomChange(level)}
    >
      <Animated.View style={[styles.circle, animatedStyles.circle, animatedStyles.scale]}>
        <Animated.Text style={[styles.text, animatedStyles.text]}>
          {level}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

export const ZoomControl: React.FC<ZoomControlProps> = ({ 
  zoom, 
  minZoom, 
  maxZoom 
}) => {
  const styles = useMemo(() => createStyles(), []);
  const targetZoom = useSharedValue(zoom.value);

  const zoomLevels = useMemo(
    () => [1, 2, 3, 5].filter(level => level >= minZoom && level <= maxZoom),
    [minZoom, maxZoom]
  );

  const handleZoomChange = useCallback((level: number) => {
    'worklet';
    const clampedLevel = Math.max(minZoom, Math.min(maxZoom, level));
    targetZoom.value = clampedLevel;
    zoom.value = withTiming(clampedLevel, {
      duration: 250,
    });
    runOnJS(triggerHapticFeedback)();
  }, [minZoom, maxZoom, zoom, targetZoom]);

  return (
    <View style={styles.container}>
      {zoomLevels.map((level) => (
        <ZoomButton
          key={level}
          level={level}
          targetZoom={targetZoom}
          onZoomChange={handleZoomChange}
          styles={styles}
        />
      ))}
    </View>
  );
};

const createStyles = () => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: getResponsiveWidth(6),
    height: getResponsiveWidth(10),
    gap: 5,
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
  activeCircle: {
    width: getResponsiveWidth(9),
    height: getResponsiveWidth(9),
  },
  inactiveCircle: {
    width: getResponsiveWidth(7),
    height: getResponsiveWidth(7),
  },
  text: {
    fontWeight: '600',
  },
  activeText: {
    fontSize: getResponsiveFontSize(12),
  },
  inactiveText: {
    fontSize: getResponsiveFontSize(10),
  },
});