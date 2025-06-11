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
import GB from "@/assets/svgs/GB.svg";
import VN from "@/assets/svgs/VN.svg";
import RU from "@/assets/svgs/RU.svg";
import { useLocale } from "@/context/LocaleContext";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMMKVString } from "react-native-mmkv";
import { useTheme } from "@/context/ThemeContext";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

const LanguageScreen = () => {
  const { updateLocale } = useLocale();
  const [locale] = useMMKVString("locale");
  const scrollY = useSharedValue(0);

  const { overlayColor, borderColor } = useGlassStyle();

  const { currentTheme: theme } = useTheme();
  const colors = useMemo(
    () => (theme === "light" ? Colors.light.icon : Colors.dark.icon),
    [theme]
  );
  const sectionsColors = useMemo(
    () =>
      theme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
    [theme]
  );

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

  const handleLanguageChange = useCallback(
    (newLocale: string) => {
      updateLocale(newLocale);
    },
    [updateLocale]
  );

  const handleSystemLocale = useCallback(() => {
    updateLocale(undefined);
  }, [updateLocale]);

  const renderLanguageOption = useCallback(
    (language: string, flag: React.ReactNode, localeCode: string) => (
      <Pressable
        onPress={() => handleLanguageChange(localeCode)}
        key={localeCode}
      >
        <View style={styles.section}>
          <View style={styles.leftSectionContainer}>
            <View style={styles.flagIconContainer}>{flag}</View>
            <ThemedText>{t(`languageScreen.${language}`)}</ThemedText>
          </View>
          {locale === localeCode ? (
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
    [locale, colors, handleLanguageChange]
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />
      <Animated.View
        style={[styles.titleContainer, titleContainerStyle]}
        pointerEvents="auto"
      >
        <View style={styles.headerContainer}>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="chevron-left"
              style={styles.titleButton}
              onPress={onNavigateBack}
            />
          </View>
          <ThemedText style={styles.title} type="title">
            {t("languageScreen.title")}
          </ThemedText>
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={styles.scrollContainer}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View
          style={[styles.sectionContainer, { backgroundColor: sectionsColors, borderColor: borderColor }]}
        >
          <View style={[styles.defaultOverlay]} />
          {renderLanguageOption(
            "vietnamese",
            <VN
              width={getResponsiveWidth(7.2)}
              height={getResponsiveHeight(3)}
            />,
            "vi"
          )}
          {renderLanguageOption(
            "russian",
            <RU
              width={getResponsiveWidth(7.2)}
              height={getResponsiveHeight(3)}
            />,
            "ru"
          )}
          {renderLanguageOption(
            "english",
            <GB
              width={getResponsiveWidth(7.2)}
              height={getResponsiveHeight(3)}
            />,
            "en"
          )}

          <Pressable onPress={handleSystemLocale}>
            <View style={styles.section}>
              <View style={styles.leftSectionContainer}>
                <View style={[styles.iconContainer]}>
                  <MaterialCommunityIcons
                    name="cog-outline"
                    size={getResponsiveFontSize(18)}
                    color={colors}
                  />
                </View>
                <ThemedText>{t("languageScreen.system")}</ThemedText>
              </View>
              {locale === undefined ? (
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
        </View>
      </Animated.ScrollView>
    </ThemedView>
  );
};

export default React.memo(LanguageScreen);

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
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    borderWidth: 1,
    // borderColor: DEFAULT_OVERLAY_CONFIG.borderColor,
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: DEFAULT_OVERLAY_CONFIG.overlayColor,
    zIndex: 0,
  },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    zIndex: 1,
  },
  leftSectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  flagIconContainer: {
    width: getResponsiveWidth(4.8),
    aspectRatio: 1,
    borderRadius: getResponsiveWidth(12),
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  iconContainer: {
    width: getResponsiveWidth(4.8),
    aspectRatio: 1,
    borderRadius: getResponsiveWidth(12),
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
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