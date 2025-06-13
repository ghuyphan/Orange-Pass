import React, {
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useRef,
} from "react";
import { FAB } from "react-native-paper";
import {
  StyleProp,
  ViewStyle,
  View,
  StyleSheet,
  TextStyle,
  TouchableWithoutFeedback,
  BackHandler,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  withDelay,
  withSequence,
  useSharedValue,
} from "react-native-reanimated";
import { ThemedButton } from "./ThemedButton";
import { t } from "@/i18n";

// Centralized configuration for glassmorphism
const CONFIG = {
  blur: {
    intensity: 8,
  },
  colors: {
    light: {
      background: "rgba(255, 255, 255, 0.2)",
      border: "rgba(255, 255, 255, 0.3)",
    },
    dark: {
      background: "rgba(50, 50, 50, 0.25)",
      border: "rgba(255, 255, 255, 0.15)",
    },
  },
};

export interface FABAction {
  text?: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}

export interface ThemedFABProps {
  actions: FABAction[];
  mainIconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const ThemedFAB = forwardRef<View, ThemedFABProps>(
  (
    { actions, mainIconName = "plus", style, animatedStyle, textStyle },
    ref
  ) => {
    const { currentTheme } = useTheme();
    const [open, setOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const isAnimating = useSharedValue(false);

    const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const closingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useFocusEffect(
      React.useCallback(() => {
        const onBackPress = () => {
          if (open) {
            handleFABPress();
            return true;
          }
          return false;
        };

        const backHandlerSubscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);

        return () => backHandlerSubscription.remove();
      }, [open])
    );

    // This part remains the same
    const colors = useMemo(() => {
      const isLightTheme = currentTheme === "light";
      return {
        icon: isLightTheme ? Colors.light.icon : Colors.dark.icon,
        mainButtonBackground: isLightTheme
          ? Colors.light.buttonBackground
          : Colors.dark.buttonBackground,
        text: isLightTheme ? Colors.light.text : Colors.dark.text,
        glassBackground: isLightTheme
          ? CONFIG.colors.light.background
          : CONFIG.colors.dark.background,
        glassBorder: isLightTheme
          ? CONFIG.colors.light.border
          : CONFIG.colors.dark.border,
      };
    }, [currentTheme]);

    const animationConfig = useMemo(
      () => ({
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
      []
    );

    const backdropAnimatedStyle = useAnimatedStyle(
      () => ({
        opacity: withTiming(open ? 0.5 : 0, animationConfig),
      }),
      [open, animationConfig]
    );

    const translateY = useAnimatedStyle(
      () => ({
        transform: [
          {
            translateY: withTiming(open ? -30 : 0, {
              duration: 200,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
          },
        ],
      }),
      [open]
    );

    // --- FIX APPLIED HERE ---
    const useButtonAnimationStyle = (delay: number) => {
      return useAnimatedStyle(() => {
        // Animate the colors along with the other properties
        const backgroundColor = withTiming(
          colors.glassBackground,
          animationConfig
        );
        const borderColor = withTiming(colors.glassBorder, animationConfig);

        return {
          backgroundColor,
          borderColor,
          opacity: withDelay(
            delay,
            withTiming(open ? 1 : 0, animationConfig)
          ),
          transform: [
            {
              scale: withDelay(
                delay,
                withTiming(open ? 1 : 0.8, animationConfig)
              ),
            },
          ],
        };
      }, [open, colors]); // Add `colors` to the dependency array
    };

    // --- AND FIX APPLIED HERE ---
    const useTextAnimationStyle = (delay: number) => {
      return useAnimatedStyle(() => {
        // Animate the colors for the text background
        const backgroundColor = withTiming(
          colors.glassBackground,
          animationConfig
        );
        const borderColor = withTiming(colors.glassBorder, animationConfig);
        const textColor = withTiming(colors.text, animationConfig);

        return {
          backgroundColor,
          borderColor,
          // The text color itself is animated in the component below
          opacity: withDelay(
            delay,
            withTiming(open ? 1 : 0, animationConfig)
          ),
          transform: [
            {
              translateX: withDelay(
                delay,
                withTiming(open ? 0 : -20, animationConfig)
              ),
            },
          ],
        };
      }, [open, colors]); // Add `colors` to the dependency array
    };

    // --- AND ONE MORE FOR THE TEXT COLOR ---
    const useAnimatedTextColor = () => {
      return useAnimatedStyle(() => {
        return {
          color: withTiming(colors.text, animationConfig),
        };
      }, [colors]);
    };

    const delays = actions.map((_, index) => (index + 1) * 50);
    const buttonStyles = delays.map(useButtonAnimationStyle);
    const textBackgroundStyles = delays.map(useTextAnimationStyle);
    const animatedTextColorStyle = useAnimatedTextColor(); // Create one for all text

    useEffect(() => {
      if (!open) {
        closingTimeoutRef.current = setTimeout(() => {
          setClosing(false);
        }, animationConfig.duration * 2);
      } else {
        setClosing(true);
      }
      return () => {
        if (closingTimeoutRef.current) {
          clearTimeout(closingTimeoutRef.current);
        }
      };
    }, [open, animationConfig.duration]);

    useEffect(() => {
      return () => {
        if (animationTimeoutRef.current)
          clearTimeout(animationTimeoutRef.current);
        if (pressTimeoutRef.current) clearTimeout(pressTimeoutRef.current);
      };
    }, []);

    const handleFABPress = () => {
      if (isAnimating.value) return;
      isAnimating.value = true;
      setOpen(!open);
      animationTimeoutRef.current = setTimeout(() => {
        isAnimating.value = false;
      }, animationConfig.duration * 2);
    };

    const handlePressWithAnimation = (onPress: () => void) => () => {
      if (isAnimating.value) return;
      isAnimating.value = true;
      setOpen(false);
      pressTimeoutRef.current = setTimeout(() => {
        onPress();
        isAnimating.value = false;
      }, animationConfig.duration * 2);
    };

    return (
      <>
        {open && (
          <TouchableWithoutFeedback onPress={handleFABPress}>
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: "black", zIndex: 1 },
                backdropAnimatedStyle,
              ]}
            />
          </TouchableWithoutFeedback>
        )}

        <Animated.View
          style={[style, animatedStyle, styles.container]}
          ref={ref}
        >
          {(open || closing) && (
            <Animated.View style={translateY}>
              <View style={styles.buttonsWrapper}>
                {actions.map((action, index) =>
                  action.text ? (
                    <View key={action.iconName} style={styles.buttonRow}>
                      <Animated.View
                        style={[
                          styles.textBackground,
                          textBackgroundStyles[index], // Use the new animated style
                        ]}
                      >
                        <Animated.Text
                          style={[
                            styles.buttonText,
                            textStyle,
                            animatedTextColorStyle, // Use the new animated text color
                          ]}
                        >
                          {t(action.text)}
                        </Animated.Text>
                      </Animated.View>
                      <ThemedButton
                        style={[styles.fab]}
                        animatedStyle={buttonStyles[index]} // Use the new animated style
                        onPress={handlePressWithAnimation(action.onPress)}
                        iconName={action.iconName}
                        // The icon color is now handled by the animated style in ThemedButton
                        // assuming it can take an animated style for its icon.
                        // If not, you'd pass an animated prop. For now, we animate the background.
                        iconColor={colors.text}
                      />
                    </View>
                  ) : null
                )}
              </View>
            </Animated.View>
          )}
          <ThemedButton
            onPress={handleFABPress}
            iconName={open ? "close" : mainIconName}
            iconColor={colors.icon}
            iconSize={24}
            style={[styles.fab]}
          />
        </Animated.View>
      </>
    );
  }
);

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    width: "auto",
    pointerEvents: "box-none",
  },
  buttonsWrapper: {
    alignItems: "flex-end",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  fab: {
    padding: 10,
    marginLeft: 10,
    borderRadius: 100,
    borderWidth: 1,
    ...(Platform.OS === "ios" && {
      backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
    }),
  },
  textBackground: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    ...(Platform.OS === "ios" && {
      backdropFilter: `blur(${CONFIG.blur.intensity}px)`,
    }),
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
});

export default ThemedFAB;