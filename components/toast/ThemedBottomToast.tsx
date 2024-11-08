import React, { useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle, TouchableHighlight, ActivityIndicator, TouchableWithoutFeedback, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Portal } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { storage } from '@/utils/storage';
import { useMMKVString } from 'react-native-mmkv';

export type ThemedBottomToastProps = {
    lightColor?: string;
    darkColor?: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    message: string;
    isVisible?: boolean;
    isSyncing?: boolean; // New prop for syncing state
    style?: StyleProp<ViewStyle>;
    duration?: number; // New prop to auto-hide after a duration
    onVisibilityToggle?: (isVisible: boolean) => void; // Callback to track visibility
};

export function ThemedBottomToast({
    lightColor,
    darkColor,
    iconName,
    message,
    isVisible = false,
    isSyncing = false, // Default value for syncing state
    style = {},
    duration = 4000, // Default duration for auto-hide
    onVisibilityToggle,
}: ThemedBottomToastProps) {
    const [locale, setLocale] = useMMKVString('locale', storage);
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);

    const toastStyle = useMemo(() => ([
        styles.toastContainer,
        {
            paddingBottom: Platform.OS === 'ios' ? 20 : 0,
            backgroundColor: colorScheme === 'light' ? Colors.light.toastBackground : Colors.dark.toastBackground
        },
        style
    ]), [colorScheme, style]);

    // Reanimated values for animation
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(50);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
        };
    });

    // Handle visibility and animation
    useEffect(() => {
        if (isVisible) {
            // Show toast with animation
            opacity.value = withTiming(1, { duration: 300 });
            translateY.value = withTiming(0, { duration: 300 });

            const timer = setTimeout(() => {
                if (onVisibilityToggle) {
                    onVisibilityToggle(false);
                }
            }, duration);

            return () => clearTimeout(timer);
        } else {
            // Hide toast with animation
            setIsAnimationComplete(true);
            opacity.value = withTiming(0, { duration: 300 });
            translateY.value = withTiming(50, { duration: 300 });
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
                <View style={styles.toastTitle}>
                    {isSyncing ? (
                        <ActivityIndicator size="small" color={color} />
                    ) : (
                        <Ionicons
                            name={iconName || 'information-circle'}
                            size={15}
                            color={color}
                        />

                    )}
                    <ThemedText style={styles.toastText} numberOfLines={2} type='defaultSemiBold'>
                        {message}
                    </ThemedText>
                </View>
            </Animated.View>
        </Portal>
    );
}

const styles = StyleSheet.create({
    toastContainer: {
        paddingTop: 5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toastTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    toastText: {
        fontSize: 12,
        overflow: 'hidden',
        
    }
});
