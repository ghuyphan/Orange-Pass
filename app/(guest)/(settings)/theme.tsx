import React, { useCallback, useMemo } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { router } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { t } from "@/i18n";
import { Colors } from "@/constants/Colors";
import { STATUSBAR_HEIGHT } from "@/constants/Statusbar";
import { useTheme } from "@/context/ThemeContext";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import DARK from "@/assets/svgs/dark.svg";
import LIGHT from "@/assets/svgs/light.svg";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle"; // Import the new hook

const ThemeScreen = () => {
  const { currentTheme, setDarkMode, useSystemTheme, isDarkMode } = useTheme();
  const { overlayColor, borderColor } = useGlassStyle(); // Use the hook

  const colors = useMemo(
    () => (currentTheme === "light" ? Colors.light.icon : Colors.dark.icon),
    [currentTheme]
  );
  const sectionsColors = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
    [currentTheme]
  );

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const scrollThreshold = getResponsiveHeight(7);
  const translateYValue = -getResponsiveHeight(3.5);

  const titleContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, scrollThreshold],
      [0, translateYValue],
      Extrapolation.CLAMP
    );
    const opacity = withTiming(scrollY.value > scrollThreshold * 0.85 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > scrollThreshold * 0.75 ? 0 : 20,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const handleLightTheme = useCallback(() => {
    setDarkMode(false);
  }, [setDarkMode]);

  const handleDarkTheme = useCallback(() => {
    setDarkMode(true);
  }, [setDarkMode]);

  const handleSystemTheme = useCallback(() => {
    useSystemTheme();
  }, [useSystemTheme]);

  const renderThemeOption = useCallback(
    (themeName: string, iconName: string, isChecked: boolean) => (
      <Pressable
        onPress={() => {
          switch (themeName) {
            case "light":
              handleLightTheme();
              break;
            case "dark":
              handleDarkTheme();
              break;
            case "system":
              handleSystemTheme();
              break;
          }
        }}
        key={themeName}
      >
        <View style={styles.section}>
          <View style={styles.leftSectionContainer}>
            <MaterialCommunityIcons
              name={iconName}
              size={getResponsiveFontSize(18)}
              color={colors}
            />
            <ThemedText>{t(`themeScreen.${themeName}`)}</ThemedText>
          </View>
          {isChecked ? (
            <View style={styles.iconStack}>
              <MaterialCommunityIcons
                name="circle-outline"
                size={getResponsiveFontSize(18)}
                color={colors}
              />
              <MaterialIcons
                name="circle"
                size={getResponsiveFontSize(10)}
                color={colors}
                style={styles.checkIcon}
              />
            </View>
          ) : (
            <MaterialCommunityIcons
              name="circle-outline"
              size={getResponsiveFontSize(18)}
              color={colors}
            />
          )}
        </View>
      </Pressable>
    ),
    [colors, handleLightTheme, handleDarkTheme, handleSystemTheme]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />

      <Animated.View
        style={[styles.titleContainer, titleContainerStyle]}
        pointerEvents="auto"
      >
        <View style={styles.headerContainer}>
          <ThemedButton
            iconName="chevron-left"
            style={styles.titleButton}
            onPress={onNavigateBack}
          />
          <ThemedText type="title" style={styles.title}>
            {t("themeScreen.title")}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollContainer}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View
          style={[
            styles.descriptionContainer,
            { backgroundColor: sectionsColors, borderColor: borderColor },
          ]}
        >
          <View style={[styles.defaultOverlay, { backgroundColor: overlayColor }]} />
          <View style={styles.descriptionItem}>
            <LIGHT
              width={getResponsiveWidth(28)}
              height={getResponsiveHeight(14)}
            />
            <ThemedText>{t("themeScreen.light")}</ThemedText>
          </View>
          <View style={styles.descriptionItem}>
            <DARK
              width={getResponsiveWidth(28)}
              height={getResponsiveHeight(14)}
            />
            <ThemedText>{t("themeScreen.dark")}</ThemedText>
          </View>
        </View>

        <ThemedView
          style={[
            styles.sectionContainer,
            { backgroundColor: sectionsColors, borderColor: borderColor },
          ]}
        >
          <View style={[styles.defaultOverlay, { backgroundColor: overlayColor }]} />
          {renderThemeOption("light", "weather-sunny", isDarkMode === false)}
          {renderThemeOption("dark", "weather-night", isDarkMode === true)}
          {renderThemeOption("system", "cog", isDarkMode === undefined)}
        </ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
};

export default React.memo(ThemeScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveWidth(3.6),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
  },
  titleButton: {
    zIndex: 11,
  },
  blurContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingTop: getResponsiveHeight(18),
  },
  descriptionContainer: {
    flexDirection: "row",
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    overflow: "hidden",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: getResponsiveHeight(2),
    borderWidth: 1, // Added for glass effect
  },
  descriptionItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: getResponsiveHeight(1.2),
    flexDirection: "column",
    zIndex: 1, // Ensure content is above overlay
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    borderWidth: 1, // Added for glass effect
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0, // Ensure overlay is behind content
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(1.8),
    zIndex: 1, // Ensure content is above overlay
  },
  leftSectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  iconStack: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  checkIcon: {
    position: "absolute",
  },
});