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
  TextStyle,
} from "react-native";
import { ViewStyle } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle"; // Import the new hook

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
  rightButtonIconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightButtonPress?: () => void;
  rightButtonIconStyle?: StyleProp<TextStyle>;
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
      rightButtonIconName,
      onRightButtonPress,
      rightButtonIconStyle,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const { overlayColor, borderColor: glassBorderColor } = useGlassStyle(); // Use the hook
    const [localValue, setLocalValue] = useState(value);
    const [isSecure, setIsSecure] = useState(secureTextEntry);
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

    const targetOpacity = disabled && !disableOpacityChange ? 0.5 : 1;

    const animatedOpacity = useSharedValue(targetOpacity);
    const animatedBorderWidth = useSharedValue(
      isError && errorMessage ? getResponsiveWidth(0.3) : 0
    );
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);

    useEffect(() => {
      animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
    }, [disabled, disableOpacityChange]);

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
        animatedOpacity.value = withTiming(1, { duration: 200 });
      },
      [onFocus, animatedOpacity]
    );

    const handleDisabledPress = useCallback(() => {
      if (onDisabledPress) {
        onDisabledPress();
      }
    }, [onDisabledPress]);

    const handleRightButtonPress = useCallback(() => {
      if (onRightButtonPress && !disabled) {
        onRightButtonPress();
      }
    }, [onRightButtonPress, disabled]);

    const inputContainerStyle = [
      styles.inputContainer,
      {
        backgroundColor:
          backgroundColor ??
          (currentTheme === "light"
            ? Colors.light.inputBackground
            : Colors.dark.inputBackground),
        borderColor: glassBorderColor, // Use border color from hook
        borderBottomColor: errorColor, // Error color will override bottom border
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
          <Animated.View
            style={[inputContainerStyle, animatedContainerStyle]}
          >
            <View
              style={[
                styles.defaultOverlay,
                { backgroundColor: overlayColor },
              ]}
            />
            {label && (
              <ThemedText
                style={[styles.label, { color }, labelStyle]}
                type="defaultSemiBold"
              >
                {label}
                {required && (
                  <ThemedText style={{ color: "red" }}> *</ThemedText>
                )}
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
                cursorColor={color}
              />

              <View style={styles.rightContainer}>
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
                      size={getResponsiveFontSize(16)}
                      color={color}
                      style={[
                        {
                          opacity: disabled && !disableOpacityChange ? 0.5 : 1,
                        },
                        rightButtonIconStyle,
                      ]}
                    />
                  </Pressable>
                )}

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
    borderWidth: 1, // Default border for the glass effect
    overflow: "hidden", // Important for overlay's border radius
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0, // Ensure it's behind the content
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    opacity: 0.6,
    zIndex: 1, // Ensure label is on top of the overlay
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1, // Ensure input row is on top of the overlay
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    height: getResponsiveHeight(3.6),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(3.6),
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12),
    overflow: "hidden",
  },
  errorIconContainer: {
    padding: getResponsiveWidth(0.5),
  },
  errorContainer: {
    height: 0,
    marginHorizontal: getResponsiveWidth(4.8),
    justifyContent: "center",
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(2.2),
  },
});

export default ThemedInput;