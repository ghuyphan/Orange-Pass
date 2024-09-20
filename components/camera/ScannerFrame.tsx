import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming, useSharedValue } from 'react-native-reanimated';

interface CameraHighlight {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ScannerFrameProps {
    highlight: CameraHighlight | null;
    layout: { width: number; height: number };
    scanFrame: { height: number; width: number };
}

export const ScannerFrame: React.FC<ScannerFrameProps> = ({ highlight, layout, scanFrame }) => {
    if (!layout) return null;
    else if (layout && layout.width > 0 && layout.height > 0) {
    const frameX = useSharedValue(layout.width / 2 - 110); // Center horizontally
    const frameY = useSharedValue(layout.height / 2 - 110); // Center vertically
    const frameWidth = useSharedValue(220);
    const frameHeight = useSharedValue(220);
    const frameColor = useSharedValue('rgba(255, 255, 255, 0.8)'); // Default to white
    const frameBackgroundColor = useSharedValue('rgba(255, 255, 255, 0)');

    const [isFirstMount, setIsFirstMount] = useState(true);

    useEffect(() => {
        if (highlight && layout && scanFrame) {
            const xScale = layout.width / scanFrame.height -0.02;
            const yScale = layout.height / scanFrame.width;
            const widthScale = layout.height / scanFrame.width + 0.1;
            const heightScale = layout.width / scanFrame.height + 0.15;

            const adjustedX = highlight.x * xScale;
            const adjustedY = highlight.y * yScale;
            const adjustedWidth = highlight.width * widthScale;
            const adjustedHeight = highlight.height * heightScale;

            frameX.value = withSpring(adjustedX, { stiffness: 200, damping: 15 });
            frameY.value = withSpring(adjustedY, { stiffness: 200, damping: 15 });
            frameWidth.value = withSpring(adjustedWidth, { stiffness: 200, damping: 15 });
            frameHeight.value = withSpring(adjustedHeight, { stiffness: 200, damping: 15 });
            frameColor.value = '#FFCC00';
            frameBackgroundColor.value = 'rgba(128, 128, 128, 0.2)';
            setIsFirstMount(false);
        } else if (!isFirstMount) {
            frameX.value = withTiming(layout.width / 2 - 110);
            frameY.value = withTiming(layout.height / 2 - 110);
            frameWidth.value = withTiming(220);
            frameHeight.value = withTiming(220);
            frameColor.value = withTiming('rgba(255, 255, 255, 0.8)');
            frameBackgroundColor.value = withTiming('rgba(255, 255, 255, 0)');
        }
    }, [highlight, layout, scanFrame, isFirstMount]);

    const animatedFrameStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        borderRadius: 6,
        backgroundColor: frameBackgroundColor.value,
        left: frameX.value,
        top: frameY.value,
        width: frameWidth.value,
        height: frameHeight.value,
        borderColor: frameColor.value,
    }));

    const animatedBorderStyle = useAnimatedStyle(() => ({
        borderColor: frameColor.value,
    }));

    return (
        <Animated.View style={[animatedFrameStyle]}>
            <Animated.View style={[styles.corner, styles.topLeft, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.topRight, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.bottomLeft, animatedBorderStyle]} />
            <Animated.View style={[styles.corner, styles.bottomRight, animatedBorderStyle]} />
        </Animated.View>
    );
}
};

const styles = StyleSheet.create({
    corner: {
        position: 'absolute',
        width: 15,
        height: 15,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopLeftRadius: 6,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopRightRadius: 6,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomLeftRadius: 6,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomRightRadius: 6,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
});
