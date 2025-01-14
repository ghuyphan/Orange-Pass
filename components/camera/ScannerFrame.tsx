import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

interface CameraHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  width: number;
  height: number;
}

interface ScannerFrameProps {
  highlight: CameraHighlight | null;
  layout: Layout;
  scanFrame: Layout;
}

const FRAME_SIZE = 220;
const CORNER_SIZE = 15;
const CORNER_BORDER_WIDTH = 3;
const CORNER_RADIUS = 6;

const springConfig = { stiffness: 200, damping: 16 };

export const ScannerFrame: React.FC<ScannerFrameProps> = ({ highlight, layout, scanFrame }) => {
  // Ref to track if the layout has been initialized
  const layoutInitialized = useRef(false);

  // Calculate center position (only once layout is available)
  const centerPosition = useMemo(() => {
    if (layout.width && layout.height) {
      layoutInitialized.current = true; // Mark layout as initialized
      return {
        x: (layout.width - FRAME_SIZE) / 2,
        y: (layout.height - FRAME_SIZE) / 2,
      };
    }
    return { x: 0, y: 0 }; // Default until layout is available
  }, [layout]);

  // Initialize framePosition with centerPosition if layout is available
  const framePosition = useSharedValue(centerPosition);
  const frameDimensions = useSharedValue({ width: FRAME_SIZE, height: FRAME_SIZE });
  const frameStyle = useSharedValue({
    color: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0)',
  });

  // Memoized scaling calculations
  const getScaledValues = useCallback(
    (highlight: CameraHighlight, scanFrame: Layout, layout: Layout) => {
      const xScale = layout.width / scanFrame.height - 0.025;
      const yScale = layout.height / scanFrame.width - 0.01;
      const widthScale = layout.height / scanFrame.width + 0.1;
      const heightScale = layout.width / scanFrame.height + 0.15;

      return {
        x: highlight.x * xScale,
        y: highlight.y * yScale,
        width: highlight.width * widthScale,
        height: highlight.height * heightScale,
      };
    },
    []
  );

  // Animated styles
  const animatedFrameStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    borderRadius: CORNER_RADIUS,
    pointerEvents: 'box-none',
    backgroundColor: frameStyle.value.backgroundColor,
    borderColor: frameStyle.value.color,
    left: framePosition.value.x,
    top: framePosition.value.y,
    width: frameDimensions.value.width,
    height: frameDimensions.value.height,
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: frameStyle.value.color,
  }));

  // Corner components
  const corners = useMemo(
    () => (
      <>
        <Animated.View style={[styles.corner, styles.topLeft, animatedBorderStyle]} />
        <Animated.View style={[styles.corner, styles.topRight, animatedBorderStyle]} />
        <Animated.View style={[styles.corner, styles.bottomLeft, animatedBorderStyle]} />
        <Animated.View style={[styles.corner, styles.bottomRight, animatedBorderStyle]} />
      </>
    ),
    [animatedBorderStyle]
  );

  // Handle highlight changes
  useEffect(() => {
    if (!layout.width || !layout.height) return;

    if (highlight && scanFrame) {
      const scaled = getScaledValues(highlight, scanFrame, layout);

      framePosition.value = withSpring({ x: scaled.x, y: scaled.y }, springConfig);
      frameDimensions.value = withSpring({ width: scaled.width, height: scaled.height }, springConfig);
      frameStyle.value = {
        color: '#FFCC00',
        backgroundColor: 'rgba(128, 128, 128, 0.2)',
      };
    } else {
      // Only update position if it hasn't been initialized yet
      if (!layoutInitialized.current) {
        framePosition.value = centerPosition; // Set initial position
        layoutInitialized.current = true;
      }
      
      framePosition.value = withTiming(centerPosition);

      frameDimensions.value = withTiming({ width: FRAME_SIZE, height: FRAME_SIZE });
      frameStyle.value = {
        color: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0)',
      };
    }
  }, [highlight, layout, scanFrame, centerPosition]);

  if (!layout.width || !layout.height) return null;

  return (
    <Animated.View style={animatedFrameStyle}>{corners}</Animated.View>
  );
};

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderWidth: CORNER_BORDER_WIDTH,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopLeftRadius: CORNER_RADIUS,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopRightRadius: CORNER_RADIUS,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: CORNER_RADIUS,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomRightRadius: CORNER_RADIUS,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});