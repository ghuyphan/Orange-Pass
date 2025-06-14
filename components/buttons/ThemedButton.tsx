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

type CloudWithIndicatorProps = {
  indicatorName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconSize: number;
  cloudColor: string;
  indicatorBackgroundColor: string;
  indicatorIconColor: string;
  animated?: boolean;
};

// Memoized to prevent re-renders when props are unchanged.
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

    // Animate only when needed
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
  style?: StyleProp<ViewStyle>;
  animatedStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
  pointerEvents?: "auto" | "none";
  textStyle?: StyleProp<TextStyle>;
  syncStatus?: "idle" | "syncing" | "synced" | "error";
  debounceTime?: number;
  variant?: "default" | "solid" | "glass" | "outline";
  outline?: boolean; // Restored for convenience
  glassIntensity?: GlassIntensity;
  borderColor?: string;
  borderWidth?: number;
};

export function ThemedButton({
  ref,
  label,
  iconName,
  iconColor,
  iconSize = getResponsiveWidth(4.5),
  onPress,
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

  // State for managing icon transitions
  const [currentIcon, setCurrentIcon] = useState({ iconName, syncStatus });
  const iconOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Animate icon changes (cross-fade effect)
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

  // --- Memoized Values ---

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

  const isButtonDisabled =
    disabled || loading || syncStatus === "syncing" || isDebouncing;

  // --- Styles ---

  const buttonStyle = useMemo<StyleProp<ViewStyle>>(() => {
    const baseStyle: ViewStyle = {
      ...styles.touchable,
      opacity: isButtonDisabled ? 0.7 : 1,
    };

    // The 'outline' prop takes precedence for convenience/backward compatibility
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

    // If outline is false, we use the variant
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
      default: // 'default' variant remains the frosted glass effect
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
    isButtonDisabled,
    variant,
    outline,
    glassStyle,
    style,
    borderWidth,
    borderColor,
    displayedIconColor,
    solidBackgroundColor,
  ]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  // --- Handlers and Renderers ---

  const handlePress = useCallback(() => {
    if (isDebouncing) return;
    onPress();
    setIsDebouncing(true);
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceTime);
  }, [onPress, isDebouncing, debounceTime]);

  const renderIcon = () => {
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
      > = {
        idle: "sync",
        syncing: "sync",
        synced: "check",
      };
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
      disabled={isButtonDisabled}
      accessible
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[buttonStyle, animatedStyle]}
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