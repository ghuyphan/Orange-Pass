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
  groupPosition?: "single" | "top" | "middle" | "bottom";
  showSeparator?: boolean;
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
      onChangeText = () => { },
      onBlur = () => { },
      onFocus = () => { },
      onSubmitEditing = () => { },
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

    // Animation values
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);
    const errorBackgroundOpacity = useSharedValue(0);
    const groupErrorBorderWidth = useSharedValue(0);

    useEffect(() => {
      animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
    }, [disabled, disableOpacityChange]);

    useEffect(() => {
      const shouldShowError = isError && errorMessage;
      const shouldShowIndividualError =
        shouldShowError &&
        ((groupPosition === "single") ||
          (groupPosition !== "single" && showIndividualErrors));

      if (shouldShowIndividualError) {
        errorTextHeight.value = withTiming(getResponsiveHeight(2.2), {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        errorTextOpacity.value = withTiming(1, { duration: 250 });
        errorShakeValue.value = withSequence(
          withTiming(-getResponsiveWidth(0.8), { duration: 50 }),
          withTiming(getResponsiveWidth(0.8), { duration: 50 }),
          withTiming(-getResponsiveWidth(0.5), { duration: 50 }),
          withTiming(getResponsiveWidth(0.5), { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }

      // Error background tint
      if (shouldShowError) {
        errorBackgroundOpacity.value = withTiming(0.04, { duration: 200 });
      } else {
        errorBackgroundOpacity.value = withTiming(0, { duration: 200 });
      }

      // Group error border for single inputs
      if (shouldShowError && groupPosition === "single") {
        groupErrorBorderWidth.value = withTiming(getResponsiveWidth(0.25), {
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
      backgroundColor: `rgba(${currentTheme === "light" ? "220, 53, 69" : "248, 81, 73"
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

    // Grouping styles
    const getGroupedStyles = () => {
      const radius = getResponsiveWidth(3.5);

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
        minHeight: label ? getResponsiveHeight(4.8) : getResponsiveHeight(3.8),
      },
      getGroupedStyles(),
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

          <View style={styles.inputRow}>
            {iconName && (
              <MaterialCommunityIcons
                name={iconName}
                size={getResponsiveFontSize(15)}
                color={placeholderColor}
                style={[styles.leftIcon, iconStyle]}
              />
            )}

            <TextInput
              ref={textInputRef}
              onSubmitEditing={onSubmitEditing}
              style={[
                styles.input,
                {
                  color: disabled ? placeholderColor : color,
                  marginLeft: iconName ? getResponsiveWidth(2) : 0,
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
              textAlignVertical="center"
            />

            <View style={styles.rightContainer}>
              {rightButtonIconName && onRightButtonPress && (
                <Pressable
                  onPress={handleRightButtonPress}
                  style={styles.iconButton}
                  hitSlop={styles.hitSlop}
                  disabled={disabled}
                >
                  <MaterialCommunityIcons
                    name={rightButtonIconName}
                    size={getResponsiveFontSize(15)}
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
                  style={styles.iconButton}
                  hitSlop={styles.hitSlop}
                  disabled={disabled}
                >
                  <MaterialIcons
                    name="cancel"
                    size={getResponsiveFontSize(15)}
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
                  style={styles.iconButton}
                  hitSlop={styles.hitSlop}
                  disabled={disabled}
                >
                  <MaterialIcons
                    name={isSecure ? "visibility" : "visibility-off"}
                    size={getResponsiveFontSize(15)}
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
                    name="error"
                    size={getResponsiveFontSize(15)}
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
        {groupPosition === "single" ? (
          <Animated.View
            style={[styles.inputGroupWrapper, animatedSingleWrapperStyle]}
          >
            {InputContent}
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
                  numberOfLines={2}
                >
                  {errorMessage}
                </ThemedText>
              )}
            </Animated.View>
          </Animated.View>
        ) : (
          <>
            {InputContent}
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
                  numberOfLines={2}
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

// Input Group Component
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
        getResponsiveHeight(2.2) * displayErrors.length +
        (hasMoreErrors ? getResponsiveHeight(2.2) : 0) +
        getResponsiveHeight(0.8);

      errorTextHeight.value = withTiming(estimatedHeight, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      });
      errorTextOpacity.value = withTiming(1, { duration: 250 });
      groupErrorBorderWidth.value = withTiming(getResponsiveWidth(0.25), {
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
      showIndividualErrors: false,
      suppressGroupErrorBorder: true,
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
                name="error"
                size={getResponsiveFontSize(13)}
                color={errorColor}
                style={styles.errorIcon}
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
                size={getResponsiveFontSize(13)}
                color={errorColor}
                style={styles.errorIcon}
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
    marginBottom: getResponsiveHeight(1),
  },
  groupContainer: {
    flexDirection: "column",
    width: "100%",
    marginBottom: getResponsiveHeight(1),
  },
  inputGroupWrapper: {
    flexDirection: "column",
    width: "100%",
    borderRadius: getResponsiveWidth(3.5),
    overflow: "hidden",
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    flexDirection: "column",
    borderWidth: 1,
    justifyContent: "center",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  separator: {
    position: "absolute",
    bottom: 0,
    left: getResponsiveWidth(3.5),
    right: getResponsiveWidth(3.5),
    height: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  labelContainer: {
    zIndex: 1,
    marginBottom: getResponsiveHeight(1),
  },
  label: {
    fontSize: getResponsiveFontSize(12),
    opacity: 0.7,
    lineHeight: getResponsiveHeight(2),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
    minHeight: getResponsiveHeight(2.8),
  },
  leftIcon: {
    marginRight: getResponsiveWidth(2),
  },
  input: {
    fontSize: getResponsiveFontSize(15),
    flex: 1,
    paddingVertical: 0,
    lineHeight: getResponsiveHeight(2.2),
    includeFontPadding: false,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: getResponsiveWidth(2),
  },
  iconButton: {
    padding: getResponsiveWidth(0.5),
    marginLeft: getResponsiveWidth(1.5),
    borderRadius: getResponsiveWidth(2),
  },
  hitSlop: {
    top: getResponsiveHeight(0.5),
    bottom: getResponsiveHeight(0.5),
    left: getResponsiveWidth(1),
    right: getResponsiveWidth(1),
  },
  errorIconContainer: {
    marginLeft: getResponsiveWidth(1.5),
    padding: getResponsiveWidth(0.5),
  },
  errorContainer: {
    marginHorizontal: getResponsiveWidth(3.5),
    marginTop: getResponsiveHeight(0.5),
    justifyContent: "center",
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(1.8),
  },
  consolidatedErrorContainer: {
    marginHorizontal: getResponsiveWidth(3.5),
    marginTop: getResponsiveHeight(0.8),
    paddingVertical: getResponsiveHeight(0.3),
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: getResponsiveHeight(0.3),
  },
  errorIcon: {
    marginRight: getResponsiveWidth(1.2),
    marginTop: getResponsiveHeight(0.1),
  },
  consolidatedErrorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(1.8),
    flex: 1,
  },
});

export default ThemedInput;