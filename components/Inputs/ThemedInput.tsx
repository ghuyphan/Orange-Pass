import React, { useState, useImperativeHandle, forwardRef, useCallback, useRef, useEffect } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  View,
  Pressable,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TextInputSelectionChangeEventData,
  TextStyle,
} from 'react-native';
import { ViewStyle } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

// --- Reanimated Imports ---
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

export type ThemedInputProps = {
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  label?: string;
  value?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<TextStyle>;
  errorTextStyle?: StyleProp<TextStyle>;
  isError?: boolean;
  errorMessage?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  onChangeText?: (text: string) => void;
  onBlur?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onFocus?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onSubmitEditing?: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  disableOpacityChange?: boolean;
  required?: boolean;
  onDisabledPress?: () => void;
};

type Selection = {
  start: number;
  end: number;
};

export const ThemedInput = forwardRef<
  { focus: () => void; },
  ThemedInputProps
>(
  (
    {
      iconName,
      label,
      placeholder,
      value = '',
      style,
      inputStyle,
      labelStyle,
      iconStyle,
      errorTextStyle,
      isError = false,
      errorMessage = '',
      secureTextEntry = false,
      keyboardType = 'default',
      onChangeText = () => { },
      onBlur = () => { },
      onFocus = () => { },
      onSubmitEditing = () => { },
      disabled = false,
      backgroundColor,
      disableOpacityChange = false,
      required = false,
      onDisabledPress,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
    const [isFocused, setIsFocused] = useState(false);

    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder;
    const errorColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;

    const textInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    // --- Reanimated: Create Shared Values ---
    const animatedOpacity = useSharedValue(disabled && !disableOpacityChange ? 0.5 : 1);
    const animatedBorderWidth = useSharedValue(isError && errorMessage ? getResponsiveWidth(0.3) : 0);
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);

    // Shared value for placeholder animation
    const placeholderAnimation = useSharedValue(value || isFocused ? 1 : 0);

    // Pre-calculate responsive values outside useAnimatedStyle
    const borderWidthValue = getResponsiveWidth(0.3);
    const errorTextHeightValue = getResponsiveHeight(2.5);
    const errorShakeWidth1 = getResponsiveWidth(1);
    const errorShakeWidth07 = getResponsiveWidth(0.7);
    const placeholderFontSizeLarge = getResponsiveFontSize(14);
    const placeholderFontSizeSmall = getResponsiveFontSize(12);
    const placeholderTranslateYValue = -getResponsiveHeight(2.5);
    const iconSize = getResponsiveFontSize(16);
    const errorIconSize = getResponsiveWidth(5);
    const iconTouchableHitSlopVertical = getResponsiveHeight(0.6);
    const iconTouchableHitSlopHorizontal = getResponsiveWidth(1.2);
    // const inputPaddingVertical = getResponsiveHeight(2.2); // Increased paddingVertical here
    // const inputPaddingHorizontal = getResponsiveWidth(4.8);
    // const inputBorderRadius = getResponsiveWidth(4);
    // const placeholderLeft = getResponsiveWidth(4.8);
    // const placeholderTop = getResponsiveHeight(2.8); // Adjusted placeholder top position here
    const inputMarginLeft = getResponsiveWidth(2.5);
    // const inputMarginRight = getResponsiveWidth(2.4);
    // const rightContainerGap = getResponsiveWidth(3.6);
    // const iconTouchableBorderRadius = getResponsiveWidth(12);
    // const errorIconContainerMarginLeft = getResponsiveWidth(1.2);
    // const errorIconContainerPadding = getResponsiveWidth(0.5);
    // const errorContainerMarginHorizontal = getResponsiveWidth(4.8);
    // const errorTextFontSize = getResponsiveFontSize(11);
    // const errorTextLineHeight = getResponsiveHeight(2.2);
    const visibilityIconSize = getResponsiveWidth(4);


    // Use effect to update animations when error state changes
    useEffect(() => {
      if (isError && errorMessage) {
        // Animate border width
        animatedBorderWidth.value = withTiming(borderWidthValue, { duration: 200 });

        // Animate error text appearance
        errorTextHeight.value = withTiming(errorTextHeightValue, {
          duration: 200,
          easing: Easing.out(Easing.ease)
        });
        errorTextOpacity.value = withTiming(1, { duration: 250 });

        // Add shake animation for error icon
        errorShakeValue.value = withSequence(
          withTiming(-errorShakeWidth1, { duration: 50 }),
          withTiming(errorShakeWidth1, { duration: 50 }),
          withTiming(-errorShakeWidth07, { duration: 50 }),
          withTiming(errorShakeWidth07, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        // Animate border width back to normal
        animatedBorderWidth.value = withTiming(0, { duration: 200 });

        // Animate error text disappearance
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }
    }, [isError, errorMessage, borderWidthValue, errorTextHeightValue, errorShakeWidth1, errorShakeWidth07]);

    // Update placeholder animation when value or focus changes
    useEffect(() => {
      placeholderAnimation.value = withTiming(value || isFocused ? 1 : 0, { duration: 200 });
    }, [value, isFocused]);

    // --- Reanimated: Create Animated Styles ---
    const animatedContainerStyle = useAnimatedStyle(() => {
      return {
        opacity: animatedOpacity.value,
        borderBottomWidth: animatedBorderWidth.value,
      };
    });

    const animatedErrorTextStyle = useAnimatedStyle(() => {
      return {
        height: errorTextHeight.value,
        opacity: errorTextOpacity.value,
        overflow: 'hidden',
      };
    });

    const animatedErrorIconStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: errorShakeValue.value }],
      };
    });

    const animatedPlaceholderStyle = useAnimatedStyle(() => {
      const translateY = interpolate(placeholderAnimation.value, [0, 1], [0, placeholderTranslateYValue]);
      const fontSize = interpolate(placeholderAnimation.value, [0, 1], [placeholderFontSizeLarge, placeholderFontSizeSmall]);
      const opacity = interpolate(placeholderAnimation.value, [0, 1], [1, 0.6]);

      return {
        transform: [{ translateY }],
        fontSize,
        opacity,
      };
    });

    const onClearValue = useCallback(() => {
      setLocalValue('');
      onChangeText('');
      setSelection({ start: 0, end: 0 });
    }, [onChangeText]);

    const onToggleSecureValue = useCallback(() => setIsSecure((prevState) => !prevState), []);

    const handleChangeText = useCallback((text: string) => {
      setLocalValue(text);
      onChangeText(text);
    }, [onChangeText]);

    const handleBlur = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      onBlur(event);
      setIsFocused(false);
      animatedOpacity.value = withTiming(disabled && !disableOpacityChange ? 0.5 : 1, { duration: 200 });
    }, [onBlur, disabled, disableOpacityChange, animatedOpacity]);

    const handleFocus = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      onFocus(event);
      setIsFocused(true);
      animatedOpacity.value = withTiming(1, { duration: 200 });
    }, [onFocus, animatedOpacity]);

    const handleDisabledPress = useCallback(() => {
      if (onDisabledPress) {
        onDisabledPress();
      }
    }, [onDisabledPress]);

    const handleSelectionChange = useCallback(
      (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
        if (isFocused) {
          setSelection(event.nativeEvent.selection);
        }
      },
      [isFocused]
    );

    const inputContainerStyle = [
      styles.inputContainer,
      {
        backgroundColor:
          backgroundColor ??
          (currentTheme === 'light'
            ? Colors.light.inputBackground
            : Colors.dark.inputBackground),
        borderBottomColor: errorColor,
      },
      style,
    ];

    return (
      <View style={[styles.container, style]}>
        <Pressable
          style={{ width: '100%' }}
          onPress={disabled ? handleDisabledPress : undefined}
          disabled={!disabled}
        >
          {/* Input container with animated border */}
          <Animated.View style={[inputContainerStyle, animatedContainerStyle]}>
            {/* Animated Placeholder */}
            {placeholder && (
              <Animated.Text
                style={[
                  styles.placeholder,
                  { color: placeholderColor },
                  animatedPlaceholderStyle,
                ]}
              >
                {placeholder}
              </Animated.Text>
            )}

            <View style={styles.inputRow}>
              {/* Icon */}
              {iconName && (
                <MaterialCommunityIcons
                  name={iconName}
                  size={iconSize}
                  color={placeholderColor}
                  style={iconStyle}
                />
              )}

              {/* Text Input */}
              <TextInput
                ref={textInputRef}
                onSubmitEditing={onSubmitEditing}
                style={[
                  styles.input,
                  {
                    color: disabled ? placeholderColor : color,
                    marginLeft: iconName ? inputMarginLeft : 0,
                  },
                  inputStyle,
                ]}
                secureTextEntry={isSecure}
                value={localValue}
                onChangeText={handleChangeText}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder=""
                placeholderTextColor={placeholderColor}
                accessible={true}
                accessibilityLabel={label}
                keyboardType={keyboardType}
                editable={!disabled}
                selection={selection}
                onSelectionChange={handleSelectionChange}
              />

              {/* Right side icons */}
              <View style={styles.rightContainer}>
                {localValue.length > 0 && (
                  <Pressable
                    onPress={disabled ? undefined : onClearValue}
                    style={styles.iconTouchable}
                    hitSlop={{
                      top: iconTouchableHitSlopVertical,
                      bottom: iconTouchableHitSlopVertical,
                      left: iconTouchableHitSlopHorizontal,
                      right: iconTouchableHitSlopHorizontal,
                    }}
                    disabled={disabled}
                  >
                    <MaterialIcons name={'cancel'} color={color} size={iconSize} />
                  </Pressable>
                )}

                {localValue.length > 0 && secureTextEntry && (
                  <Pressable
                    onPress={disabled ? undefined : onToggleSecureValue}
                    style={[styles.iconTouchable]}
                    hitSlop={{
                      top: iconTouchableHitSlopVertical,
                      bottom: iconTouchableHitSlopVertical,
                      left: iconTouchableHitSlopHorizontal,
                      right: iconTouchableHitSlopHorizontal,
                    }}
                    disabled={disabled}
                  >
                    <MaterialIcons
                      name={isSecure ? 'visibility' : 'visibility-off'}
                      size={visibilityIconSize}
                      color={color}
                    />
                  </Pressable>
                )}

                {isError && errorMessage && (
                  <Animated.View style={[styles.errorIconContainer, animatedErrorIconStyle]}>
                    <MaterialIcons name="error-outline" size={errorIconSize} color={errorColor} />
                  </Animated.View>
                )}
              </View>
            </View>
          </Animated.View>
        </Pressable>

        {/* Animated error message container */}
        <Animated.View style={[styles.errorContainer, animatedErrorTextStyle]}>
          {isError && errorMessage && (
            <ThemedText
              style={[
                styles.errorText,
                { color: errorColor },
                errorTextStyle
              ]}
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

ThemedInput.displayName = 'ThemedInput';

ThemedInput.defaultProps = {
  placeholder: '',
  secureTextEntry: false,
  keyboardType: 'default',
  disabled: false,
  disableOpacityChange: false,
  required: false,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    width: '100%',
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(2.2), // Increased paddingVertical to 2.2
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: 'column',
  },
  placeholder: {
    position: 'absolute',
    left: getResponsiveWidth(4.8),
    top: getResponsiveHeight(2.8), // Adjusted top to 2.8 to align with increased padding
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    height: getResponsiveHeight(3.6),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
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
    height: 0, // Initially zero height
    marginHorizontal: getResponsiveWidth(4.8),
    justifyContent: 'center',
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(2.2),
  },
});

export default ThemedInput;