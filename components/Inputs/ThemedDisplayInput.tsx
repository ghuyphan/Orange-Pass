import React, {
  useState,
  useMemo,
  forwardRef,
  useEffect
} from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Image
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // Added import
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors"; // Assuming your Colors are here
import { getIconPath } from "@/utils/returnIcon";
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
  withRepeat,
  cancelAnimation,
  interpolateColor, // Though not used for gradient colors directly here, good to have if needed
} from "react-native-reanimated";

// Create an animatable version of LinearGradient
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SHIMMER_STRIP_WIDTH = getResponsiveWidth(25); // Width of the moving gradient strip
const SHIMMER_DURATION = 1500; // Duration of one shimmer pass

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
  isLoading?: boolean; // Added isLoading prop
};

export const ThemedDisplayInput = forwardRef<View, ThemedDisplayInputProps>(
  (
    {
      iconName,
      logoCode,
      label,
      placeholder,
      value = "",
      style,
      isError = false,
      errorMessage = "",
      onPress = () => {},
      onClear = () => {},
      showClearButton = true,
      disabled = false,
      backgroundColor,
      isLoading = false, // Added isLoading prop
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [displayValue, setDisplayValue] = useState(value);
    const [inputRowWidth, setInputRowWidth] = useState(0);

    // Color configurations
    const color =
      currentTheme === "light" ? Colors.light.text : Colors.dark.text;
    const placeholderColor =
      currentTheme === "light"
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder;
    const errorColor =
      currentTheme === "light" ? Colors.light.error : Colors.dark.error;
    const iconPath = useMemo(() => getIconPath(logoCode ?? ""), [logoCode]);

    const themedInputBackgroundColor =
      backgroundColor ??
      (currentTheme === "light"
        ? Colors.light.inputBackground
        : Colors.dark.inputBackground);

    const inputContainerStyle = useMemo(
      () => [
        styles.inputContainer,
        {
          backgroundColor: themedInputBackgroundColor,
        },
      ],
      [currentTheme, themedInputBackgroundColor] // Use themedInputBackgroundColor
    );

    // --- Reanimated Shared Values ---
    const animatedBorderWidth = useSharedValue(
      isError && errorMessage ? getResponsiveWidth(0.3) : 0
    );
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);
    const shimmerTranslateX = useSharedValue(-SHIMMER_STRIP_WIDTH); // For loading shimmer

    // --- Reanimated Styles ---
    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderBottomWidth: animatedBorderWidth.value,
    }));

    const animatedErrorTextStyle = useAnimatedStyle(() => ({
      height: errorTextHeight.value,
      opacity: errorTextOpacity.value,
      overflow: "hidden",
    }));

    const animatedErrorIconStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: errorShakeValue.value }],
    }));

    // --- Shimmer Gradient Animation ---
    const shimmerGradientColors = useMemo(() => {
      const baseBg =
        currentTheme === "light"
          ? Colors.light.inputBackground
          : Colors.dark.inputBackground;
      const tint =
        currentTheme === "light" ? Colors.light.tint : Colors.dark.tint;

      // Make baseBg transparent for the shimmer effect
      const transparentVersion = (hex: string, alpha: number = 0) => {
        let r = 0,
          g = 0,
          b = 0;
        if (hex.length === 4) {
          r = parseInt(hex[1] + hex[1], 16);
          g = parseInt(hex[2] + hex[2], 16);
          b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
          r = parseInt(hex[1] + hex[2], 16);
          g = parseInt(hex[3] + hex[4], 16);
          b = parseInt(hex[5] + hex[6], 16);
        }
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      // Using a slightly visible base for a more subtle shimmer over the input's actual background
      const shimmerBase = transparentVersion(baseBg, 0.1);
      const shimmerHighlight = tint;

      return [shimmerBase, shimmerHighlight, shimmerBase];
    }, [currentTheme]);

    const animatedShimmerStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: shimmerTranslateX.value }],
      };
    });

    useEffect(() => {
      if (isLoading && inputRowWidth > 0) {
        shimmerTranslateX.value = -SHIMMER_STRIP_WIDTH; // Start off-screen left
        shimmerTranslateX.value = withRepeat(
          withTiming(inputRowWidth, {
            duration: SHIMMER_DURATION,
            easing: Easing.linear,
          }),
          -1, // Loop indefinitely
          false // Don't reverse, restart from the beginning
        );
      } else {
        cancelAnimation(shimmerTranslateX);
        shimmerTranslateX.value = -SHIMMER_STRIP_WIDTH; // Reset/hide
      }
    }, [isLoading, inputRowWidth, shimmerTranslateX]); // Added shimmerTranslateX

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
    }, [isError, errorMessage, animatedBorderWidth, errorTextHeight, errorTextOpacity, errorShakeValue]); // Added dependencies

    // Update local display value when the external prop changes
    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleClear = () => {
      setDisplayValue("");
      onClear();
    };

    return (
      <View style={[styles.container, style]}>
        <ThemedView style={inputContainerStyle}>
          {!iconName && !logoCode && !isLoading && ( // Hide label if loading
            <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}

          <Pressable
            onPress={onPress}
            disabled={disabled || isLoading} // Disable pressable when loading
            style={styles.pressableContainer}
          >
            <Animated.View
              onLayout={(event) => {
                setInputRowWidth(event.nativeEvent.layout.width);
              }}
              style={[
                styles.inputRow,
                {
                  borderBottomColor: errorColor,
                  overflow: "hidden", // Important for containing the shimmer
                },
                animatedBorderStyle,
              ]}
            >
              {/* Shimmer Gradient - Rendered first to be in the background */}
              {isLoading && inputRowWidth > 0 && (
                <AnimatedLinearGradient
                  style={[styles.shimmerGradient, animatedShimmerStyle]}
                  colors={shimmerGradientColors}
                  start={{ x: 0, y: 0.5 }} // Horizontal gradient
                  end={{ x: 1, y: 0.5 }}
                  locations={[0.2, 0.5, 0.8]} // Adjust for desired shimmer appearance
                />
              )}

              {/* Input Content - Optionally hide or fade when loading */}
              <View style={[styles.inputContentContainer, isLoading && styles.contentHidden]}>
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
                      marginLeft:
                        iconName || logoCode ? getResponsiveWidth(2.4) : 0,
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
                    !isLoading && // Hide clear button when loading
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
                  {isError && errorMessage && !isLoading && ( // Hide error icon when loading
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
        </ThemedView>

        {/* Animated error message container */}
        {!isLoading && ( // Hide error message when loading
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
        )}
      </View>
    );
  }
);

ThemedDisplayInput.displayName = "ThemedDisplayInput";

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
  },
  inputContainer: {
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    flexDirection: "column",
  },
  pressableContainer: {
    width: "100%",
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    marginBottom: getResponsiveHeight(0.5),
  },
  logoContainer: {
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(6),
    // marginRight: getResponsiveWidth(0), // Kept original, adjust if needed
  },
  logo: {
    width: "55%",
    height: "55%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: getResponsiveHeight(3.6),
    position: "relative", // For absolute positioning of shimmer
  },
  inputContentContainer: { // Wrapper for content that can be hidden
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contentHidden: {
    opacity: 0.3, // Or 0 to completely hide
  },
  input: {
    fontSize: getResponsiveFontSize(16),
    flex: 1,
    marginRight: getResponsiveWidth(2.4),
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  iconTouchable: {
    borderRadius: getResponsiveWidth(12),
    overflow: "hidden",
  },
  errorIconContainer: {
    marginLeft: getResponsiveWidth(1.2),
    padding: getResponsiveWidth(0.5),
  },
  errorContainer: {
    marginHorizontal: getResponsiveWidth(4.8),
    justifyContent: "center",
  },
  errorText: {
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveHeight(2.2),
  },
  shimmerGradient: {
    position: "absolute",
    top: 0,
    left: 0, // translateX will move it
    height: "100%",
    width: SHIMMER_STRIP_WIDTH,
    zIndex: 0, // Ensure it's behind content if content isn't hidden
  },
});

export default ThemedDisplayInput;
