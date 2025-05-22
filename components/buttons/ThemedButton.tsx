import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Pressable,
  TextStyle,
  View,
} from 'react-native';
import { ThemedText } from '../ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ThemedButtonProps = {
  ref?: React.RefObject<React.ElementRef<typeof Pressable>>;
  lightColor?: string;
  darkColor?: string;
  label?: string;
  loadingLabel?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  underlayColor?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  pointerEvents?: 'auto' | 'none';
  textStyle?: StyleProp<TextStyle>;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  debounceTime?: number;
  outline?: boolean;
  borderColor?: string;
  borderWidth?: number;
};

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
  syncStatus,
  debounceTime = 300,
  outline = false,
  borderColor,
  borderWidth = 1,
}: ThemedButtonProps): JSX.Element {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const icon = useThemeColor(
    { light: Colors.light.icon, dark: Colors.dark.icon },
    'icon'
  );
  const { currentTheme } = useTheme();

  // Debounce state
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Colors
  const displayedIconColor = useMemo(() => {
    if (syncStatus === 'error') {
      return currentTheme === 'light'
        ? Colors.light.error
        : Colors.dark.error;
    }
    return iconColor ? iconColor : icon;
  }, [syncStatus, currentTheme, iconColor, icon]);

  const buttonBackgroundColor = useMemo(
    () =>
      currentTheme === 'light'
        ? Colors.light.buttonBackground
        : Colors.dark.buttonBackground,
    [currentTheme]
  );

  const textColor = useMemo(() => color, [color]);

  const outlineBorderColor = useMemo(
    () => borderColor || buttonBackgroundColor,
    [borderColor, buttonBackgroundColor]
  );

  // --- Animation for sync icon ---
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (syncStatus === 'syncing') {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [syncStatus, rotation]);

  const syncAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${rotation.value}deg`,
      },
    ],
  }));

  // Debounced onPress handler
  const handlePress = useCallback(() => {
    if (isDebouncing) {
      return;
    }
    onPress();
    setIsDebouncing(true);
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceTime);
  }, [onPress, isDebouncing, debounceTime]);

  // Button style
  const buttonStyle = useMemo(() => {
    const baseStyle = {
      opacity:
        syncStatus === 'syncing' && disabled
          ? 1
          : disabled || loading || syncStatus === 'syncing' || isDebouncing
          ? 0.7
          : 1,
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
  }, [
    currentTheme,
    disabled,
    loading,
    syncStatus,
    buttonBackgroundColor,
    isDebouncing,
    outline,
    borderWidth,
    outlineBorderColor,
  ]);ActivityIndicator

  // Cloud with indicator
  type CloudWithIndicatorProps = {
    indicatorName: keyof typeof MaterialCommunityIcons.glyphMap;
    animated?: boolean;
  };

  const CloudWithIndicator: React.FC<CloudWithIndicatorProps> = ({
    indicatorName,
    animated = false,
  }) => (
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons
        name="cloud"
        size={iconSize}
        color={outline ? outlineBorderColor : displayedIconColor}
        style={styles.baseIcon}
      />
      <Animated.View
        style={[
          styles.syncIndicator,
          animated ? syncAnimatedStyle : undefined,
          outline && { backgroundColor: 'transparent' },
          {
            backgroundColor:
              currentTheme === 'light'
                ? Colors.light.buttonBackground
                : Colors.dark.buttonBackground,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={indicatorName}
          size={iconSize * 0.58}
          color={outline ? outlineBorderColor : displayedIconColor}
        />
      </Animated.View>
    </View>
  );

  // Render icon
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
    return iconName ? (
      <MaterialCommunityIcons
        name={iconName}
        size={iconSize}
        color={outline ? outlineBorderColor : displayedIconColor}
      />
    ) : null;
  };

  const isButtonDisabled =
    disabled || loading || syncStatus === 'syncing' || isDebouncing;

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
        right: getResponsiveWidth(2.4),
      }}
    >
      {loading ? (
        <>
          <ActivityIndicator
            size={getResponsiveFontSize(16)}
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
            <ThemedText
              style={[styles.label, { color: textColor }, textStyle]}
              type="defaultSemiBold"
            >
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
