import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Portal } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';

export type ThemedToastProps = {
    lightColor?: string;
    darkColor?: string;
    iconName?: keyof typeof MaterialIcons.glyphMap;
    dismissIconName?: keyof typeof MaterialIcons.glyphMap;
    onDismiss?: () => void;
    message: string;
    duration?: number;
    isVisible?: boolean;
    style?: StyleProp<ViewStyle>;
    onVisibilityToggle?: (isVisible: boolean) => void;
};

/**
 * A themed toast component that displays a message with an icon.
 *
 * @param {ThemedToastProps} props - The component props.
 * @returns {JSX.Element | null} - The rendered toast component or null if not visible.
 */
export function ThemedToast({
    lightColor,
    darkColor,
    iconName,
    dismissIconName,
    onDismiss,
    message,
    duration = 4000,
    isVisible = false,
    style = {},
    onVisibilityToggle,
}: ThemedToastProps) {
    const { currentTheme } = useTheme();
    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

    // State to track whether the animation is complete
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);

    // Memoize the toast style to prevent unnecessary re-renders
    const toastStyle = useMemo(() => ([
        styles.toastContainer,
        {
            backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
        },
        style,
    ]), [currentTheme, style]);

    // Reanimated shared values for opacity and translation
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    // Animated style for the toast
    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    // Effect hook to handle toast visibility and animation
    useEffect(() => {
        if (isVisible) {
            // Animate in
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withTiming(0, { duration: 300 });

            // Automatically hide the toast after the specified duration
            const timer = setTimeout(() => {
                if (onVisibilityToggle) {
                    onVisibilityToggle(false);
                }
            }, duration);

            // Clear the timeout on unmount or when visibility changes
            return () => clearTimeout(timer);
        } else {
            // Animate out
            setIsAnimationComplete(true); 
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(50, { duration: 300 });

            // Reset animation complete state after animation finishes
            setTimeout(() => {
                setIsAnimationComplete(false);
            }, 300); 
        }
    }, [isVisible, duration, onVisibilityToggle, opacity, translateY]);

    // Don't render the toast if it's not visible and the animation is complete
    if (!isVisible && !isAnimationComplete) {
        return null;
    }

    return (
        <Portal>
            <Animated.View style={[toastStyle, animatedStyle]}>
                <View style={styles.toastContent}>
                    <View style={styles.toastTitle}>
                        {/* Icon */}
                        <MaterialIcons
                            name={iconName || 'info'}
                            size={20}
                            color={color}
                        />

                        {/* Message container */}
                        <View style={styles.messageContainer}>
                            <ThemedText 
                                style={styles.toastText} 
                                numberOfLines={2} 
                                ellipsizeMode="tail" 
                                type='defaultSemiBold'
                            >
                                {message}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Dismiss button */}
                    <Pressable
                        onPress={onDismiss}
                        style={styles.iconTouchable}
                        hitSlop={30} 
                    >
                        <MaterialIcons
                            name={dismissIconName || 'close'}
                            size={20}
                            color={color}
                        />
                    </Pressable>
                </View>
            </Animated.View>
        </Portal>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
    },
    toastTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 10, 
    },
    messageContainer: {
        flex: 1,
        marginRight: 5, // Space to prevent overlap with close button
    },
    toastText: {
        fontSize: 14,
        overflow: 'hidden',
    },
    iconTouchable: {
        borderRadius: 50, 
    },
});