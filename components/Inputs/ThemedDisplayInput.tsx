import React, { useState, useMemo, forwardRef, useEffect } from 'react';
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Image,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getIconPath } from '@/utils/returnIcon';
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from '@/utils/responsive';

// --- Reanimated Imports ---
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

export type ThemedDisplayInputProps = {
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  logoCode?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  isError?: boolean;
  errorMessage?: string;
  onPress?: () => void;
  onClear?: () => void;
  showClearButton?: boolean;
  disabled?: boolean;
  backgroundColor?: string;
};

export const ThemedDisplayInput = forwardRef<View, ThemedDisplayInputProps>(
  (
    {
      iconName,
      logoCode,
      label,
      placeholder,
      value = '',
      style,
      isError = false,
      errorMessage = '',
      onPress = () => {},
      onClear = () => {},
      showClearButton = true,
      disabled = false,
      backgroundColor,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [displayValue, setDisplayValue] = useState(value);

    // Color configurations
    const color =
      currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === 'light'
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder;
    const errorColor =
      currentTheme === 'light' ? Colors.light.error : Colors.dark.error;
    const iconPath = useMemo(() => getIconPath(logoCode ?? ''), [logoCode]);

    const inputContainerStyle = useMemo(
      () => [
        styles.inputContainer,
        {
          backgroundColor:
            backgroundColor ??
            (currentTheme === 'light'
              ? Colors.light.inputBackground
              : Colors.dark.inputBackground),
        },
      ],
      [currentTheme, backgroundColor]
    );

    // --- Reanimated Shared Values ---
    const animatedBorderWidth = useSharedValue(
      isError && errorMessage ? getResponsiveWidth(0.3) : 0
    );
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);

    // --- Reanimated Styles ---
    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderBottomWidth: animatedBorderWidth.value,
    }));

    const animatedErrorTextStyle = useAnimatedStyle(() => ({
      height: errorTextHeight.value,
      opacity: errorTextOpacity.value,
      overflow: 'hidden',
    }));

    const animatedErrorIconStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: errorShakeValue.value }],
    }));

    // Animate error-related styles when error state changes
    useEffect(() => {
      if (isError && errorMessage) {
        animatedBorderWidth.value = withTiming(getResponsiveWidth(0.3), {
          duration: 200,
        });
        errorTextHeight.value = withTiming(getResponsiveHeight(2.5), {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        errorTextOpacity.value = withTiming(1, { duration: 250 });
        errorShakeValue.value = withSequence(
          withTiming(-getResponsiveWidth(1), { duration: 50 }),
          withTiming(getResponsiveWidth(1), { duration: 50 }),
          withTiming(-getResponsiveWidth(0.7), { duration: 50 }),
          withTiming(getResponsiveWidth(0.7), { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        animatedBorderWidth.value = withTiming(0, { duration: 200 });
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }
    }, [isError, errorMessage]);

    // Update local display value when the external prop changes
    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleClear = () => {
      setDisplayValue('');
      onClear();
    };

    return (
      <View style={[styles.container, style]}>
        <ThemedView style={inputContainerStyle}>
          {!iconName && !logoCode && (
            <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}

          <Pressable
            onPress={onPress}
            disabled={disabled}
            style={styles.pressableContainer}
          >
            <Animated.View
              style={[
                styles.inputRow,
                { borderBottomColor: errorColor },
                animatedBorderStyle,
              ]}
            >
              {iconName && (
                <MaterialCommunityIcons
                  name={iconName}
                  size={getResponsiveFontSize(18)}
                  color={placeholderColor}
                />
              )}
              {logoCode && (
                <View
                  style={[
                    styles.logoContainer,
                    { marginLeft: iconName ? getResponsiveWidth(2.4) : 0 },
                  ]}
                >
                  <Image
                    source={iconPath}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              )}
              <ThemedText
                style={[
                  styles.input,
                  {
                    color: displayValue ? color : placeholderColor,
                    marginLeft: iconName || logoCode
                      ? getResponsiveWidth(2.4)
                      : 0,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayValue || placeholder}
              </ThemedText>

              <View style={styles.rightContainer}>
                {showClearButton &&
                  !disabled &&
                  displayValue.length > 0 && (
                    <Pressable
                      onPress={handleClear}
                      style={styles.iconTouchable}
                      hitSlop={{
                        top: getResponsiveHeight(0.6),
                        bottom: getResponsiveHeight(0.6),
                        left: getResponsiveWidth(1.2),
                        right: getResponsiveWidth(1.2),
                      }}
                    >
                      <MaterialIcons
                        name="cancel"
                        color={color}
                        size={getResponsiveFontSize(16)}
                      />
                    </Pressable>
                  )}
                {isError && errorMessage && (
                  <Animated.View
                    style={[
                      styles.errorIconContainer,
                      animatedErrorIconStyle,
                    ]}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={getResponsiveWidth(5)}
                      color={errorColor}
                    />
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          </Pressable>
        </ThemedView>

        {/* Animated error message container */}
        <Animated.View
          style={[styles.errorContainer, animatedErrorTextStyle]}
        >
          {isError && errorMessage && (
            <ThemedText
              style={[styles.errorText, { color: errorColor }]}
              numberOfLines={1}
            >
              {errorMessage}
            </ThemedText>
          )}
        </Animated.View>
      </View>
    );
  }
);

ThemedDisplayInput.displayName = 'ThemedDisplayInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: 'column',
  },
  pressableContainer: {
    width: '100%',
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    marginBottom: getResponsiveHeight(0.5),
  },
  logoContainer: {
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(6),
    marginRight: getResponsiveWidth(0),
  },
  logo: {
    width: '55%',
    height: '55%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: getResponsiveHeight(3.6),
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
  },
  errorIconContainer: {
    marginLeft: getResponsiveWidth(1.2),
    padding: getResponsiveWidth(0.5),
  },
  errorContainer: {
    marginHorizontal: getResponsiveWidth(4.8),
    justifyContent: 'center',
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(2.2),
  },
});

export default ThemedDisplayInput;
