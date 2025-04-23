import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  TextInput,
  StyleSheet,
  StyleProp,
  View,
  Pressable,
  NativeSyntheticEvent,
  TextInputFocusEventData,
  TextInputSelectionChangeEventData,
  TextStyle,
} from "react-native";
import { ViewStyle } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "../ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";

// --- Reanimated Imports ---
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

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
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  onChangeText?: (text: string) => void;
  onBlur?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onFocus?: (event: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  onSubmitEditing?: () => void;
  disabled?: boolean;
  backgroundColor?: string;
  disableOpacityChange?: boolean;
  required?: boolean;
  onDisabledPress?: () => void;
  // --- New Props for Optional Right Button ---
  rightButtonIconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightButtonPress?: () => void;
  rightButtonIconStyle?: StyleProp<TextStyle>;
  // --- End New Props ---
};

type Selection = {
  start: number;
  end: number;
};

export const ThemedInput = forwardRef<
  { focus: () => void },
  ThemedInputProps
>(
  (
    {
      iconName,
      label,
      placeholder,
      value = "",
      style,
      inputStyle,
      labelStyle,
      iconStyle,
      errorTextStyle,
      isError = false,
      errorMessage = "",
      secureTextEntry = false,
      keyboardType = "default",
      onChangeText = () => {},
      onBlur = () => {},
      onFocus = () => {},
      onSubmitEditing = () => {},
      disabled = false,
      backgroundColor,
      disableOpacityChange = false,
      required = false,
      onDisabledPress,
      // --- Destructure New Props ---
      rightButtonIconName,
      onRightButtonPress,
      rightButtonIconStyle,
      // --- End Destructure ---
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
    const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
    const [isFocused, setIsFocused] = useState(false);

    const color =
      currentTheme === "light" ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === "light"
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder;
    const errorColor =
      currentTheme === "light" ? Colors.light.error : Colors.dark.error;

    const textInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    // Helper: determine desired opacity
    const targetOpacity = disabled && !disableOpacityChange ? 0.5 : 1;

    // --- Reanimated: Create Shared Values ---
    const animatedOpacity = useSharedValue(targetOpacity);
    const animatedBorderWidth = useSharedValue(
      isError && errorMessage ? getResponsiveWidth(0.3) : 0
    );
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);

    // Update opacity if disabled or disableOpacityChange changes
    useEffect(() => {
      animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
    }, [disabled, disableOpacityChange]);

    // Use effect to update animations when error state changes
    useEffect(() => {
      if (isError && errorMessage) {
        // Animate border width
        animatedBorderWidth.value = withTiming(getResponsiveWidth(0.3), {
          duration: 200,
        });

        // Animate error text appearance
        errorTextHeight.value = withTiming(getResponsiveHeight(2.5), {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        errorTextOpacity.value = withTiming(1, { duration: 250 });

        // Add shake animation for error icon
        errorShakeValue.value = withSequence(
          withTiming(-getResponsiveWidth(1), { duration: 50 }),
          withTiming(getResponsiveWidth(1), { duration: 50 }),
          withTiming(-getResponsiveWidth(0.7), { duration: 50 }),
          withTiming(getResponsiveWidth(0.7), { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        // Animate border width back to normal
        animatedBorderWidth.value = withTiming(0, { duration: 200 });

        // Animate error text disappearance
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }
    }, [isError, errorMessage]);

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
        overflow: "hidden",
      };
    });

    const animatedErrorIconStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: errorShakeValue.value }],
      };
    });

    const onClearValue = useCallback(() => {
      setLocalValue("");
      onChangeText("");
      setSelection({ start: 0, end: 0 });
    }, [onChangeText]);

    const onToggleSecureValue = useCallback(
      () => setIsSecure((prevState) => !prevState),
      []
    );

    const handleChangeText = useCallback(
      (text: string) => {
        setLocalValue(text);
        onChangeText(text);
      },
      [onChangeText]
    );

    const handleBlur = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        onBlur(event);
        setIsFocused(false);
        animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
      },
      [onBlur, targetOpacity, animatedOpacity]
    );

    const handleFocus = useCallback(
      (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        onFocus(event);
        setIsFocused(true);
        // If focus happens, we always bring the opacity to 1
        animatedOpacity.value = withTiming(1, { duration: 200 });
      },
      [onFocus, animatedOpacity]
    );

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

    // --- Callback for the new right button ---
    const handleRightButtonPress = useCallback(() => {
      if (onRightButtonPress && !disabled) {
        onRightButtonPress();
      }
    }, [onRightButtonPress, disabled]);
    // --- End Callback ---

    const inputContainerStyle = [
      styles.inputContainer,
      {
        backgroundColor:
          backgroundColor ??
          (currentTheme === "light"
            ? Colors.light.inputBackground
            : Colors.dark.inputBackground),
        borderBottomColor: errorColor,
      },
      style,
    ];

    return (
      <View style={[styles.container, style]}>
        <Pressable
          style={{ width: "100%" }}
          onPress={disabled ? handleDisabledPress : undefined}
          disabled={!disabled}
        >
          {/* Input container with animated border */}
          <Animated.View
            style={[inputContainerStyle, animatedContainerStyle]}
          >
            {/* Label */}
            {label && (
              <ThemedText
                style={[styles.label, { color }, labelStyle]}
                type="defaultSemiBold"
              >
                {label}
                {required && <ThemedText style={{ color: "red" }}> *</ThemedText>}
              </ThemedText>
            )}

            <View style={styles.inputRow}>
              {/* Icon */}
              {iconName && (
                <MaterialCommunityIcons
                  name={iconName}
                  size={getResponsiveFontSize(16)}
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
                cursorColor={color}
              />

              {/* Right side icons */}
              <View style={styles.rightContainer}>
                {/* --- Optional Right Button --- */}
                {rightButtonIconName && onRightButtonPress && (
                  <Pressable
                    onPress={handleRightButtonPress}
                    style={styles.iconTouchable}
                    hitSlop={{
                      top: getResponsiveHeight(0.6),
                      bottom: getResponsiveHeight(0.6),
                      left: getResponsiveWidth(1.2),
                      right: getResponsiveWidth(1.2),
                    }}
                    disabled={disabled}
                  >
                    <MaterialCommunityIcons
                      name={rightButtonIconName}
                      size={getResponsiveFontSize(16)} // Adjust size as needed
                      color={color}
                      style={[
                        {
                          opacity: disabled && !disableOpacityChange ? 0.5 : 1,
                        },
                        rightButtonIconStyle, // Apply custom style
                      ]}
                    />
                  </Pressable>
                )}
                {/* --- End Optional Right Button --- */}

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
                    <MaterialIcons
                      name="cancel"
                      size={getResponsiveFontSize(16)}
                      color={color}
                      style={{
                        opacity: disabled && !disableOpacityChange ? 0.5 : 1,
                      }}
                    />
                  </Pressable>
                )}

                {localValue.length > 0 && secureTextEntry && (
                  <Pressable
                    onPress={disabled ? undefined : onToggleSecureValue}
                    style={styles.iconTouchable}
                    hitSlop={{
                      top: getResponsiveHeight(0.6),
                      bottom: getResponsiveHeight(0.6),
                      left: getResponsiveWidth(1.2),
                      right: getResponsiveWidth(1.2),
                    }}
                    disabled={disabled}
                  >
                    <MaterialIcons
                      name={isSecure ? "visibility" : "visibility-off"}
                      size={getResponsiveWidth(4)}
                      color={color}
                      style={{
                        opacity: disabled && !disableOpacityChange ? 0.5 : 1,
                      }}
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
            </View>
          </Animated.View>
        </Pressable>

        {/* Animated error message container */}
        <Animated.View
          style={[styles.errorContainer, animatedErrorTextStyle]}
        >
          {isError && errorMessage && (
            <ThemedText
              style={[styles.errorText, { color: errorColor }, errorTextStyle]}
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

ThemedInput.displayName = "ThemedInput";

ThemedInput.defaultProps = {
  placeholder: "",
  secureTextEntry: false,
  keyboardType: "default",
  disabled: false,
  disableOpacityChange: false,
  required: false,
  // --- Default values for new props ---
  rightButtonIconName: undefined,
  onRightButtonPress: undefined,
  // --- End default values ---
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    width: "100%",
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: "column",
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    height: getResponsiveHeight(3.6),
    flex: 1,
    marginRight: getResponsiveWidth(2.4), // Ensure space before right icons
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(3.6), // Adjust gap if needed
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12), // Make it circular if desired
    overflow: "hidden",
    // Add padding if needed for better touch area
    // padding: getResponsiveWidth(1),
  },
  errorIconContainer: {
    // Removed marginLeft to rely on gap
    padding: getResponsiveWidth(0.5),
  },
  errorContainer: {
    height: 0, // Initially zero height
    marginHorizontal: getResponsiveWidth(4.8),
    justifyContent: "center",
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(2.2),
  },
});

export default ThemedInput;
