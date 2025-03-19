import React, { useCallback, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { updateAvatarConfig } from '@/store/reducers/authSlice';
import Avatar from '@zamplyy/react-native-nice-avatar';
import { t } from '@/i18n';
import {
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
} from '@/utils/responsive';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

const EditAvatarScreen = () => {
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();
  const currentAvatarConfig = useSelector(
    (state: RootState) => state.auth.avatarConfig
  );
  const [avatarConfig, setAvatarConfig] = useState(currentAvatarConfig);

  console.log('Avatar config:', avatarConfig);

  // Pre-compute responsive constants
  const headerScrollThreshold = getResponsiveHeight(7);
  const headerAnimationRange = getResponsiveHeight(5);
  // Increase the shared translation so the header and avatar move up more noticeably
  const sharedTranslateY = -getResponsiveHeight(6);
  const responsiveAvatarMarginBottom = getResponsiveHeight(2);
  const responsiveAvatarMarginBottomSmall = getResponsiveHeight(0.5);
  const baseAvatarSize = getResponsiveWidth(40); // used for both size and layout height

  // Shared scroll value for animations.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // --- Header Animation (using sharedTranslateY) ---
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [headerScrollThreshold, headerScrollThreshold + headerAnimationRange],
        [1, 0],
        Extrapolate.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, headerScrollThreshold],
            [0, sharedTranslateY],
            Extrapolate.CLAMP
          ),
        },
      ],
    };
  });

  // --- Avatar Container Animation: animate both layout height and transform ---
  const avatarContainerAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.6],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, sharedTranslateY],
      Extrapolation.CLAMP
    );
    const animatedHeight = interpolate(
      scrollY.value,
      [0, 100],
      [baseAvatarSize, baseAvatarSize * 0.6],
      Extrapolation.CLAMP
    );
    const marginBottom = interpolate(
      scrollY.value,
      [0, 100],
      [responsiveAvatarMarginBottom, responsiveAvatarMarginBottomSmall],
      Extrapolation.CLAMP
    );
    // Instead of animating paddingTop, consider animating an additional translateY
    const additionalTranslateY = interpolate(
      scrollY.value,
      [0, 100],
      [10, -50], // moves the avatar container upward by 50 at max scroll
      Extrapolation.CLAMP
    );
    return {
      height: animatedHeight,
      transform: [{ scale }, { translateY: translateY + additionalTranslateY }],
      marginBottom,
    };
  });
  

  // --- Dynamic Styles ---
  const dynamicScrollViewStyle = {
    backgroundColor:
      currentTheme === 'light'
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
  };

  // --- Preset Options Arrays ---
  // More natural skin tones.
  const faceColors = ['#FFE0BD', '#FFCD94', '#EAC086', '#D1A17A', '#8D5524'];
  // (Keep ear sizes and other non-color properties unchanged.)
  const earSizes = ['small', 'big'];
  const hairStyles = ['normal', 'thick', 'mohawk', 'womanLong', 'womanShort'];
  // More common hair colors: Black, Dark brown, Medium brown, and Red.
  const hairColors = ['#000000', '#4B3621', '#A67B5B', '#FF4500'];
  const hatStyles = ['none', 'beanie', 'turban'];
  const hatColors = ['#000000', '#FFFFFF', '#8B4513', '#FFC0CB'];
  const eyeStyles = ['circle', 'oval', 'smile'];
  const glassesStyles = ['none', 'round', 'square'];
  const noseStyles = ['short', 'long', 'round'];
  const mouthStyles = ['laugh', 'smile', 'peace'];
  const shirtStyles = ['hoody', 'short', 'polo'];
  // More complementary muted colors for shirts.
  const shirtColors = ['#5DADE2', '#58D68D', '#F4D03F', '#EC7063'];
  // const bgColors = ['#B9C1CC', '#FFFFFF', '#000000', '#FFC0CB'];

  // --- Custom Color Bottom Sheet State ---
  const customColorSheetRef = useRef(null);
  const [customColorProperty, setCustomColorProperty] =
    useState<string | null>(null);
  const [customColorInput, setCustomColorInput] = useState('');

  const openCustomColorSheet = (property: string) => {
    setCustomColorProperty(property);
    setCustomColorInput(avatarConfig[property] || '');
    customColorSheetRef.current?.snapToIndex(0);
  };

  // Save action.
  const handleSave = useCallback(() => {
    dispatch(updateAvatarConfig(avatarConfig));
    router.back();
  }, [avatarConfig, dispatch]);

  // Update a property in the avatar config.
  const handleOptionSelect = useCallback((property: string, option: string) => {
    setAvatarConfig((prev) => ({ ...prev, [property]: option }));
  }, []);

  /**
   * Render a selectable option row.
   * For color properties, display preset colored circles. In addition, always render
   * an extra circle that shows the custom color if the current value isn’t one of the presets.
   * A pencil overlay indicates that tapping the circle will open the bottom sheet.
   */
  const renderOptionSelector = (
    label: string,
    options: string[],
    property: string
  ) => {
    const isColor = options[0]?.startsWith('#');
    return (
      <View style={styles.selectorContainer} key={property}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={styles.optionsRow}>
          {options.map((option, index) => {
            const isSelected = avatarConfig[property] === option;
            const optionStyle = isColor
              ? [
                styles.colorOption,
                { backgroundColor: option },
                isSelected && styles.selectedColorOption,
              ]
              : [
                styles.genericOption,
                isSelected && {
                  backgroundColor:
                    currentTheme === 'light'
                      ? Colors.light.buttonBackground
                      : Colors.dark.buttonBackground,
                },
              ];
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleOptionSelect(property, option)}
                style={optionStyle}
              >
                {!isColor && (
                  <ThemedText
                    style={[
                      styles.genericOptionText,
                      isSelected && { color: '#fff' },
                    ]}
                  >
                    {option}
                  </ThemedText>
                )}
              </TouchableOpacity>
            );
          })}
          {isColor && (
            <TouchableOpacity
              onPress={() => openCustomColorSheet(property)}
              style={[
                styles.colorOption,
                // If current value is not in presets, show that as the background
                {
                  backgroundColor: options.includes(avatarConfig[property])
                    ? undefined
                    : avatarConfig[property] || Colors.light.text,
                },
                !options.includes(avatarConfig[property]) &&
                styles.selectedColorOption,
              ]}
            >
              <ThemedText style={styles.customIcon}>✎</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const avatarOptions = [
    { label: 'Face Color', options: faceColors, property: 'faceColor' },
    { label: 'Ear Size', options: earSizes, property: 'earSize' },
    { label: 'Hair Style', options: hairStyles, property: 'hairStyle' },
    { label: 'Hair Color', options: hairColors, property: 'hairColor' },
    { label: 'Hat Style', options: hatStyles, property: 'hatStyle' },
    { label: 'Hat Color', options: hatColors, property: 'hatColor' },
    { label: 'Eye Style', options: eyeStyles, property: 'eyeStyle' },
    {
      label: 'Glasses Style',
      options: glassesStyles,
      property: 'glassesStyle',
    },
    { label: 'Nose Style', options: noseStyles, property: 'noseStyle' },
    { label: 'Mouth Style', options: mouthStyles, property: 'mouthStyle' },
    { label: 'Shirt Style', options: shirtStyles, property: 'shirtStyle' },
    { label: 'Shirt Color', options: shirtColors, property: 'shirtColor' },
    // { label: 'Background Color', options: bgColors, property: 'bgColor' },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Animated header */}
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <ThemedButton
          iconName="chevron-left"
          style={styles.titleButton}
          onPress={() => router.back()}
        />
        <ThemedText style={styles.title} type="title">
          {t('editAvatarScreen.title')}
        </ThemedText>
      </Animated.View>

      {/* Animated avatar container */}
      <Animated.View
        style={[styles.avatarContainer, avatarContainerAnimatedStyle]}
      >
        {/* Pass the base size for visual consistency */}
        <Avatar size={baseAvatarSize} {...avatarConfig} />
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={[styles.scrollView, dynamicScrollViewStyle]}
        contentContainerStyle={styles.scrollContainer}
      >
        {avatarOptions.map(({ label, options, property }) =>
          renderOptionSelector(label, options, property)
        )}
      </Animated.ScrollView>

      <ThemedButton
        label={t('editAvatarScreen.save')}
        onPress={handleSave}
        style={styles.saveButton}
      />

      {/* Bottom sheet for custom color input */}
      <ThemedReuseableSheet
        ref={customColorSheetRef}
        snapPoints={['30%']}
        title="Custom Color"
        contentType="custom"
        customContent={
          <View style={styles.customSheetContent}>
            <ThemedText style={styles.sheetTitle}>
              Enter Custom Hex Code
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Hex Code:</ThemedText>
              <View style={styles.inputWrapper}>
                <ThemedText style={styles.inputText}>
                  {customColorInput}
                </ThemedText>
              </View>
            </View>
          </View>
        }
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  headerContainer: {
    position: 'absolute',
    top: getResponsiveHeight(10),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleButton: {
    marginRight: getResponsiveWidth(3.6),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
  },
  avatarContainer: {
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    // marginBottom: getResponsiveHeight(2),
  },
  scrollContainer: {
    paddingBottom: getResponsiveHeight(1.8),
  },
  selectorContainer: {
    marginBottom: getResponsiveHeight(2),
  },
  label: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(1),
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: getResponsiveWidth(8),
    height: getResponsiveWidth(8),
    borderRadius: getResponsiveWidth(4),
    marginRight: getResponsiveWidth(2),
    marginBottom: getResponsiveHeight(1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorOption: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  genericOption: {
    paddingHorizontal: getResponsiveWidth(3),
    paddingVertical: getResponsiveHeight(1),
    borderWidth: 1,
    borderColor: Colors.light.text,
    borderRadius: getResponsiveWidth(2),
    marginRight: getResponsiveWidth(2),
    marginBottom: getResponsiveHeight(1),
  },
  genericOptionText: {
    fontSize: getResponsiveFontSize(16),
    color: Colors.dark.text,
  },
  customIcon: {
    fontSize: getResponsiveFontSize(18),
    color: Colors.dark.text,
  },
  saveButton: {
    marginTop: getResponsiveHeight(2),
  },
  customSheetContent: {
    flex: 1,
    padding: getResponsiveWidth(4),
  },
  sheetTitle: {
    fontSize: getResponsiveFontSize(20),
    marginBottom: getResponsiveHeight(2),
  },
  inputContainer: {
    marginBottom: getResponsiveHeight(2),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(0.5),
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: Colors.light.text,
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(1),
  },
  inputText: {
    fontSize: getResponsiveFontSize(16),
  },
  sheetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default EditAvatarScreen;
