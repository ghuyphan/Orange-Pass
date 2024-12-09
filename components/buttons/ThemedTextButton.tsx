import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle, ActivityIndicator, TextStyle, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Props for ThemedTextButton component.
 */
export type ThemedTextButtonProps = {
    /** Light color theme for the button text */
    lightColor?: string;
    /** Dark color theme for the button text */
    darkColor?: string;
    /** Label to display on the button */
    label: string;
    /** Label to display while the button is in a loading state */
    loadingLabel?: string;
    /** Name of the icon to display in the button */
    iconName?: keyof typeof Ionicons.glyphMap;
    /** Function to call when the button is pressed */
    onPress: () => void;
    /** Custom styles for the button */
    style?: StyleProp<ViewStyle>;
    /** Custom styles for the button text */
    textStyle?: StyleProp<TextStyle>;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Whether the button is in a loading state */
    loading?: boolean;
};

/**
 * ThemedTextButton is a reusable button component that adapts to the current theme.
 * It supports light and dark color themes, displays an optional icon, and handles
 * press events with customizable styles.
 *
 * @param {ThemedTextButtonProps} props - The properties for the ThemedTextButton component.
 * @returns {JSX.Element} The ThemedTextButton component.
 */
export function ThemedTextButton({
    lightColor,
    darkColor,
    label,
    loadingLabel,
    iconName,
    onPress,
    style = {},
    textStyle = {},
    disabled = false,
    loading = false,
}: ThemedTextButtonProps): JSX.Element {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const colorScheme = useColorScheme();

    const buttonStyle = useMemo(() => ([
        {
            opacity: disabled || loading ? 0.5 : 1,
        },
        styles.touchable,
        style, // External styles should be applied last
    ]), [disabled, loading, style]);

    return (
            <Pressable
                onPress={onPress}
                disabled={disabled || loading}
                accessible
                accessibilityLabel={label}
                accessibilityRole="button"
                accessibilityHint={`Press to ${label}`}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                hitSlop={{bottom: 10, left: 10, right: 10, top: 10}}
                style={buttonStyle}

                // underlayColor={colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground}
               
            >
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color={color} />
                            <ThemedText style={[styles.label, { color }, textStyle]} type='defaultSemiBold'>
                                {loadingLabel}
                            </ThemedText>
                        </>
                    ) : (
                        <>
                            {iconName && <Ionicons name={iconName} size={20} color={color} />}
                            <ThemedText style={[styles.label, { color }, textStyle]} type='defaultSemiBold'>
                                {label}
                            </ThemedText>
                        </>
                    )}
            </Pressable>
    );
}

const styles = StyleSheet.create({
    touchable: {
        flexDirection: 'row',
        gap: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 50,
        overflow: 'hidden',
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontSize: 15,
    },
});
