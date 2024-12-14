import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useTheme } from '@/context/ThemeContext';
// import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DARK from '@/assets/svgs/dark.svg';
import LIGHT from '@/assets/svgs/light.svg';

const ThemeScreen = () => {
  const { currentTheme, setDarkMode, useSystemTheme, isDarkMode } = useTheme();
  const colors = useMemo(() => (currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon), [currentTheme]);
  const sectionsColors = useMemo(() => (
    currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground
  ), [currentTheme]);

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 140], [0, -35], Extrapolation.CLAMP);
    const opacity = withTiming(scrollY.value > 70 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 50 ? 0 : 20,
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

  const HandleSystemTheme = () => {
    useSystemTheme();
  }
  const renderThemeOption = (themeName: string, iconName: string, isChecked: boolean) => (
    <Pressable
      android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
      onPress={() => {
        switch(themeName) {
          case 'light':
            handleLightTheme();
            break;
          case 'dark':
            handleDarkTheme();
            break;
          case 'system':
            HandleSystemTheme();
            break;
        }
      }}
      key={themeName}
    >
      <View style={styles.section}>
        <View style={styles.leftSectionContainer}>
          {/* <View style={[
            styles.iconContainer,
            { backgroundColor: currentTheme === 'dark' ? Colors.dark.buttonBackground : Colors.light.buttonBackground }
          ]}> */}
            <MaterialCommunityIcons name={iconName} size={18} color={colors} />
          {/* </View> */}
          <ThemedText>{t(`themeScreen.${themeName}`)}</ThemedText>
        </View>
        {isChecked && <MaterialCommunityIcons name="check" size={20} color={colors} />}
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />

      <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
        <View style={styles.headerContainer}>
          <ThemedButton
            iconName="chevron-left"
            style={styles.titleButton}
            onPress={onNavigateBack}
          />
          <ThemedText type='title' style={styles.title}>{t('themeScreen.title')}</ThemedText>
        </View>
      </Animated.View>

      <Animated.ScrollView style={styles.scrollContainer} onScroll={scrollHandler}>
        <View style={[styles.descriptionContainer, { backgroundColor: sectionsColors }]}>
          <View style={styles.descriptionItem}>
            <LIGHT width={120} height={120} />
            <ThemedText>{t('themeScreen.light')}</ThemedText>
          </View>
          <View style={styles.descriptionItem}>
            <DARK width={120} height={120} />
            <ThemedText>{t('themeScreen.dark')}</ThemedText>
          </View>
        </View>

        <ThemedView style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
          {renderThemeOption('light', 'weather-sunny', isDarkMode === false)}
          {renderThemeOption('dark', 'weather-night', isDarkMode === true)}
          {renderThemeOption('system', 'cog-outline', isDarkMode === undefined)}
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
        position: 'absolute',
        top: STATUSBAR_HEIGHT + 45,
        left: 0,
        right: 0,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 15,
    },
    titleButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    title: {
        fontSize: 28,
    },
    titleButton: {
        zIndex: 11,
    },
    blurContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: STATUSBAR_HEIGHT,
        zIndex: 10,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingHorizontal: 15,
        paddingTop: STATUSBAR_HEIGHT + 105,
    },
    descriptionContainer: {
        flexDirection: 'row',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        overflow: 'hidden',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 30,
    },
    descriptionItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexDirection: 'column',

    },
    descriptionText: {
        fontSize: 14,
    },
    sectionContainer: {
        // gap: 5,
        borderRadius: 16,
        overflow: 'hidden',
    },
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        pointerEvents: 'none',
    },
    leftSectionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 15,
    },
    flagIconContainer: {
        width: 25,
        aspectRatio: 1,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    iconContainer: {
        width: 28,
        aspectRatio: 1,
        borderRadius: 50,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
});