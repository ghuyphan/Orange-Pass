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
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "../ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

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
  /**
   * Defines the input's position within a group to adjust border radius.
   * 'single': (Default) A standalone input with all corners rounded.
   * 'top': The first input in a group, with top corners rounded.
   * 'middle': An input in the middle of a group, with no rounded corners.
   * 'bottom': The last input in a group, with bottom corners rounded.
   */
  groupPosition?: "single" | "top" | "middle" | "bottom";
  /**
   * If true, shows a thin separator line at the bottom.
   * Automatically applied for 'top' and 'middle' group positions.
   */
  showSeparator?: boolean;
  /**
   * Group-level error handling - prevents individual borders from breaking group appearance
   */
  groupId?: string;
  showIndividualErrors?: boolean;
  suppressGroupErrorBorder?: boolean;
};

export type InputGroupError = {
  inputId: string;
  message: string;
  label?: string;
};

export type InputGroupProps = {
  children: React.ReactElement<ThemedInputProps>[];
  errors?: InputGroupError[];
  style?: StyleProp<ViewStyle>;
  showConsolidatedErrors?: boolean;
  errorContainerStyle?: StyleProp<ViewStyle>;
  maxErrorsToShow?: number;
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
      groupPosition = "single",
      showSeparator,
      groupId,
      showIndividualErrors = true,
      suppressGroupErrorBorder = false,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const { overlayColor, borderColor: glassBorderColor } = useGlassStyle();
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
    const separatorColor =
      currentTheme === "light"
        ? "rgba(0, 0, 0, 0.08)"
        : "rgba(255, 255, 255, 0.08)";

    const textInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        textInputRef.current?.focus();
      },
    }));

    const targetOpacity = disabled && !disableOpacityChange ? 0.5 : 1;
    const animatedOpacity = useSharedValue(targetOpacity);

    // Individual error text handling
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);

    // Error background tint for inputs with errors
    const errorBackgroundOpacity = useSharedValue(0);

    // Group error border for single inputs (like InputGroup)
    const groupErrorBorderWidth = useSharedValue(0);

    useEffect(() => {
      animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
    }, [disabled, disableOpacityChange]);

    useEffect(() => {
      // Handle individual error text for single inputs
      if (isError && errorMessage && groupPosition === "single") {
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
      } else if (
        isError &&
        errorMessage &&
        groupPosition !== "single" &&
        showIndividualErrors
      ) {
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
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }

      // Error background tint for all inputs with errors
      if (isError) {
        errorBackgroundOpacity.value = withTiming(0.05, { duration: 200 });
      } else {
        errorBackgroundOpacity.value = withTiming(0, { duration: 200 });
      }

      // Group-style error border for single inputs
      if (isError && errorMessage && groupPosition === "single") {
        groupErrorBorderWidth.value = withTiming(getResponsiveWidth(0.3), {
          duration: 200,
        });
      } else {
        groupErrorBorderWidth.value = withTiming(0, { duration: 200 });
      }
    }, [isError, errorMessage, groupPosition, showIndividualErrors]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
      opacity: animatedOpacity.value,
    }));

    const animatedSingleWrapperStyle = useAnimatedStyle(() => ({
      borderBottomWidth: groupErrorBorderWidth.value,
      borderBottomColor: errorColor,
    }));

    const animatedErrorTextStyle = useAnimatedStyle(() => ({
      height: errorTextHeight.value,
      opacity: errorTextOpacity.value,
      overflow: "hidden",
    }));

    const animatedErrorIconStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: errorShakeValue.value }],
    }));

    const animatedErrorBackgroundStyle = useAnimatedStyle(() => ({
      backgroundColor: `rgba(${
        currentTheme === "light" ? "220, 53, 69" : "248, 81, 73"
      }, ${errorBackgroundOpacity.value})`,
    }));

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
      if (onDisabledPress) onDisabledPress();
    }, [onDisabledPress]);

    const handleRightButtonPress = useCallback(() => {
      if (onRightButtonPress && !disabled) onRightButtonPress();
    }, [onRightButtonPress, disabled]);

    // Improved grouping logic
    const getGroupedStyles = () => {
      const radius = getResponsiveWidth(4);

      switch (groupPosition) {
        case "top":
          return {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottomWidth: 0,
          };
        case "middle":
          return {
            borderRadius: 0,
            borderTopWidth: 0,
            borderBottomWidth: 0,
          };
        case "bottom":
          return {
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: radius,
            borderBottomRightRadius: radius,
            borderTopWidth: 0,
          };
        case "single":
        default:
          return {
            borderRadius: radius,
          };
      }
    };

    const shouldShowSeparator =
      (showSeparator === undefined
        ? groupPosition === "top" || groupPosition === "middle"
        : showSeparator) && !isError;

    const inputContainerStyle = [
      styles.inputContainer,
      {
        backgroundColor:
          backgroundColor ??
          (currentTheme === "light"
            ? Colors.light.inputBackground
            : Colors.dark.inputBackground),
        borderColor: glassBorderColor,
      },
      getGroupedStyles(),
      // Add proper height for labels
      label && { minHeight: label ? getResponsiveHeight(6.5) : getResponsiveHeight(4.5) },
    ];

    const containerStyle = [
      styles.container,
      groupPosition !== "single" && { marginBottom: 0 },
      style,
    ];

    const InputContent = (
      <Pressable
        style={{ width: "100%" }}
        onPress={disabled ? handleDisabledPress : undefined}
        disabled={!disabled}
      >
        <Animated.View style={[inputContainerStyle, animatedContainerStyle]}>
          <View
            style={[styles.defaultOverlay, { backgroundColor: overlayColor }]}
          />

          <Animated.View
            style={[styles.defaultOverlay, animatedErrorBackgroundStyle]}
          />

          {shouldShowSeparator && (
            <View
              style={[styles.separator, { backgroundColor: separatorColor }]}
            />
          )}

          {label && (
            <View style={styles.labelContainer}>
              <ThemedText
                style={[styles.label, { color }, labelStyle]}
                type="defaultSemiBold"
              >
                {label}
                {required && (
                  <ThemedText style={{ color: errorColor }}> *</ThemedText>
                )}
              </ThemedText>
            </View>
          )}

          <View style={[styles.inputRow, label && styles.inputRowWithLabel]}>
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
                  style={[styles.errorIconContainer, animatedErrorIconStyle]}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={getResponsiveWidth(4)}
                    color={errorColor}
                  />
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );

    return (
      <View style={containerStyle}>
        {/* For single inputs, wrap in group-like container */}
        {groupPosition === "single" ? (
          <Animated.View
            style={[styles.inputGroupWrapper, animatedSingleWrapperStyle]}
          >
            {InputContent}
            {/* Error text inside the wrapper for single inputs */}
            <Animated.View
              style={[styles.errorContainer, animatedErrorTextStyle]}
            >
              {isError && errorMessage && (
                <ThemedText
                  style={[
                    styles.errorText,
                    { color: errorColor },
                    errorTextStyle,
                  ]}
                  numberOfLines={1}
                >
                  {errorMessage}
                </ThemedText>
              )}
            </Animated.View>
          </Animated.View>
        ) : (
          <>
            {InputContent}
            {/* Error text outside for grouped inputs when showIndividualErrors is true */}
            <Animated.View
              style={[styles.errorContainer, animatedErrorTextStyle]}
            >
              {isError && errorMessage && showIndividualErrors && (
                <ThemedText
                  style={[
                    styles.errorText,
                    { color: errorColor },
                    errorTextStyle,
                  ]}
                  numberOfLines={1}
                >
                  {errorMessage}
                </ThemedText>
              )}
            </Animated.View>
          </>
        )}
      </View>
    );
  }
);

