import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle, ActivityIndicator, Pressable, TextStyle } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Animated from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

/**
 * ThemedButtonProps defines the properties for the ThemedButton component.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
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
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
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
  /** Animated styles for the button */
  animatedStyle?: StyleProp<ViewStyle>;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Color of the loading indicator */
  loadingColor?: string;
  /** Pointer events for the button */
  pointerEvents?: 'auto' | 'none';
  textStyle?: StyleProp<TextStyle>;
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
  iconSize = getResponsiveWidth(4.5),
  onPress,
  style = {},
  animatedStyle = {},
  disabled = false,
  loading = false,
  loadingColor,
  pointerEvents = 'auto',
  textStyle,
}: ThemedButtonProps): JSX.Element {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const icon = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'icon');

  // Get the currentTheme from useTheme
  const { currentTheme } = useTheme();

  const buttonStyle = useMemo(
    () => [
      {
        // Use currentTheme to determine the background color
        backgroundColor:
          currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
        opacity: disabled || loading ? 0.7 : 1,
        // borderRadius: Platform.OS === 'ios' ? 10 : 50,
      },
      styles.touchable,
    ],
    [currentTheme, disabled, loading]
  ); // Include currentTheme in the dependency array

  return (
    <AnimatedPressable
      pointerEvents={pointerEvents}
      onPress={onPress}
      disabled={disabled || loading}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={`Press to ${label}`}
      // android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
      style={[buttonStyle, style, animatedStyle]}
      hitSlop={{ top: getResponsiveHeight(1.2), bottom: getResponsiveHeight(1.2), left: getResponsiveWidth(2.4), right: getResponsiveWidth(2.4) }}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size={iconSize}
            color={loadingColor ? loadingColor : color}
          />
          {loadingLabel && (
            <ThemedText style={[styles.label, { color }, textStyle]} type="defaultSemiBold">
              {loadingLabel}
            </ThemedText>
          )}
        </>
      ) : (
        <>
          {iconName && (
            <MaterialCommunityIcons
              name={iconName}
              size={iconSize}
              color={iconColor ? iconColor : icon}
            />
          )}
          {label && (
            <ThemedText style={[styles.label, { color: icon }, textStyle]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    padding: getResponsiveWidth(2),
    borderRadius: getResponsiveWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveWidth(1.2),
    overflow: 'hidden',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: getResponsiveWidth(1.2),
  },
  label: {
    fontSize: getResponsiveFontSize(15),
  },
});