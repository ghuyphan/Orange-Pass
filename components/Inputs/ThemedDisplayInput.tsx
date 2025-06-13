import React, {
  useState,
  useMemo,
  forwardRef,
  useEffect,
  useCallback,
} from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Image,
  TextStyle
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "../ThemedText";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import { getIconPath } from "@/utils/returnIcon";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  withRepeat,
  cancelAnimation,
} from "react-native-reanimated";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export type ThemedDisplayInputProps = {
  // Core Display Props
  label?: string;
  value?: string;
  placeholder?: string;

  // Iconography
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  logoCode?: string;

  // Interaction & Modes
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onClear?: () => void;
  showClearButton?: boolean;

  // Error Handling
  isError?: boolean;
  errorMessage?: string;

  // Styling
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<TextStyle>;
  errorTextStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  required?: boolean;

  // Grouping Props
  groupPosition?: "single" | "top" | "middle" | "bottom";
};

export const ThemedDisplayInput = forwardRef<View, ThemedDisplayInputProps>(
  (
    {
      // Core
      label,
      value = "",
      placeholder,
      // Icons
      iconName,
      logoCode,
      // Modes
      isLoading = false,
      disabled = false,
      onPress = () => { },
      onClear = () => { },
      showClearButton = true,
      // Error
      isError = false,
      errorMessage = "",
      // Styling
      style,
      inputStyle,
      labelStyle,
      iconStyle,
      errorTextStyle,
      backgroundColor,
      required = false,
      // Grouping
      groupPosition = "single",
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const { overlayColor, borderColor: glassBorderColor } = useGlassStyle();
    const [inputWidth, setInputWidth] = useState(0);

    // --- Setup Colors & Icons ---
    const color =
      currentTheme === "light" ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === "light"
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder;
    const errorColor =
      currentTheme === "light" ? Colors.light.error : Colors.dark.error;
    const iconPath = getIconPath(logoCode ?? "");

    // --- Animations ---
    const animatedOpacity = useSharedValue(1);
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);
    const errorBackgroundOpacity = useSharedValue(0);
    const groupErrorBorderWidth = useSharedValue(0);
    const shimmerProgress = useSharedValue(-1);

    // --- Effects ---
    useEffect(() => {
      const targetOpacity = disabled && !isLoading ? 0.5 : 1;
      animatedOpacity.value = withTiming(targetOpacity, { duration: 200 });
    }, [disabled, isLoading]);

    useEffect(() => {
      const shouldShowError = isError && errorMessage;
      if (shouldShowError && groupPosition === "single") {
        errorTextHeight.value = withTiming(getResponsiveHeight(2.2), {
          duration: 200,
        });
        errorTextOpacity.value = withTiming(1, { duration: 250 });
        errorShakeValue.value = withSequence(
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-2, { duration: 50 }),
          withTiming(2, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      } else {
        errorTextHeight.value = withTiming(0, { duration: 150 });
        errorTextOpacity.value = withTiming(0, { duration: 100 });
      }

      errorBackgroundOpacity.value = withTiming(shouldShowError ? 0.04 : 0, {
        duration: 200,
      });
      groupErrorBorderWidth.value = withTiming(
        shouldShowError && groupPosition === "single"
          ? getResponsiveWidth(0.25)
          : 0,
        { duration: 200 }
      );
    }, [isError, errorMessage, groupPosition]);

    useEffect(() => {
      if (isLoading && inputWidth > 0) {
        shimmerProgress.value = withRepeat(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      } else {
        cancelAnimation(shimmerProgress);
        shimmerProgress.value = withTiming(-1, { duration: 300 });
      }
    }, [isLoading, inputWidth]);

    // --- Animated Styles ---
    const animatedContainerStyle = useAnimatedStyle(() => ({
      opacity: animatedOpacity.value,
    }));
    const animatedErrorBackgroundStyle = useAnimatedStyle(() => ({
      backgroundColor: `rgba(${currentTheme === "light" ? "220, 53, 69" : "248, 81, 73"
        }, ${errorBackgroundOpacity.value})`,
    }));
    const animatedErrorTextStyle = useAnimatedStyle(() => ({
      height: errorTextHeight.value,
      opacity: errorTextOpacity.value,
    }));
    const animatedErrorIconStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: errorShakeValue.value }],
    }));
    const animatedSingleWrapperStyle = useAnimatedStyle(() => ({
      borderBottomWidth: groupErrorBorderWidth.value,
      borderBottomColor: errorColor,
    }));
    const animatedShimmerStyle = useAnimatedStyle(() => {
      const shimmerWidth = inputWidth * 0.8;
      const translateX =
        (shimmerProgress.value - 0.5) * (inputWidth + shimmerWidth);
      return {
        width: shimmerWidth,
        transform: [{ translateX }],
        opacity: isLoading ? 1 : 0,
      };
    });
    const animatedContentStyle = useAnimatedStyle(() => ({
      opacity: withTiming(isLoading ? 0.3 : 1),
    }));

    // --- Style Computations ---
    const getGroupedStyles = () => {
      switch (groupPosition) {
        case "top":
          return styles.groupTop;
        case "middle":
          return styles.groupMiddle;
        case "bottom":
          return styles.groupBottom;
        default:
          return styles.groupSingle;
      }
    };

    const isEffectivelyDisabled = disabled || isLoading;
    const hasValue = value.length > 0;

    const containerStyle = [
      styles.container,
      groupPosition !== "single" && { marginBottom: 0 },
      style,
    ];

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
    ];

    // --- Render Logic ---
    const InputContent = (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={isEffectivelyDisabled}
        style={[inputContainerStyle, animatedContainerStyle]}
        onLayout={(e) => setInputWidth(e.nativeEvent.layout.width)}
      >
        {/* Overlays */}
        <View
          style={[styles.defaultOverlay, { backgroundColor: overlayColor }]}
        />
        <Animated.View
          style={[styles.defaultOverlay, animatedErrorBackgroundStyle]}
        />

        <Animated.View style={[styles.contentWrapper, animatedContentStyle]}>
          {/* Label */}
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

          {/* Main Content */}
          <View style={styles.inputRow}>
            {iconName && (
              <MaterialCommunityIcons
                name={iconName}
                size={getResponsiveFontSize(16)}
                color={placeholderColor}
                style={[styles.leftIcon, iconStyle]}
              />
            )}
            {logoCode && (
              <View style={styles.logoContainer}>
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
                { color: hasValue ? color : placeholderColor },
                inputStyle,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {hasValue ? value : placeholder}
            </ThemedText>

            {/* Right Icons */}
            <View style={styles.rightContainer}>
              {showClearButton && hasValue && !isEffectivelyDisabled && (
                <Pressable
                  onPress={onClear}
                  style={styles.iconButton}
                  hitSlop={styles.hitSlop}
                >
                  <MaterialIcons
                    name="cancel"
                    size={getResponsiveFontSize(16)}
                    color={color}
                  />
                </Pressable>
              )}
              {isError && errorMessage && !isLoading && (
                <Animated.View style={animatedErrorIconStyle}>
                  <MaterialIcons
                    name="error-outline"
                    size={getResponsiveFontSize(16)}
                    color={errorColor}
                  />
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Loading Shimmer */}
        {isLoading && (
          <AnimatedLinearGradient
            style={[styles.shimmer, animatedShimmerStyle]}
            colors={[`${color}00`, `${color}33`, `${color}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        )}
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
          InputContent
        )}
      </View>
    );
  }
);

ThemedDisplayInput.displayName = "ThemedDisplayInput";

const styles = StyleSheet.create({
  // --- Containers ---
  container: { width: "100%", marginBottom: getResponsiveHeight(1) },
  inputGroupWrapper: {
    borderRadius: getResponsiveWidth(3.5),
    overflow: "hidden",
    marginBottom: getResponsiveHeight(1),
  },
  inputContainer: {
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  contentWrapper: {
    paddingHorizontal: getResponsiveWidth(3.5),
    paddingVertical: getResponsiveHeight(1.2),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: getResponsiveHeight(2.8),
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2),
    marginLeft: getResponsiveWidth(2),
  },
  // --- Grouping Styles ---
  groupSingle: { borderRadius: getResponsiveWidth(3.5) },
  groupTop: {
    borderTopLeftRadius: getResponsiveWidth(3.5),
    borderTopRightRadius: getResponsiveWidth(3.5),
  },
  groupMiddle: { borderRadius: 0 },
  groupBottom: {
    borderBottomLeftRadius: getResponsiveWidth(3.5),
    borderBottomRightRadius: getResponsiveWidth(3.5),
  },
  // --- Elements ---
  labelContainer: { marginBottom: getResponsiveHeight(1) },
  label: {
    fontSize: getResponsiveFontSize(12),
    opacity: 0.7,
    lineHeight: getResponsiveHeight(2),
  },
  input: {
    fontSize: getResponsiveFontSize(15),
    flex: 1,
    lineHeight: getResponsiveHeight(2.4),
  },
  // --- Icons ---
  leftIcon: { marginRight: getResponsiveWidth(2.5) },
  logoContainer: {
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(6),
    marginRight: getResponsiveWidth(2.5),
  },
  logo: { width: "55%", height: "55%" },
  iconButton: { padding: getResponsiveWidth(0.5) },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  // --- Overlays & Effects ---
  defaultOverlay: { ...StyleSheet.absoluteFillObject, zIndex: -2 },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: getResponsiveHeight(0.25),
    zIndex: 1,
  },
  // --- Error States ---
  errorContainer: {
    marginHorizontal: getResponsiveWidth(3.5),
    marginTop: getResponsiveHeight(0.5),
    justifyContent: "center",
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(1.8),
  },
});

export default ThemedDisplayInput;