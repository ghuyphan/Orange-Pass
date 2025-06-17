import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Pressable,
  TextStyle,
  View,
  Platform,
} from "react-native";
import { ThemedText } from "../ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle, GlassIntensity } from "@/hooks/useGlassStyle";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- Helper Components (Extracted for Performance) ---
// (CloudWithIndicator component remains unchanged)
type CloudWithIndicatorProps = {
  indicatorName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize: number;
  cloudColor: string;
  indicatorBackgroundColor: string;
  indicatorIconColor: string;
  animated?: boolean;
};

const CloudWithIndicator = React.memo(
  ({
    indicatorName,
    iconSize,
    cloudColor,
    indicatorBackgroundColor,
    indicatorIconColor,
    animated = false,
  }: CloudWithIndicatorProps) => {
    const rotation = useSharedValue(0);

    useEffect(() => {
      if (animated) {
        rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1);
      } else {
        rotation.value = 0;
      }
    }, [animated, rotation]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="cloud"
          size={iconSize}
          color={cloudColor}
          style={styles.baseIcon}
        />
        <Animated.View
          style={[
            styles.syncIndicator,
            animated ? animatedStyle : undefined,
            { backgroundColor: indicatorBackgroundColor },
          ]}
        >
          <MaterialCommunityIcons
            name={indicatorName}
            size={iconSize * 0.58}
            color={indicatorIconColor}
          />
        </Animated.View>
      </View>
    );
  }
);

// --- Main Component ---

export type ThemedButtonProps = {
  ref?: React.RefObject<React.ElementRef<typeof Pressable>>;
  label?: string;
  loadingLabel?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  pointerEvents?: "auto" | "none";
  textStyle?: StyleProp<TextStyle>;
  syncStatus?: "idle" | "syncing" | "synced" | "error";
  debounceTime?: number;
  variant?: "default" | "solid" | "glass" | "outline" | "text";
  outline?: boolean;
  glassIntensity?: GlassIntensity;
  borderColor?: string;
  borderWidth?: number;
};

