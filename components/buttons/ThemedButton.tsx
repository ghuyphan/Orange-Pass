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
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- Config for the "Frosted Glass" variant ---
const GLASS_VARIANT_CONFIG = {
  background: Platform.select({
    ios: "rgba(255, 255, 255, 0.1)",
    android: "rgba(255, 255, 255, 0.15)",
  }),
  borderColor: "rgba(255, 255, 255, 0.2)",
  blur: 10,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
};

export type ThemedButtonProps = {
  ref?: React.RefObject<React.ElementRef<typeof Pressable>>;
  lightColor?: string;
  darkColor?: string;
  label?: string;
  loadingLabel?: string;
  iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  underlayColor?: string;
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
  outline?: boolean;
  borderColor?: string;
  borderWidth?: number;
  variant?: "default" | "glass";
};

export function ThemedButton({
  ref,
  lightColor,
  darkColor,
  label,
  loadingLabel,
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
  outline = false,
  borderWidth = 1,
  variant = "default",
}: ThemedButtonProps): JSX.Element {
  const { overlayColor, borderColor } = useGlassStyle();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const icon = useThemeColor(
    { light: Colors.light.icon, dark: Colors.dark.icon },
    "icon"
  );
  const { currentTheme } = useTheme();

  // Debounce state
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Icon transition state
  const [currentIcon, setCurrentIcon] = useState<{
    name?: keyof typeof MaterialCommunityIcons.glyphMap;
    syncStatus?: "idle" | "syncing" | "synced" | "error";
  }>({ name: iconName, syncStatus });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Animation values
  const iconOpacity = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle icon changes with animation
  useEffect(() => {
    const newIconState = { name: iconName, syncStatus };
    const hasIconChanged =
      currentIcon.name !== newIconState.name ||
      currentIcon.syncStatus !== newIconState.syncStatus;

    if (hasIconChanged && !isTransitioning) {
      setIsTransitioning(true);
      
      // Animate out current icon
      iconOpacity.value = withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(1, { duration: 150 }, (finished) => {
          if (finished) {
            runOnJS(setIsTransitioning)(false);
          }
        })
      );
      
      iconScale.value = withSequence(
        withTiming(0.8, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      // Update icon after fade out starts
      setTimeout(() => {
        setCurrentIcon(newIconState);
      }, 75);
    }
  }, [iconName, syncStatus, currentIcon, isTransitioning, iconOpacity, iconScale]);

  // Colors
  const displayedIconColor = useMemo(() => {
    if (variant === "glass") {
      return "#FFFFFF";
    }
    if (currentIcon.syncStatus === "error") {
      return currentTheme === "light"
        ? Colors.light.error
        : Colors.dark.error;
    }
    return iconColor ? iconColor : icon;
  }, [variant, currentIcon.syncStatus, currentTheme, iconColor, icon]);

  const buttonBackgroundColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.buttonBackground
        : Colors.dark.buttonBackground,
    [currentTheme]
  );

  const textColor = useMemo(() => {
    if (variant === "glass") {
      return "#FFFFFF";
    }
    return color;
  }, [variant, color]);

  const outlineBorderColor = useMemo(
    () => borderColor || buttonBackgroundColor,
    [borderColor, buttonBackgroundColor]
  );

  // --- Animation for sync icon ---
  useEffect(() => {
    if (currentIcon.syncStatus === "syncing") {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [currentIcon.syncStatus, rotation]);

  const syncAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  // Debounced onPress handler
  const handlePress = useCallback(() => {
    if (isDebouncing) return;
    onPress();
    setIsDebouncing(true);
    debounceTimerRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceTime);
  }, [onPress, isDebouncing, debounceTime]);

  const isButtonDisabled =
    disabled || loading || currentIcon.syncStatus === "syncing" || isDebouncing;

  // Button style
  const buttonStyle = useMemo(() => {
    const baseStyle = { opacity: isButtonDisabled ? 0.7 : 1 };

    if (variant === "glass") {
      return [
        styles.touchable,
        baseStyle,
        {
          backgroundColor: GLASS_VARIANT_CONFIG.background,
          borderWidth: 1,
          borderColor: GLASS_VARIANT_CONFIG.borderColor,
          ...(Platform.OS === "ios" && {
            backdropFilter: `blur(${GLASS_VARIANT_CONFIG.blur}px)`,
          }),
        },
        GLASS_VARIANT_CONFIG.shadow,
      ];
    }

    if (outline) {
      return [
        styles.touchable,
        baseStyle,
        {
          backgroundColor: "transparent",
          borderWidth: borderWidth,
          borderColor: outlineBorderColor,
        },
      ];
    }

    return [
      styles.touchable,
      baseStyle,
      {
        backgroundColor: buttonBackgroundColor,
        borderWidth: 1,
        borderColor: borderColor,
      },
    ];
  }, [
    isButtonDisabled,
    variant,
    outline,
    borderWidth,
    outlineBorderColor,
    buttonBackgroundColor,
  ]);

  // Cloud with indicator
  type CloudWithIndicatorProps = {
    indicatorName: keyof typeof MaterialCommunityIcons.glyphMap;
    animated?: boolean;
  };

  const CloudWithIndicator: React.FC<CloudWithIndicatorProps> = ({
    indicatorName,
    animated = false,
  }) => (
    <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
      <MaterialCommunityIcons
        name="cloud"
        size={iconSize}
        color={displayedIconColor}
        style={styles.baseIcon}
      />
      <Animated.View
        style={[
          styles.syncIndicator,
          animated ? syncAnimatedStyle : undefined,
          {
            backgroundColor: "transparent",
          },
        ]}
      >
        <MaterialCommunityIcons
          name={indicatorName}
          size={iconSize * 0.58}
          color={displayedIconColor}
        />
      </Animated.View>
    </Animated.View>
  );

  // Render icon
  const renderIcon = () => {
    if (currentIcon.syncStatus) {
      switch (currentIcon.syncStatus) {
        case "idle":
          return <CloudWithIndicator indicatorName="sync" />;
        case "syncing":
          return <CloudWithIndicator indicatorName="sync" animated />;
        case "synced":
          return <CloudWithIndicator indicatorName="check" />;
        case "error":
          return (
            <Animated.View style={iconAnimatedStyle}>
              <MaterialCommunityIcons
                name="cloud-alert"
                size={iconSize}
                color={displayedIconColor}
              />
            </Animated.View>
          );
      }
    }
    return currentIcon.name ? (
      <Animated.View style={iconAnimatedStyle}>
        <MaterialCommunityIcons
          name={currentIcon.name}
          size={iconSize}
          color={displayedIconColor}
        />
      </Animated.View>
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
      accessibilityHint={`Press to ${label}`}
      style={[buttonStyle, style, animatedStyle]}
      hitSlop={{
        top: getResponsiveHeight(1.2),
        bottom: getResponsiveHeight(1.2),
        left: getResponsiveWidth(2.4),
        right: getResponsiveWidth(2.4),
      }}
    >
      {variant === "default" && !outline && (
        <View style={[styles.defaultOverlay, { backgroundColor: overlayColor }]} />
      )}
      {loading ? (
        <ActivityIndicator
          size={getResponsiveFontSize(23)}
          color={loadingColor ? loadingColor : textColor}
        />
      ) : (
        <>
          {renderIcon()}
          {label && (
            <ThemedText
              style={[styles.label, { color: textColor }, textStyle]}
              type="defaultSemiBold"
            >
              {label}
            </ThemedText>
          )}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  touchable: {
    padding: getResponsiveWidth(2),
    borderRadius: getResponsiveWidth(12),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: getResponsiveWidth(1.2),
    overflow: "hidden",
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: getResponsiveWidth(12),
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
    zIndex: 1,
  },
  baseIcon: {
    position: "absolute",
  },
  syncIndicator: {
    position: "absolute",
    bottom: getResponsiveWidth(-0.5),
    right: getResponsiveWidth(-0.5),
    padding: getResponsiveWidth(0.05),
    borderRadius: getResponsiveWidth(100),
  },
});