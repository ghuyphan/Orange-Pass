import React, {
  useMemo,
  useState,
  useEffect,
  forwardRef,
  useRef,
  useCallback,
} from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
  withDelay,
  useSharedValue,
} from "react-native-reanimated";

// Assuming these are defined in your project
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { ThemedButton } from "./ThemedButton";
import { t } from "@/i18n";
import { BlurView } from "@sbaiahmed1/react-native-blur";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Centralized configuration for glassmorphism
const CONFIG = {
  blur: {
    // This intensity is for the iOS-only `backdropFilter` and is not used by BlurView component.
    // The `blurAmount` prop on the component will be used instead.
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

    const animationTimeoutRef = useRef<number | null>(null);
    const pressTimeoutRef = useRef<number | null>(null);
    const closingTimeoutRef = useRef<number | null>(null);

    // Your original handleFABPress function, wrapped in useCallback for dependency array.
    const handleFABPress = useCallback(() => {
      if (isAnimating.value) return;
      isAnimating.value = true;
      setOpen(o => !o);
      animationTimeoutRef.current = setTimeout(() => {
        isAnimating.value = false;
      }, 200 * 2);
    }, [isAnimating]);

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
      }, [open, handleFABPress])
    );

    // Your original colors memoization
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

    // Your original animation configuration
    const animationConfig = useMemo(
      () => ({
        duration: 200,
        easing: Easing.out(Easing.cubic),
      }),
      []
    );

    // --- BACKDROP FIX STARTS HERE ---
    // Corrected backdrop animation style. Animates opacity from 0 to 1.
    const backdropAnimatedStyle = useAnimatedStyle(
      () => ({
        opacity: withTiming(open ? 1 : 0, { duration: 300 }),
      }),
      [open]
    );

    // State to control pointerEvents for the backdrop container.
    // This is more performant than conditionally rendering the whole block.
    const [pointerEvents, setPointerEvents] = useState<'none' | 'auto'>('none');
    useEffect(() => {
        if (open) {
            setPointerEvents('auto');
        } else {
            const timer = setTimeout(() => setPointerEvents('none'), 300);
            return () => clearTimeout(timer);
        }
    }, [open]);
    // --- BACKDROP FIX ENDS HERE ---
    
    // All your original animation hooks and logic below are untouched.
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

    const useButtonAnimationStyle = (delay: number) => {
      return useAnimatedStyle(() => {
        const backgroundColor = withTiming(
          colors.glassBackground,
          animationConfig
        );
        return {
          backgroundColor,
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
      }, [open, colors]);
    };

    const useTextAnimationStyle = (delay: number) => {
      return useAnimatedStyle(() => {
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
              translateX: withDelay(
                delay,
                withTiming(open ? 0 : -20, animationConfig)
              ),
            },
          ],
        };
      }, [open, colors]);
    };

    const useAnimatedTextColor = () => {
      return useAnimatedStyle(() => {
        return {
          color: withTiming('#fff', animationConfig),
        };
      }, [colors]);
    };

    const delays = actions.map((_, index) => (index + 1) * 50);
    const buttonStyles = delays.map(useButtonAnimationStyle);
    const textBackgroundStyles = delays.map(useTextAnimationStyle);
    const animatedTextColorStyle = useAnimatedTextColor();

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
        {/* --- BACKDROP FIX: Correctly implemented backdrop --- */}
        <View style={[StyleSheet.absoluteFill, { zIndex: 1, pointerEvents }]}>
            {pointerEvents === 'auto' && (
                <TouchableWithoutFeedback onPress={handleFABPress}>
                    <AnimatedBlurView
                        blurType={currentTheme === 'dark' ? "dark" : "dark"}
                        blurAmount={10} // Control blur intensity here
                        style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}
                    />
                </TouchableWithoutFeedback>
            )}
        </View>

        {/* The rest of your component's JSX remains untouched */}
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
                          textBackgroundStyles[index],
                        ]}
                      >
                        <Animated.Text
                          style={[
                            styles.buttonText,
                            textStyle,
                            animatedTextColorStyle,
                          ]}
                        >
                          {t(action.text)}
                        </Animated.Text>
                      </Animated.View>
                      <ThemedButton
                        style={[styles.fab]}
                        animatedStyle={buttonStyles[index]}
                        onPress={handlePressWithAnimation(action.onPress)}
                        iconName={action.iconName}
                        iconColor={'#fff'}
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
            style={[styles.fab, {backgroundColor: colors.mainButtonBackground, padding: 12, marginBottom: 10}]}
          />
        </Animated.View>
      </>
    );
  }
);

ThemedFAB.displayName = "ThemedFAB";

// Original styles, with the non-functional `backdropFilter` removed for clarity.
const styles = StyleSheet.create({
  container: {
    // position: 'absolute',
    // bottom: 30,
    // right: 30,
    alignItems: "flex-end",
    zIndex: 2,
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
  },
  textBackground: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
});

export default ThemedFAB;
