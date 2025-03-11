import React, { useState, useImperativeHandle, forwardRef, useCallback, useRef, useEffect } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  StyleProp,
  View,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TextInputSelectionChangeEventData,
  Dimensions,
  TextStyle, // Import TextStyle
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
} from 'react-native-reanimated';

export type ThemedInputProps = {
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  label?: string;
  value?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>; // Added for TextInput customization
  labelStyle?: StyleProp<TextStyle>;  // Added for label customization
  iconStyle?: StyleProp<TextStyle>;   // Added for icon customization
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
  { focus: () => void; }, // Define the type of the exposed ref
  ThemedInputProps
>(
  (
    {
      iconName,
      label,
      placeholder,
      value = '',
      style,
      inputStyle,  // Added
      labelStyle,   // Added
      iconStyle,    // Added
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
    const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
    const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
    const [isFocused, setIsFocused] = useState(false);
    const [errorIconPosition, setErrorIconPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [errorTooltipWidth, setErrorTooltipWidth] = useState(0);

    // Properly typed ref for the error icon
    const errorIconRef = useRef<View>(null);
    const errorTextRef = useRef<View>(null);
    const textToMeasureRef = useRef<Text>(null);
    const screenWidth = Dimensions.get('window').width;

    const color = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder;
    const errorColor = currentTheme === 'light' ? Colors.light.error : Colors.dark.error;
    const tooltipBackgroundColor = currentTheme === 'light' ? '#222222' : '#333333';

    const textInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    // --- Reanimated: Create Shared Values ---
    const animatedOpacity = useSharedValue(disabled && !disableOpacityChange ? 0.5 : 1);
    const animatedBorderWidth = useSharedValue(isError && errorMessage ? getResponsiveWidth(0.3) : 0);

    // Use effect to update border width when error state changes
    useEffect(() => {
      animatedBorderWidth.value = withTiming(
        isError && errorMessage ? getResponsiveWidth(0.3) : 0,
        { duration: 200 }
      );
    }, [isError, errorMessage, animatedBorderWidth]);

    // --- Reanimated: Create Animated Styles ---
    const animatedContainerStyle = useAnimatedStyle(() => {
      return {
        opacity: animatedOpacity.value,
        borderBottomWidth: animatedBorderWidth.value,
      };
    });

    // Calculate tooltip width based on text length - improved accuracy
    useEffect(() => {
      if (errorMessage) {
        // More accurate estimation with adjusted character width
        const estimatedWidth = Math.min(
          screenWidth * 0.8, // Max width as 80% of screen
          Math.max(
            getResponsiveWidth(30), // Minimum width
            errorMessage.length * getResponsiveFontSize(5) + getResponsiveWidth(16) // Better character width estimate
          )
        );
        setErrorTooltipWidth(estimatedWidth);
      }
    }, [errorMessage, screenWidth]);

    // Function to measure text when tooltip becomes visible
    const measureErrorText = useCallback(() => {
      if (textToMeasureRef.current && errorTextRef.current) {
        errorTextRef.current.measure((x, y, width, height) => {
          if (width > 0) {
            // Add some padding to the measured width
            setErrorTooltipWidth(width + getResponsiveWidth(12));
          }
        });
      }
    }, []);

    useEffect(() => {
      if (isErrorModalVisible) {
        // Slight delay to ensure the text has rendered
        setTimeout(measureErrorText, 100);
      }
    }, [isErrorModalVisible, measureErrorText]);

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
      // --- Reanimated: Maintain error border on blur if there is an error ---
      animatedOpacity.value = withTiming(disabled && !disableOpacityChange ? 0.5 : 1, { duration: 200 });
    }, [onBlur, disabled, disableOpacityChange, animatedOpacity]);

    const handleFocus = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
      onFocus(event);
      setIsFocused(true);
      // --- Reanimated: Trigger Animation on Focus ---
      animatedOpacity.value = withTiming(1, { duration: 200 }); // Ensure full opacity on focus
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

    const showErrorTooltip = useCallback(() => {
      if (errorIconRef.current) {
        errorIconRef.current.measureInWindow((x, y, width, height) => {
          setErrorIconPosition({ x, y, width, height });
          setIsErrorModalVisible(true);
        });
      }
    }, []);

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

    // Calculate tooltip position and direction - improved to handle auto-width better
    const getTooltipPosition = useCallback(() => {
      const tooltipWidth = errorTooltipWidth;
      const tooltipMargin = getResponsiveWidth(5);
      const tooltipHeight = getResponsiveHeight(8); // Approximate height of tooltip
      const arrowHeight = getResponsiveHeight(1.5); // Height of the arrow

      // Center of the error icon
      const iconCenterX = errorIconPosition.x + (errorIconPosition.width / 2);

      // Default position centers the tooltip over the icon
      let left = iconCenterX - (tooltipWidth / 2);

      // Check if tooltip would go off right edge
      if (left + tooltipWidth > screenWidth - tooltipMargin) {
        left = screenWidth - tooltipWidth - tooltipMargin;
      }

      // Check if tooltip would go off left edge
      if (left < tooltipMargin) {
        left = tooltipMargin;
      }

      // Position the tooltip above the icon with space for the arrow
      const top = errorIconPosition.y - tooltipHeight - arrowHeight;

      // Calculate where the arrow should point (relative to tooltip)
      const arrowPosition = {
        left: iconCenterX - left,
      };

      // Make sure arrow stays within tooltip bounds (with padding)
      const arrowPadding = getResponsiveWidth(5);
      if (arrowPosition.left < arrowPadding) {
        arrowPosition.left = arrowPadding;
      } else if (arrowPosition.left > tooltipWidth - arrowPadding) {
        arrowPosition.left = tooltipWidth - arrowPadding;
      }

      return {
        tooltip: {
          top,
          left,
          width: tooltipWidth,
        },
        arrow: {
          left: arrowPosition.left,
        },
      };
    }, [errorIconPosition, screenWidth, errorTooltipWidth]);

    const tooltipPosition = getTooltipPosition();

    const ErrorTooltip = useCallback(() => (
      <Modal
        transparent={true}
        visible={isErrorModalVisible}
        animationType="fade"
        onRequestClose={() => setIsErrorModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsErrorModalVisible(false)}>
          <View style={styles.errorModalOverlay}>
            <View
              style={[
                styles.errorTooltip,
                {
                  backgroundColor: errorColor,
                  top: tooltipPosition.tooltip.top,
                  left: tooltipPosition.tooltip.left,
                }
              ]}
            >
              <View ref={errorTextRef}>
                <ThemedText
                  ref={textToMeasureRef}
                  style={styles.errorTooltipText}
                >
                  {errorMessage}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.tooltipArrow,
                  {
                    borderTopColor: errorColor,
                    left: tooltipPosition.arrow.left,
                  }
                ]}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    ), [isErrorModalVisible, errorMessage, tooltipBackgroundColor, tooltipPosition]);

    return (
      <View style={[styles.container, style]}>
        <Pressable
          style={{ width: '100%' }}
          onPress={disabled ? handleDisabledPress : undefined}
          disabled={!disabled}
        >
          {/* Use Animated.View */}
          <Animated.View style={[inputContainerStyle, animatedContainerStyle]}>
            {/* Conditionally render the label */}
            {label && (
              <ThemedText style={[styles.label, { color }, labelStyle]} type="defaultSemiBold">
                {label}
                {required && <ThemedText style={{ color: 'red' }}> *</ThemedText>}
              </ThemedText>
            )}

            <View style={styles.inputRow}>
              {iconName && (
                <MaterialCommunityIcons
                  name={iconName}
                  size={getResponsiveFontSize(16)}
                  color={placeholderColor}
                  style={iconStyle}
                />
              )}
              <TextInput
                ref={textInputRef}
                onSubmitEditing={onSubmitEditing}
                style={[
                  styles.input,
                  {
                    color: disabled ? placeholderColor : color,
                    marginLeft: iconName ? getResponsiveWidth(2.5) : 0,
                  },
                  inputStyle,
                ]}
                secureTextEntry={isSecure}
                value={localValue}
                onChangeText={handleChangeText}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={placeholder}
                placeholderTextColor={placeholderColor}
                accessible={true}
                accessibilityLabel={label}
                keyboardType={keyboardType}
                editable={!disabled}
                selection={selection}
                onSelectionChange={handleSelectionChange}
              />

              <View style={styles.rightContainer}>
                {localValue.length > 0 && (
                  <Pressable
                    onPress={disabled ? undefined : onClearValue}
                    style={styles.iconTouchable}
                    hitSlop={{
                      top: getResponsiveHeight(0.6),
                      bottom: getResponsiveHeight(0.6),
                      left: getResponsiveWidth(1.2),
                      right: getResponsiveWidth(1.2),
                    }}
                    disabled={disabled}
                  >
                    <MaterialIcons name={'cancel'} color={color} size={getResponsiveFontSize(16)} />
                  </Pressable>
                )}

                {localValue.length > 0 && secureTextEntry && (
                  <Pressable
                    onPress={disabled ? undefined : onToggleSecureValue}
                    style={[styles.iconTouchable]}
                    hitSlop={{
                      top: getResponsiveHeight(0.6),
                      bottom: getResponsiveHeight(0.6),
                      left: getResponsiveWidth(1.2),
                      right: getResponsiveWidth(1.2),
                    }}
                    disabled={disabled}
                  >
                    <MaterialIcons
                      name={isSecure ? 'visibility' : 'visibility-off'}
                      size={getResponsiveWidth(4)}
                      color={color}
                    />
                  </Pressable>
                )}

                {isError && errorMessage && (
                  <Pressable
                    onPress={showErrorTooltip}
                    style={styles.errorIconContainer}
                    ref={errorIconRef}
                  >
                    <MaterialIcons name="error-outline" size={getResponsiveWidth(5)} color={errorColor} />
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>
        </Pressable>

        <ErrorTooltip />
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
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: 'column',
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    opacity: 0.6,
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
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorTooltip: {
    position: 'absolute',
    padding: getResponsiveWidth(3),
    borderRadius: getResponsiveWidth(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: getResponsiveHeight(0.25) },
    shadowOpacity: 0.25,
    shadowRadius: getResponsiveWidth(0.92),
    elevation: 5,
    alignSelf: 'flex-start', // Added to make tooltip wrap content tightly
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -getResponsiveHeight(1.2),
    width: 0,
    height: 0,
    borderLeftWidth: getResponsiveWidth(1.5),
    borderRightWidth: getResponsiveWidth(2),
    borderTopWidth: getResponsiveHeight(1.5),
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  errorTooltipText: {
    color: 'white',
    fontSize: getResponsiveFontSize(14),
  },
});

export default ThemedInput;