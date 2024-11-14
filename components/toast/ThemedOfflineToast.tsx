import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, ActivityIndicator, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export type ThemedStatusToastProps = {
    lightColor?: string;
    darkColor?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    dismissIconName?: keyof typeof Ionicons.glyphMap;
    onDismiss?: () => void;
    message: string;
    isVisible?: boolean;
    isSyncing?: boolean;
    style?: StyleProp<ViewStyle>;
    duration?: number;
    onVisibilityToggle?: (isVisible: boolean) => void;
};

export function ThemedStatusToast({
    lightColor,
    darkColor,
    iconName,
    dismissIconName,
    onDismiss,
    message,
    isVisible = false,
    isSyncing = false,
    style = {},
    duration = 4000,
    onVisibilityToggle,
}: ThemedStatusToastProps) {
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

    // Reanimated values for animation
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    // Handle visibility and animation
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
                        {isSyncing ? (
                            <ActivityIndicator size="small" color={color} />
                        ) : (
                            <Ionicons
                                name={iconName || 'information-circle-outline'}
                                size={20}
                                color={color}
                            />
                        )}
                        <View style={styles.messageContainer}>
                            <ThemedText style={styles.toastText} numberOfLines={2} ellipsizeMode="tail" type="defaultSemiBold">
                                {message}
                            </ThemedText>
                        </View>
                    </View>
                    {!isSyncing && (
                        <Pressable onPress={onDismiss} hitSlop={30} style={styles.iconTouchable}>
                            <Ionicons
                                name={dismissIconName || 'close-outline'}
                                size={20}
                                color={color}
                            />
                        </Pressable>
                    )}
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
        marginRight: 10, // Ensures space for the close button
    },
    toastText: {
        fontSize: 14,
        overflow: 'hidden',
    },
    iconTouchable: {
        borderRadius: 50,
        padding: 5,
    },
});
