import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, StyleProp, ViewStyle, ActivityIndicator, Pressable, TextStyle, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Animated, { useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

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
  /** Debounce time in milliseconds (default: 300) */
  debounceTime?: number;
  /** Whether to display the button as an outline button */
  outline?: boolean;
  /** Border color for outline button (defaults to button background color if not provided) */
  borderColor?: string;
  /** Border width for outline button (defaults to 1) */
  borderWidth?: number;
};

/**
 * ThemedButton is a reusable button component that adapts to the current theme.
 * It supports light and dark color themes, displays an optional icon, and handles
 * press events with customizable styles. Can be rendered as a filled button or an outline button.
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
  debounceTime = 300, // Default debounce time of 300ms
  outline = false, // Default to filled button
  borderColor,
  borderWidth = 1,
}: ThemedButtonProps): JSX.Element {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const icon = useThemeColor({ light: Colors.light.icon, dark: Colors.dark.icon }, 'icon');
  const { currentTheme } = useTheme();
  
  // State to track if the button is currently in a cooldown period
  const [isDebouncing, setIsDebouncing] = useState(false);
  // Ref to hold the timeout ID for cleanup
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup the timeout when component unmounts
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Determine colors based on theme and props
  const displayedIconColor = useMemo(() => {
    if (syncStatus === 'error') {
      return currentTheme === 'light' ? Colors.light.error : Colors.dark.error;
    }
    return iconColor ? iconColor : icon;
  }, [syncStatus, currentTheme, iconColor, icon]);

  const buttonBackgroundColor = useMemo(() => 
    currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
  [currentTheme]);

  // Text color
  const textColor = useMemo(() => {
      return color;
  }, [color]);
    

  // Border color for outline mode (defaults to buttonBackgroundColor)
    const outlineBorderColor = useMemo(() => {
    return borderColor || buttonBackgroundColor;
  }, [borderColor, buttonBackgroundColor]);


  // Animation style for rotating sync icon
  const syncAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{
      rotate: syncStatus === 'syncing' 
        ? withRepeat(withTiming(`${-360}deg`, { duration: 1000 }), -1, false) 
        : '0deg',
    }],
  }), [syncStatus]);

  // Debounced onPress handler
  const handlePress = useCallback(() => {
    if (isDebouncing) {
      return; // Ignore press during cooldown
    }
    
    // Call the original onPress function
    onPress();
    
    // Set debouncing state to true
    setIsDebouncing(true);
    
    // Set a timeout to reset the debouncing state
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceTime);
  }, [onPress, isDebouncing, debounceTime]);

  // Button style with appropriate opacity
  const buttonStyle = useMemo(() => {
    const baseStyle = {
      opacity: (syncStatus === 'syncing' && disabled) 
        ? 1 
        : (disabled || loading || syncStatus === 'syncing' || isDebouncing ? 0.7 : 1),
    };

    if (outline) {
      return [
        {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: borderWidth,
          borderColor: outlineBorderColor,
        },
        styles.touchable,
      ];
    } else {
      return [
        {
          ...baseStyle,
          backgroundColor: buttonBackgroundColor,
        },
        styles.touchable,
      ];
    }
  }, [currentTheme, disabled, loading, syncStatus, buttonBackgroundColor, isDebouncing, outline, borderWidth, outlineBorderColor]);

  // Component to render cloud with an indicator
  type CloudWithIndicatorProps = {
    indicatorName: keyof typeof MaterialCommunityIcons.glyphMap;
    animated?: boolean;
  };

  const CloudWithIndicator: React.FC<CloudWithIndicatorProps> = ({ indicatorName, animated = false }) => (
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons
        name="cloud"
        size={iconSize}
        color={outline ? outlineBorderColor : displayedIconColor}
        style={styles.baseIcon}
      />
      <Animated.View style={[
        styles.syncIndicator, 
        animated ? syncAnimatedStyle : undefined,
        outline && { backgroundColor: 'transparent' }, // Transparent background for outline mode
        {backgroundColor: currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground}
      ]}>
        <MaterialCommunityIcons
          name={indicatorName}
          size={iconSize * 0.58} 
          color={outline ? outlineBorderColor : displayedIconColor}
        />
      </Animated.View>
    </View>
  );

  // Render icon based on syncStatus
  const renderIcon = () => {
    if (syncStatus) {
      switch (syncStatus) {
        case 'idle':
          return <CloudWithIndicator indicatorName="sync" />;
        case 'syncing':
          return <CloudWithIndicator indicatorName="sync" animated />;
        case 'synced':
          return <CloudWithIndicator indicatorName="check" />;
        case 'error':
          return (
            <MaterialCommunityIcons
              name="cloud-alert"
              size={iconSize}
              color={outline ? outlineBorderColor : displayedIconColor}
            />
          );
      }
    }
    
    // Default icon (no sync status)
    return iconName ? (
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={outline ? outlineBorderColor : displayedIconColor}
      />
    ) : null;
  };

  const isButtonDisabled = disabled || loading || syncStatus === 'syncing' || isDebouncing;

  return (
    <AnimatedPressable
      ref={ref}
      pointerEvents={pointerEvents}
      onPress={handlePress}
      disabled={isButtonDisabled}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={`Press to ${label}`}
      style={[buttonStyle, style, animatedStyle]}
      hitSlop={{ 
        top: getResponsiveHeight(1.2), 
        bottom: getResponsiveHeight(1.2), 
        left: getResponsiveWidth(2.4), 
        right: getResponsiveWidth(2.4) 
      }}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size={getResponsiveFontSize(23)}
            color={loadingColor ? loadingColor : textColor}
          />
          {/* {loadingLabel && (
            <ThemedText style={[styles.label, { color: textColor }, textStyle]} type="defaultSemiBold">
              {loadingLabel}
            </ThemedText>
          )} */}
        </>
      ) : (
        <>
          {renderIcon()}
          {label && (
            <ThemedText style={[styles.label, { color: textColor }, textStyle]} type="defaultSemiBold">
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
    fontSize: getResponsiveFontSize(16),
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
    borderRadius: getResponsiveWidth(100),
  },
});