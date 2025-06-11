import React, {
  useState,
  useMemo,
  forwardRef,
  useEffect,
} from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  View,
  Pressable,
  Image,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "../ThemedText";
import { ThemedView } from "../ThemedView";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import { getIconPath } from "@/utils/returnIcon";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle"; // Import the new hook

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

const SHIMMER_STRIP_WIDTH = getResponsiveWidth(25);
const SHIMMER_DURATION = 1500;
const LOADING_LINE_HEIGHT = getResponsiveHeight(0.25);

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
  isLoading?: boolean;
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
      isLoading = false,
    },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const { overlayColor, borderColor: glassBorderColor } = useGlassStyle(); // Use the hook
    const [displayValue, setDisplayValue] = useState(value);
    const [inputRowWidth, setInputRowWidth] = useState(0);

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
          borderColor: glassBorderColor, // Use border color from hook
        },
      ],
      [currentTheme, themedInputBackgroundColor, glassBorderColor]
    );

    const animatedBorderWidth = useSharedValue(
      isError && errorMessage ? getResponsiveWidth(0.3) : 0
    );
    const errorTextHeight = useSharedValue(0);
    const errorTextOpacity = useSharedValue(0);
    const errorShakeValue = useSharedValue(0);
    const shimmerProgress = useSharedValue(0);

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

    const shimmerGradientColors = useMemo(() => {
      const baseBg =
        currentTheme === "light"
          ? Colors.light.inputBackground
          : Colors.dark.inputBackground;
      const tint =
        currentTheme === "light" ? Colors.light.tint : Colors.dark.tint;

      const transparentVersion = (hex: string) => {
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
        return `rgba(${r}, ${g}, ${b}, 0.1)`;
      };

      const shimmerBase = transparentVersion(baseBg);
      const shimmerHighlight = tint;

      return [shimmerBase, shimmerHighlight, shimmerBase];
    }, [currentTheme]);

    const animatedLeftShimmerStyle = useAnimatedStyle(() => {
      if (inputRowWidth === 0) return { transform: [{ translateX: -10000 }] };
      const startX = inputRowWidth / 2 - SHIMMER_STRIP_WIDTH / 2;
      const endX = -SHIMMER_STRIP_WIDTH;
      const currentX = startX + shimmerProgress.value * (endX - startX);
      return {
        transform: [{ translateX: currentX }],
      };
    });

    const animatedRightShimmerStyle = useAnimatedStyle(() => {
      if (inputRowWidth === 0) return { transform: [{ translateX: 10000 }] };
      const startX = inputRowWidth / 2 - SHIMMER_STRIP_WIDTH / 2;
      const endX = inputRowWidth;
      const currentX = startX + shimmerProgress.value * (endX - startX);
      return {
        transform: [{ translateX: currentX }],
      };
    });

    useEffect(() => {
      if (isLoading && inputRowWidth > 0) {
        shimmerProgress.value = 0;
        shimmerProgress.value = withRepeat(
          withTiming(1, {
            duration: SHIMMER_DURATION,
            easing: Easing.linear,
          }),
          -1,
          false
        );
      } else {
        cancelAnimation(shimmerProgress);
        shimmerProgress.value = 0;
      }
    }, [isLoading, inputRowWidth, shimmerProgress]);

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
          <View
            style={[styles.defaultOverlay, { backgroundColor: overlayColor }]}
          />
          {!iconName && !logoCode && !isLoading && (
            <ThemedText style={[styles.label, { color }]} type="defaultSemiBold">
              {label}
            </ThemedText>
          )}

          <Pressable
            onPress={onPress}
            disabled={disabled || isLoading}
            style={styles.pressableContainer}
          >
            <Animated.View
              onLayout={(event) => {
                setInputRowWidth(event.nativeEvent.layout.width);
              }}
              style={[
                styles.inputRow,
                { borderBottomColor: errorColor },
                animatedBorderStyle,
              ]}
            >
              {isLoading && inputRowWidth > 0 && (
                <>
                  <AnimatedLinearGradient
                    style={[styles.shimmerStrip, animatedLeftShimmerStyle]}
                    colors={shimmerGradientColors}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    locations={[0.2, 0.5, 0.8]}
                  />
                  <AnimatedLinearGradient
                    style={[styles.shimmerStrip, animatedRightShimmerStyle]}
                    colors={shimmerGradientColors}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    locations={[0.2, 0.5, 0.8]}
                  />
                </>
              )}

              <View
                style={[
                  styles.inputContentContainer,
                  isLoading && styles.contentHidden,
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
                    !isLoading &&
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
                  {isError && errorMessage && !isLoading && (
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

        {!isLoading && (
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
    borderWidth: 1, // Default border for the glass effect
    overflow: "hidden", // Important for overlay's border radius
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0, // Ensure it's behind the content
  },
  pressableContainer: {
    width: "100%",
  },
  label: {
    fontSize: getResponsiveFontSize(13),
    marginBottom: getResponsiveHeight(0.5),
    zIndex: 1, // Ensure label is on top of the overlay
  },
  logoContainer: {
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(6),
  },
  logo: {
    width: "55%",
    height: "55%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: getResponsiveHeight(3.6),
    position: "relative",
    overflow: "hidden",
  },
  inputContentContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    zIndex: 1,
  },
  contentHidden: {
    opacity: 0.3,
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
  shimmerStrip: {
    position: "absolute",
    bottom: 0,
    height: LOADING_LINE_HEIGHT,
    width: SHIMMER_STRIP_WIDTH,
    zIndex: 0,
  },
});

export default ThemedDisplayInput;