// Input Group Component for managing multiple inputs with consolidated errors
export const InputGroup: React.FC<InputGroupProps> = ({
  children,
  errors = [],
  style,
  showConsolidatedErrors = true,
  errorContainerStyle,
  maxErrorsToShow = 3,
}) => {
  const { currentTheme } = useTheme();
  const errorColor =
    currentTheme === "light" ? Colors.light.error : Colors.dark.error;

  const errorTextHeight = useSharedValue(0);
  const errorTextOpacity = useSharedValue(0);
  const groupErrorBorderWidth = useSharedValue(0);

  const hasErrors = errors.length > 0;
  const displayErrors = errors.slice(0, maxErrorsToShow);
  const hasMoreErrors = errors.length > maxErrorsToShow;

  useEffect(() => {
    if (hasErrors && showConsolidatedErrors) {
      const estimatedHeight =
        getResponsiveHeight(2.5) * displayErrors.length +
        (hasMoreErrors ? getResponsiveHeight(2.5) : 0) +
        getResponsiveHeight(1); // padding

      errorTextHeight.value = withTiming(estimatedHeight, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      errorTextOpacity.value = withTiming(1, { duration: 250 });
      groupErrorBorderWidth.value = withTiming(getResponsiveWidth(0.3), {
        duration: 200,
      });
    } else {
      errorTextHeight.value = withTiming(0, { duration: 150 });
      errorTextOpacity.value = withTiming(0, { duration: 100 });
      groupErrorBorderWidth.value = withTiming(0, { duration: 200 });
    }
  }, [hasErrors, showConsolidatedErrors, displayErrors.length, hasMoreErrors]);

  const animatedErrorContainerStyle = useAnimatedStyle(() => ({
    height: errorTextHeight.value,
    opacity: errorTextOpacity.value,
    overflow: "hidden",
  }));

  const animatedGroupBorderStyle = useAnimatedStyle(() => ({
    borderBottomWidth: groupErrorBorderWidth.value,
    borderBottomColor: errorColor,
  }));

  // Clone children with group-specific props
  const enhancedChildren = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child)) return child;

    const childError = errors.find(
      (error) =>
        error.inputId === child.props.label?.toLowerCase() ||
        error.inputId === `input-${index}`
    );

    return React.cloneElement(child, {
      ...child.props,
      isError: !!childError || child.props.isError,
      errorMessage: childError?.message || child.props.errorMessage,
      showIndividualErrors: false, // Suppress individual errors in favor of consolidated
      suppressGroupErrorBorder: true, // Let the group handle the border
    });
  });

  return (
    <View style={[styles.groupContainer, style]}>
      <Animated.View
        style={[styles.inputGroupWrapper, animatedGroupBorderStyle]}
      >
        {enhancedChildren}
      </Animated.View>

      {showConsolidatedErrors && (
        <Animated.View
          style={[
            styles.consolidatedErrorContainer,
            animatedErrorContainerStyle,
            errorContainerStyle,
          ]}
        >
          {displayErrors.map((error, index) => (
            <View key={`${error.inputId}-${index}`} style={styles.errorRow}>
              <MaterialIcons
                name="error-outline"
                size={getResponsiveFontSize(14)}
                color={errorColor}
                style={{ marginRight: getResponsiveWidth(1.5) }}
              />
              <ThemedText
                style={[styles.consolidatedErrorText, { color: errorColor }]}
                numberOfLines={2}
              >
                {error.label
                  ? `${error.label}: ${error.message}`
                  : error.message}
              </ThemedText>
            </View>
          ))}

          {hasMoreErrors && (
            <View style={styles.errorRow}>
              <MaterialIcons
                name="more-horiz"
                size={getResponsiveFontSize(14)}
                color={errorColor}
                style={{ marginRight: getResponsiveWidth(1.5) }}
              />
              <ThemedText
                style={[styles.consolidatedErrorText, { color: errorColor }]}
              >
                +{errors.length - maxErrorsToShow} more error
                {errors.length - maxErrorsToShow > 1 ? "s" : ""}
              </ThemedText>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

ThemedInput.displayName = "ThemedInput";

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    width: "100%",
  },
  groupContainer: {
    flexDirection: "column",
    width: "100%",
    marginBottom: getResponsiveHeight(1),
  },
  inputGroupWrapper: {
    flexDirection: "column",
    width: "100%",
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    marginBottom: getResponsiveHeight(1),
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    flexDirection: "column",
    borderWidth: 1,
    overflow: "hidden",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  separator: {
    position: "absolute",
    bottom: 0,
    left: getResponsiveWidth(4.8),
    right: getResponsiveWidth(4.8),
    height: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  labelContainer: {
    zIndex: 1,
    marginBottom: getResponsiveHeight(0.5),
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  inputRowWithLabel: {
    marginTop: 0, // Remove the margin since we have labelContainer spacing
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
  consolidatedErrorContainer: {
    marginHorizontal: getResponsiveWidth(4.8),
    marginTop: getResponsiveHeight(1),
    paddingVertical: getResponsiveHeight(0.5),
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: getResponsiveHeight(0.5),
  },
  consolidatedErrorText: {
    fontSize: getResponsiveFontSize(12),
    lineHeight: getResponsiveHeight(2.2),
    flex: 1,
  },
});

export default ThemedInput;