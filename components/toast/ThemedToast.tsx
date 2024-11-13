import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedToastProps = {
    lightColor?: string;
    darkColor?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    dismissIconName?: keyof typeof Ionicons.glyphMap;
    onDismiss?: () => void;
    message: string;
    duration?: number;
    isVisible?: boolean;
    style?: StyleProp<ViewStyle>;
    onVisibilityToggle?: (isVisible: boolean) => void;
};

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
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);

    const toastStyle = useMemo(() => ([
        styles.toastContainer,
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.toastBackground : Colors.dark.toastBackground
        },
        style
    ]), [colorScheme, style]);

    // Reanimated values
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    useEffect(() => {
        if (isVisible) {
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withTiming(0, { duration: 300 });

            const timer = setTimeout(() => {
                if (onVisibilityToggle) {
                    onVisibilityToggle(false);
                }
            }, duration);

            return () => clearTimeout(timer);
        } else {
            setIsAnimationComplete(true);
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(50, { duration: 300 });
            setTimeout(() => {
                setIsAnimationComplete(false);
            }, 300);
        }
    }, [isVisible, duration, onVisibilityToggle, opacity, translateY]);

    if (!isVisible && !isAnimationComplete) {
        return null;
    }

    return (
        <Portal>
            <Animated.View style={[toastStyle, animatedStyle]}>
                <View style={styles.toastContent}>
                    <View style={styles.toastTitle}>
                        <Ionicons
                            name={iconName || 'information-circle'}
                            size={25}
                            color={color}
                        />
                        <View style={styles.messageContainer}>
                            <ThemedText style={styles.toastText} numberOfLines={2} ellipsizeMode="tail" type='defaultSemiBold'>
                                {message}
                            </ThemedText>
                        </View>
                    </View>
                    <Pressable
                        onPress={onDismiss}
                        style={styles.iconTouchable}
                        hitSlop={30}
                    >
                        <Ionicons
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
        borderRadius: 10,
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
        marginRight: 10, // Space to prevent overlap with close button
    },
    toastText: {
        fontSize: 14,
        overflow: 'hidden',
    },
    iconTouchable: {
        borderRadius: 50,
    },
});
