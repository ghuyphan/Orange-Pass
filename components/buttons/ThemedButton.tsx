import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle, ActivityIndicator, Pressable, TextStyle, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Animated, { useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { get } from 'lodash';

/**
 * ThemedButtonProps defines the properties for the ThemedButton component.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export type ThemedButtonProps = {
  ref?: React.RefObject<React.ElementRef<typeof Pressable>>;
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
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error'; // Optional sync status
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
  ref,
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
  syncStatus, // Receive syncStatus as a prop
}: ThemedButtonProps): JSX.Element {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const icon = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'icon');

  // Get the currentTheme from useTheme
  const { currentTheme } = useTheme();

  // Determine colors based on theme and props
  let displayedIconColor = iconColor ? iconColor : icon;
  let buttonBackgroundColor =
    currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground;

  // Special color handling for error state
  if (syncStatus === 'error') {
    displayedIconColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;
    // buttonBackgroundColor = 'lightgray';
  }

  const syncAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: syncStatus === 'syncing' ? withRepeat(withTiming(`${360}deg`, { duration: 2000 }), -1, false) : '0deg',
        },
      ],
    };
  }, [syncStatus]);

  // Modified buttonStyle to keep full opacity when syncStatus is 'syncing' and button is disabled
  const buttonStyle = useMemo(
    () => [
      {
        backgroundColor: buttonBackgroundColor,
        opacity: (syncStatus === 'syncing' && disabled) ? 1 : (disabled || loading || syncStatus === 'syncing' ? 0.7 : 1),
      },
      styles.touchable,
    ],
    [currentTheme, disabled, loading, syncStatus, buttonBackgroundColor]
  );

  // Render icon based on syncStatus
  const renderIcon = () => {
    // If we have a syncStatus, use cloud-based icons
    if (syncStatus) {
      switch (syncStatus) {
        case 'idle':
        case 'syncing':
          return (
            <View style={styles.iconContainer}>
              {/* Base cloud icon (static) */}
              <MaterialCommunityIcons
                name="cloud"
                size={iconSize}
                color={displayedIconColor}
                style={styles.baseIcon}
              />
              {/* Always show the sync indicator, but only animate it when syncing */}
              <Animated.View style={[styles.syncIndicator, syncStatus === 'syncing' ? syncAnimatedStyle : undefined]}>
                <MaterialCommunityIcons
                  name="sync"
                  size={iconSize * 0.5} // Smaller indicator
                  color={displayedIconColor}
                />
              </Animated.View>
            </View>
          );
        case 'synced':
          return (
            <MaterialCommunityIcons
              name="cloud-check"
              size={iconSize}
              color={displayedIconColor}
            />
          );
        case 'error':
          return (
            <MaterialCommunityIcons
              name="cloud-alert"
              size={iconSize}
              color={displayedIconColor}
            />
          );
      }
    }
    
    // Default icon (no sync status)
    return iconName ? (
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={displayedIconColor}
      />
    ) : null;
  };

  return (
    <AnimatedPressable
      ref={ref}
      pointerEvents={pointerEvents}
      onPress={onPress}
      disabled={disabled || loading || syncStatus === 'syncing'}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={`Press to ${label}`}
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
          {renderIcon()}
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
  iconContainer: {
    position: 'relative',
    width: getResponsiveWidth(4.5),
    height: getResponsiveWidth(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseIcon: {
    position: 'absolute',
  },
  syncIndicator: {
    position: 'absolute',
    bottom: getResponsiveWidth(-0.5),
    right: getResponsiveWidth(-0.5),
    padding: getResponsiveWidth(0.05), 
    backgroundColor: Colors.light.buttonBackground,
    borderRadius: getResponsiveWidth(100),
  },
});