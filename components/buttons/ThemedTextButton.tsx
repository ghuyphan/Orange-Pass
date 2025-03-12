import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, StyleProp, ViewStyle, ActivityIndicator, TextStyle, Pressable, Text } from 'react-native'; // Added Text
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import _ from 'lodash';

// ... (ThemedTextButtonProps definition - same as before)
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
  /** Name of the icon on the left */
  leftIconName?: keyof typeof Ionicons.glyphMap;
  /** Name of the icon on the right */
  rightIconName?: keyof typeof Ionicons.glyphMap;
    /** color for the left icon */
    leftIconColor?: string;
    /** color for the right icon */
    rightIconColor?: string;
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
  /** Debounce wait time in milliseconds */
  debounceWait?: number;
};


export function ThemedTextButton({
  lightColor,
  darkColor,
  label,
  loadingLabel,
  iconName,
  leftIconName,
  rightIconName,
  leftIconColor,
  rightIconColor,
  onPress,
  style = {},
  textStyle = {},
  disabled = false,
  loading = false,
  debounceWait = 300,
}: ThemedTextButtonProps): JSX.Element {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Create a memoized debounced version of the onPress handler
  const debouncedOnPress = useCallback(
    _.debounce(() => {
      if (!disabled && !loading) {
        onPress();
      }
    }, debounceWait, { leading: true, trailing: false }),
    [onPress, disabled, loading, debounceWait]
  );

    const combinedTextStyle = useMemo(() => {
    return StyleSheet.flatten([styles.label, { color }, textStyle]);
  }, [color, textStyle]);

  const buttonStyle = useMemo(
    () => [
      {
        opacity: disabled || loading ? 0.5 : 1,
      },
      styles.touchable,
      style, // External styles should be applied last
    ],
    [disabled, loading, style]
  );

  const resolvedLeftIconColor = useThemeColor({ light: leftIconColor, dark: leftIconColor }, 'text');
  const resolvedRightIconColor = useThemeColor({ light: rightIconColor, dark: rightIconColor }, 'text');

  // Get the font size from the combined text style.  Handle the case where fontSize is undefined.
  const fontSize = typeof combinedTextStyle.fontSize === 'number' ? combinedTextStyle.fontSize : getResponsiveFontSize(15);


  return (
    <Pressable
      onPress={debouncedOnPress}
      disabled={disabled || loading}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={`Press to ${label}`}
      hitSlop={{
        bottom: getResponsiveHeight(1.2),
        left: getResponsiveWidth(2.4),
        right: getResponsiveWidth(2.4),
        top: getResponsiveHeight(1.2),
      }}
      style={buttonStyle}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={color} />
          <ThemedText style={combinedTextStyle} type="defaultSemiBold">
            {loadingLabel || label}
          </ThemedText>
        </>
      ) : (
        <>
          {leftIconName && (
            <Ionicons name={leftIconName} size={fontSize} color={leftIconColor || color} style={styles.icon} />
          )}
          {iconName && <Ionicons name={iconName} size={fontSize} color={color} style={styles.icon}/>}
          <ThemedText style={combinedTextStyle} type="defaultSemiBold">
             {label}
          </ThemedText>
          {rightIconName && (
            <Ionicons name={rightIconName} size={fontSize} color={rightIconColor || color} style={styles.icon} />
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flexDirection: 'row',
    gap: getResponsiveWidth(1.2),
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
    alignItems: 'center',
  },
  label: {
    fontSize: getResponsiveFontSize(16),
  },
  icon: {
    // You can add margin here if needed for spacing
  },
});