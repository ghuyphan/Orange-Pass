import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, Platform, StyleProp, ViewStyle, ActivityIndicator, TouchableWithoutFeedback, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

/**
 * ThemedButtonProps defines the properties for the ThemedButton component.
 */
export type ThemedButtonProps = {
    /** Light color theme for the button text */
    lightColor?: string;
    /** Dark color theme for the button text */
    darkColor?: string;
    /** Label to display on the button */
    label?: string;
    /** Label to display while the button is in a loading state */
    loadingLabel?: string;
    /** Name of the icon to display in the button */
    iconName?: keyof typeof Ionicons.glyphMap;
    /** Color of the icon to display in the button */
    iconColor?: string;
    /** Size of the icon to display in the button */
    iconSize?: number;
    /** Underlay color for the button */
    underlayColor?: string;
    /** Function to call when the button is pressed */
    onPress: () => void;
    /** Custom styles for the button */
    style?: StyleProp<ViewStyle>;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether the button is in a loading state */
    loading?: boolean;
};

/**
 * ThemedButton is a reusable button component that adapts to the current theme.
 * It supports light and dark color themes, displays an optional icon, and handles
 * press events with customizable styles.
 *
 * @param {ThemedButtonProps} props - The properties for the ThemedButton component.
 * @returns {JSX.Element} The ThemedButton component.
 */
export function ThemedButton({
    lightColor,
    darkColor,
    label,
    loadingLabel,
    iconName,
    iconColor,
    iconSize = 16,
    underlayColor,
    onPress,
    style = {},
    disabled = false,
    loading = false,
}: ThemedButtonProps): JSX.Element {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const icon = useThemeColor({ light: Colors.light.text, dark: Colors.dark.text }, 'icon');
    const colorScheme = useColorScheme();

    const buttonStyle = useMemo(() => ([
        {
            backgroundColor: colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
            opacity: disabled || loading ? 0.7 : 1,
            // borderRadius: Platform.OS === 'ios' ? 10 : 50,
        },
        styles.touchable,
    ]), [colorScheme, disabled, loading, style]);

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            accessible
            accessibilityLabel={label}
            accessibilityRole="button"
            accessibilityHint={`Press to ${label}`}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            style={[buttonStyle, style]}

        // underlayColor={underlayColor || (colorScheme === 'light' ? Colors.light.buttonHighlight : Colors.dark.buttonHighlight)}
        >
                {loading ? (
                    <>
                        <ActivityIndicator size="small" color={color} />
                        {loadingLabel && <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>{loadingLabel}</ThemedText>}
                        {/* <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>
                            {loadingLabel}
                        </ThemedText> */}
                    </>
                ) : (
                    <>
                        {iconName && <Ionicons name={iconName} size={iconSize} color= {iconColor? iconColor : icon}/>}
                        {label && <ThemedText style={[styles.label, { color }]} type='defaultSemiBold'>{label}</ThemedText>}
                    </>
                )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    touchable: {
        padding: 8,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 5,
        overflow: 'hidden',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 5,

    },
    label: {
        fontSize: 15,
    },
});
