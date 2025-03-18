import React, { useEffect, useMemo, useState } from 'react';
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
const INITIAL_CORNER_SIZE = 15;
const INITIAL_CORNER_BORDER_WIDTH = 3;
const CORNER_RADIUS = 6;

// Pre-calculate styles to avoid re-creation
const baseCornerStyle = {
  position: 'absolute' as 'absolute', // Corrected: Type assertion
  borderWidth: INITIAL_CORNER_BORDER_WIDTH,
};

const cornerStyles = StyleSheet.create({
  topLeft: {
    ...baseCornerStyle,
    top: 0,
    left: 0,
    borderTopLeftRadius: CORNER_RADIUS,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    ...baseCornerStyle,
    top: 0,
    right: 0,
    borderTopRightRadius: CORNER_RADIUS,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    ...baseCornerStyle,
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: CORNER_RADIUS,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    ...baseCornerStyle,
    bottom: 0,
    right: 0,
    borderBottomRightRadius: CORNER_RADIUS,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});

const springConfig = { stiffness: 200, damping: 16 };
const cornerSpringConfig = { stiffness: 150, damping: 12 }; // Smoother spring config for corners
const timingConfig = { duration: 200 }; // Add a duration for the timing animation

// Helper function to calculate scaled values.  Made static outside the component.
const calculateScaledValues = (highlight: CameraHighlight, scanFrame: Layout, layout: Layout) => {
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
};

export const ScannerFrame: React.FC<ScannerFrameProps> = ({ highlight, layout, scanFrame }) => {
  const [layoutReady, setLayoutReady] = useState(false);

  // Calculate center position only once layout is available
  const centerPosition = useMemo(() => {
    if (layout.width && layout.height) {
      return {
        x: (layout.width - FRAME_SIZE) / 2,
        y: (layout.height - FRAME_SIZE) / 2,
      };
    }
    return { x: 0, y: 0 };
  }, [layout.width, layout.height]); // Depend only on width and height

  // Shared values for frame properties
  const frameX = useSharedValue(centerPosition.x);
  const frameY = useSharedValue(centerPosition.y);
  const frameWidth = useSharedValue(FRAME_SIZE);
  const frameHeight = useSharedValue(FRAME_SIZE);
  const frameColor = useSharedValue('rgba(255, 255, 255, 0.8)');
  const frameBackgroundColor = useSharedValue('rgba(255, 255, 255, 0)');

  // Shared values for corner size and border width
  const cornerSize = useSharedValue(INITIAL_CORNER_SIZE);
  const cornerBorderWidth = useSharedValue(INITIAL_CORNER_BORDER_WIDTH);

  // Calculate scaling factor for corner size and border width
  const calculateScalingFactor = (width: number, height: number) => {
    const minDimension = Math.min(width, height);
    return Math.max(0.7, minDimension / FRAME_SIZE); // Limit scaling to 70% of the original size
  };

  // Unified animated style for the frame
  const animatedFrameStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    borderRadius: CORNER_RADIUS,
    pointerEvents: 'box-none',
    backgroundColor: frameBackgroundColor.value,
    borderColor: frameColor.value,
    left: frameX.value,
    top: frameY.value,
    width: frameWidth.value,
    height: frameHeight.value,
  }));

  // Animated style for corner borders (only borderColor changes)
  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: frameColor.value,
    width: cornerSize.value,
    height: cornerSize.value,
    borderWidth: cornerBorderWidth.value,
  }));

  // Pre-render the corners with the animated border style
  const corners = useMemo(() => (
    <>
      <Animated.View style={[cornerStyles.topLeft, animatedBorderStyle]} />
      <Animated.View style={[cornerStyles.topRight, animatedBorderStyle]} />
      <Animated.View style={[cornerStyles.bottomLeft, animatedBorderStyle]} />
      <Animated.View style={[cornerStyles.bottomRight, animatedBorderStyle]} />
    </>
  ), [animatedBorderStyle]);

  useEffect(() => {
    if (layout.width && layout.height && !layoutReady) {
      setLayoutReady(true);
      // No need to animate on initial layout; just set the values.
      frameX.value = centerPosition.x;
      frameY.value = centerPosition.y;
      return; // Early return to avoid unnecessary calculations
    }

    if (!layoutReady) return; // Wait until the layout is ready

    if (highlight && scanFrame) {
      const scaled = calculateScaledValues(highlight, scanFrame, layout);
      // Animate to the highlight position
      frameX.value = withSpring(scaled.x, springConfig);
      frameY.value = withSpring(scaled.y, springConfig);
      frameWidth.value = withSpring(scaled.width, springConfig);
      frameHeight.value = withSpring(scaled.height, springConfig);
      frameColor.value = '#FFCC00';
      frameBackgroundColor.value = 'rgba(128, 128, 128, 0.2)';

      // Scale down the corners smoothly
      const scalingFactor = calculateScalingFactor(scaled.width, scaled.height);
      cornerSize.value = withSpring(INITIAL_CORNER_SIZE * scalingFactor, cornerSpringConfig);
      cornerBorderWidth.value = withSpring(INITIAL_CORNER_BORDER_WIDTH * scalingFactor, cornerSpringConfig);
    } else {
      // Animate back to the center position
      frameX.value = withTiming(centerPosition.x, timingConfig);
      frameY.value = withTiming(centerPosition.y, timingConfig);
      frameWidth.value = withTiming(FRAME_SIZE, timingConfig);
      frameHeight.value = withTiming(FRAME_SIZE, timingConfig);
      frameColor.value = 'rgba(255, 255, 255, 0.8)';
      frameBackgroundColor.value = 'rgba(255, 255, 255, 0)';

      // Reset corner size and border width to initial values smoothly
      cornerSize.value = withTiming(INITIAL_CORNER_SIZE, timingConfig);
      cornerBorderWidth.value = withTiming(INITIAL_CORNER_BORDER_WIDTH, timingConfig);
    }
  }, [highlight, layout, scanFrame, layoutReady, centerPosition]);

  if (!layoutReady) {
    return null; // Or a placeholder view if needed
  }

  return (
    <Animated.View style={animatedFrameStyle}>
      {corners}
    </Animated.View>
  );
};

export default ScannerFrame;