export function ThemedButton({
  ref,
  label,
  iconName,
  iconColor,
  iconSize = getResponsiveWidth(5),
  onPress,
  onPressIn,
  onPressOut,
  style = {},
  animatedStyle = {},
  disabled = false,
  loading = false,
  loadingColor,
  pointerEvents = "auto",
  textStyle,
  syncStatus,
  debounceTime = 300,
  variant = "default",
  outline = false,
  glassIntensity = "medium",
  borderColor,
  borderWidth = 1,
}: ThemedButtonProps): JSX.Element {
  const glassStyle = useGlassStyle(
    variant === "glass" ? "strong" : glassIntensity
  );
  const iconThemeColor = useThemeColor(
    { light: Colors.light.icon, dark: Colors.dark.icon },
    "icon"
  );
  const solidBackgroundColor = useThemeColor(
    {
      light: Colors.light.buttonBackground,
      dark: Colors.dark.buttonBackground,
    },
    "buttonBackground"
  );
  const { currentTheme } = useTheme();

  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  const [currentIcon, setCurrentIcon] = useState({ iconName, syncStatus });
  const iconOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const newIconState = { iconName, syncStatus };
    const hasIconChanged =
      currentIcon.iconName !== newIconState.iconName ||
      currentIcon.syncStatus !== newIconState.syncStatus;

    if (hasIconChanged) {
      iconOpacity.value = withTiming(0, { duration: 150 });
      iconScale.value = withTiming(0.8, { duration: 150 });

      setTimeout(() => {
        runOnJS(setCurrentIcon)(newIconState);
        iconOpacity.value = withTiming(1, { duration: 150 });
        iconScale.value = withTiming(1, { duration: 150 });
      }, 150);
    }
  }, [iconName, syncStatus, iconOpacity, iconScale]);

  const indicatorIconColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.background
        : Colors.dark.background,
    [currentTheme]
  );

  const displayedIconColor = useMemo(() => {
    if (currentIcon.syncStatus === "error") {
      return currentTheme === "light"
        ? Colors.light.error
        : Colors.dark.error;
    }
    return iconColor || iconThemeColor;
  }, [currentIcon.syncStatus, currentTheme, iconColor, iconThemeColor]);

  const textColor = displayedIconColor;
  const isVisuallyDisabled = disabled || loading || syncStatus === "syncing";
  const isButtonDisabled = isVisuallyDisabled || isDebouncing;

  const buttonStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const baseStyle: ViewStyle = {
      ...styles.touchable,
      opacity: isVisuallyDisabled ? 0.7 : 1,
    };
    if (outline) {
      return [
        baseStyle,
        {
          backgroundColor: "transparent",
          borderWidth: borderWidth,
          borderColor: Colors.light.icon,
        },
        style,
      ];
    }
    if (variant === "text") {
      return [baseStyle, { backgroundColor: "transparent" }, style];
    }
    switch (variant) {
      case "solid":
        return [
          baseStyle,
          { backgroundColor: solidBackgroundColor },
          style,
        ];
      case "glass":
        return [
          baseStyle,
          {
            backgroundColor: glassStyle.background,
            ...glassStyle.getGlassBorder(),
            ...(Platform.OS === "ios" && { backdropFilter: "blur(10px)" }),
          },
          glassStyle.getGlassShadow(),
          style,
        ];
      case "outline":
        return [
          baseStyle,
          {
            backgroundColor: "transparent",
            borderWidth: borderWidth,
            borderColor: borderColor || displayedIconColor,
          },
          style,
        ];
      default:
        return [
          baseStyle,
          {
            backgroundColor: glassStyle.background,
            ...glassStyle.getGlassBorder(),
          },
          glassStyle.getGlassShadow(),
          style,
        ];
    }
  }, [
    isVisuallyDisabled,
    variant,
    outline,
    glassStyle,
    style,
    borderWidth,
    borderColor,
    displayedIconColor,
    solidBackgroundColor,
  ]);

  const combinedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  // --- REFINED ANIMATION & PRESS LOGIC ---

  const handlePress = useCallback(() => {
    // If debounce is disabled, fire immediately.
    if (debounceTime === 0) {
      onPress();
      return;
    }
    // Otherwise, use the debounce logic.
    if (isDebouncing) return;
    onPress();
    setIsDebouncing(true);
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceTime);
  }, [onPress, isDebouncing, debounceTime]);

  const handlePressIn = useCallback(() => {
    // Use timing for a fast, predictable press-in
    pressScale.value = withTiming(0.95, { duration: 100 });
    onPressIn?.();
  }, [onPressIn, pressScale]);

  const handlePressOut = useCallback(() => {
    // Use spring for a natural, bouncy release
    pressScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    onPressOut?.();
  }, [onPressOut, pressScale]);

  const renderIcon = () => {
    // ... (renderIcon logic is unchanged)
    const { syncStatus: status, iconName: name } = currentIcon;
    if (status) {
      if (status === "error") {
        return (
          <MaterialCommunityIcons
            name="cloud-alert"
            size={iconSize}
            color={displayedIconColor}
          />
        );
      }
      const indicatorMap: Record<
        string,
        keyof typeof MaterialCommunityIcons.glyphMap
      > = { idle: "sync", syncing: "sync", synced: "check" };
      return (
        <CloudWithIndicator
          indicatorName={indicatorMap[status]}
          iconSize={iconSize}
          cloudColor={displayedIconColor}
          indicatorBackgroundColor={displayedIconColor}
          indicatorIconColor={indicatorIconColor}
          animated={status === "syncing"}
        />
      );
    }
    return name ? (
      <MaterialCommunityIcons
        name={name}
        size={iconSize}
        color={displayedIconColor}
      />
    ) : null;
  };

  return (
    <AnimatedPressable
      ref={ref}
      pointerEvents={pointerEvents}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isButtonDisabled}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[buttonStyle, animatedStyle, combinedAnimatedStyle]}
      hitSlop={{
        top: getResponsiveHeight(1.2),
        bottom: getResponsiveHeight(1.2),
        left: getResponsiveWidth(2.4),
        right: getResponsiveWidth(2.4),
      }}
    >
      {variant === "default" && (
        <View
          style={[styles.defaultOverlay, glassStyle.getGlassOverlay()]}
        />
      )}
      <Animated.View style={iconAnimatedStyle}>
        {loading ? (
          <ActivityIndicator
            size={getResponsiveFontSize(23)}
            color={loadingColor || textColor}
          />
        ) : (
          <View style={styles.contentContainer}>
            {renderIcon()}
            {label && (
              <ThemedText
                style={[styles.label, { color: textColor }, textStyle]}
                type="defaultSemiBold"
              >
                {label}
              </ThemedText>
            )}
          </View>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // ... (styles are unchanged)
  touchable: {
    padding: getResponsiveWidth(2),
    borderRadius: getResponsiveWidth(100),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: getResponsiveWidth(1.2),
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: getResponsiveWidth(100),
  },
  label: {
    fontSize: getResponsiveFontSize(16),
    zIndex: 1,
  },
  iconContainer: {
    position: "relative",
    width: getResponsiveWidth(4.5),
    height: getResponsiveWidth(4.5),
    alignItems: "center",
    justifyContent: "center",
  },
  baseIcon: {
    position: "absolute",
  },
  syncIndicator: {
    position: "absolute",
    bottom: getResponsiveWidth(-0.5),
    right: getResponsiveWidth(-0.5),
    padding: getResponsiveWidth(0.2),
    borderRadius: getResponsiveWidth(100),
    alignItems: "center",
    justifyContent: "center",
  },
});