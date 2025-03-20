import React, { useCallback, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/buttons";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import Avatar from "@zamplyy/react-native-nice-avatar";
import { AvatarConfig } from "@zamplyy/react-native-nice-avatar";
import { t } from "@/i18n";
import {
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
} from "@/utils/responsive";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { updateAvatarConfig } from "@/store/reducers/authSlice";
import { updateUserAvatarCombined } from "@/services/localDB/userDB";

// A helper type for dynamic access.
type ConfigRecord = Record<string, string>;

const EditAvatarScreen = () => {
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();
  const currentAvatarConfig = useSelector(
    (state: RootState) => state.auth.avatarConfig
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Ensure avatarConfig is never null by providing a fallback.
  const [avatarConfig, setAvatarConfig] = useState(
    currentAvatarConfig ?? ({} as any)
  );

  // Pre-compute responsive constants.
  const headerScrollThreshold = getResponsiveHeight(7);
  const headerAnimationRange = getResponsiveHeight(5);
  const baseAvatarSize = getResponsiveWidth(40);
  const avatarMoveUpDistance = getResponsiveHeight(11);
  const headerMoveUpDistance = getResponsiveHeight(2);
  const avatarInitialOffset = getResponsiveHeight(16);

  // Shared scroll value.
  const scrollY = useSharedValue(0);

  // Scroll handler.
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Animated style for the header.
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [headerScrollThreshold, headerScrollThreshold + headerAnimationRange],
        [1, 0],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [0, headerScrollThreshold],
            [0, -headerMoveUpDistance],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // Animated style for the avatar.
  const AVATAR_SCROLL_THRESHOLD = 100;
  const avatarContainerAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(scrollY.value / AVATAR_SCROLL_THRESHOLD, 1);
    const scale = 1 - 0.25 * progress;
    const translateY = -avatarMoveUpDistance * progress;

    return {
      height: baseAvatarSize * (1 - 0.6 * progress),
      transform: [{ scale }, { translateY }],
    };
  });

  const dynamicScrollViewStyle = {
    backgroundColor:
      currentTheme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
  };

  // --- Avatar Options Arrays ---
  const faceColors = [
    "#F5E6CA",
    "#FFE0BD",
    "#FFDAB9",
    "#FFCD94",
    "#F9C9B6",
    "#E8BEAC",
    "#D9B99B",
    "#EAC086",
    "#D1A17A",
    "#C68642",
    "#8D5524",
    "#6B4423",
  ];
  const earSizes = ["small", "big"];
  const hairStyles = ["normal", "thick", "mohawk", "womanLong", "womanShort"];
  const hairColors = [
    "#E6BE8A",
    "#E79CC2",
    "#23B5D3",
    "#C19A6B",
    "#A67B5B",
    "#B87333",
    "#8C5A56",
    "#652DC1",
    "#704214",
    "#4B3621",
    "#000000",
  ];
  const hatStyles = ["none", "beanie", "turban"];
  const hatColors = [
    "#000000",
    "#FFFFFF",
    "#8B4513",
    "#FDFD96",
    "#B1E693",
    "#B5EAD7",
    "#AEC6CF",
    "#C3B1E1",
    "#FFB7B2",
    "#FFD1DC",
    "#FFC0CB",
  ];
  const eyeStyles = ["circle", "oval", "smile"];
  const glassesStyles = ["none", "round", "square"];
  const noseStyles = ["short", "long", "round"];
  const mouthStyles = ["laugh", "smile", "peace"];
  const shirtStyles = ["hoody", "short", "polo"];
  const shirtColors = [
    "#5DADE2",
    "#CFE8EF",
    "#B0E0E6",
    "#58D68D",
    "#C1E1C1",
    "#F4D03F",
    "#F0E6CC",
    "#F8B195",
    "#FAE8E0",
    "#EC7063",
    "#FFB6C1",
    "#D3B4AC",
    "#E8D3EB",
    "#CBC3E3",
  ];

  // --- Custom Color Bottom Sheet State ---
  const customColorSheetRef = useRef<BottomSheetModal>(null);
  const [customColorProperty, setCustomColorProperty] = useState<string | null>(
    null
  );
  const [customColorInput, setCustomColorInput] = useState("");

  const openCustomColorSheet = (property: string) => {
    // Cast avatarConfig to a record type so we can index it.
    const config = avatarConfig as ConfigRecord;
    setCustomColorProperty(property);
    setCustomColorInput(config[property] || "");
    customColorSheetRef.current?.snapToIndex(0);
  };

  // --- Save Handler ---
  const handleSave = useCallback(async () => {
    // Update Redux.
    dispatch(updateAvatarConfig(avatarConfig));

    // Update both local SQLite DB and Pocketbase.
    if (currentUser?.id) {
      try {
        await updateUserAvatarCombined(currentUser.id, avatarConfig);
      } catch (error) {
        console.error("Failed to update avatar (local & Pocketbase):", error);
      }
    }
    router.back();
  }, [avatarConfig, currentUser, dispatch]);

  const handleOptionSelect = useCallback((property: string, option: string) => {
    setAvatarConfig((prev: AvatarConfig) => ({
      ...prev,
      // Use a cast to allow dynamic access.
      ...(prev as ConfigRecord),
      [property]: option,
    }));
  }, []);

  // Render a selectable row for each customization option.
  const renderOptionSelector = (
    label: string,
    options: string[],
    property: string
  ) => {
    const config = avatarConfig as ConfigRecord;
    const isColor = options[0]?.startsWith("#");
    return (
      <View style={styles.selectorContainer} key={property}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={styles.optionsRow}>
          {options.map((option, index) => {
            const isSelected = config[property] === option;
            if (isColor) {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionSelect(property, option)}
                  style={[
                    styles.optionCircle,
                    { backgroundColor: option },
                    isSelected && styles.selectedOption,
                  ]}
                />
              );
            } else {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionSelect(property, option)}
                  style={[
                    styles.genericOption,
                    isSelected && styles.selectedOption,
                  ]}
                >
                  <ThemedText style={styles.genericOptionText}>
                    {t(`editAvatarScreen.options.${property}.${option}`)}
                  </ThemedText>
                </TouchableOpacity>
              );
            }
          })}
          {isColor && (
            <Pressable
              onPress={() => openCustomColorSheet(property)}
              style={[
                styles.optionCircle,
                {
                  backgroundColor: !options.includes(config[property])
                    ? config[property] || "transparent"
                    : "transparent",
                },
                styles.customOption,
                !options.includes(config[property]) && styles.selectedOption,
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={20}
                color={Colors.light.text}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  // Array mapping each avatar property to its options.
  const avatarOptions = [
    {
      label: t("editAvatarScreen.faceColor"),
      options: faceColors,
      property: "faceColor",
    },
    {
      label: t("editAvatarScreen.earSize"),
      options: earSizes,
      property: "earSize",
    },
    {
      label: t("editAvatarScreen.hairStyle"),
      options: hairStyles,
      property: "hairStyle",
    },
    {
      label: t("editAvatarScreen.hairColor"),
      options: hairColors,
      property: "hairColor",
    },
    {
      label: t("editAvatarScreen.hatStyle"),
      options: hatStyles,
      property: "hatStyle",
    },
    {
      label: t("editAvatarScreen.hatColor"),
      options: hatColors,
      property: "hatColor",
    },
    {
      label: t("editAvatarScreen.eyeStyle"),
      options: eyeStyles,
      property: "eyeStyle",
    },
    {
      label: t("editAvatarScreen.glassesStyle"),
      options: glassesStyles,
      property: "glassesStyle",
    },
    {
      label: t("editAvatarScreen.noseStyle"),
      options: noseStyles,
      property: "noseStyle",
    },
    {
      label: t("editAvatarScreen.mouthStyle"),
      options: mouthStyles,
      property: "mouthStyle",
    },
    {
      label: t("editAvatarScreen.shirtStyle"),
      options: shirtStyles,
      property: "shirtStyle",
    },
    {
      label: t("editAvatarScreen.shirtColor"),
      options: shirtColors,
      property: "shirtColor",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.headerContainer, headerAnimatedStyle]}>
        <ThemedText style={styles.title} type="title">
          {t("editAvatarScreen.title")}
        </ThemedText>
      </Animated.View>
      <View style={styles.headerButtonContainer}>
        <ThemedButton
          iconName="chevron-left"
          style={styles.titleButton}
          onPress={() => router.back()}
        />
      </View>

      {/* Animated Avatar */}
      <Animated.View
        style={[
          styles.avatarContainer,
          { marginTop: avatarInitialOffset },
          avatarContainerAnimatedStyle,
        ]}
      >
        <Avatar size={baseAvatarSize} {...avatarConfig} />
      </Animated.View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Options List */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={[styles.scrollView, dynamicScrollViewStyle]}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {avatarOptions.map(({ label, options, property }) =>
          renderOptionSelector(label, options, property)
        )}
      </Animated.ScrollView>

      {/* Save Button */}
      <ThemedButton
        label={t("editAvatarScreen.save")}
        onPress={handleSave}
        style={styles.saveButton}
      />

      {/* Bottom Sheet for Custom Color Input */}
      <ThemedReuseableSheet
        ref={customColorSheetRef}
        snapPoints={["30%"]}
        title={t("editAvatarScreen.customColor")}
        contentType="custom"
        customContent={
          <View style={styles.customSheetContent}>
            <ThemedText style={styles.sheetTitle}>
              {t("editAvatarScreen.enterCustomHexCode")}
            </ThemedText>
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>
                {t("editAvatarScreen.hexCode")}
              </ThemedText>
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
    position: "absolute",
    top: getResponsiveHeight(10),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
    marginLeft: getResponsiveWidth(13),
  },
  headerButtonContainer: {
    position: "absolute",
    top: getResponsiveHeight(10),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
  },
  titleButton: {
    marginRight: getResponsiveWidth(3.6),
  },
  title: {
    fontSize: getResponsiveFontSize(28),
  },
  avatarContainer: {
    alignSelf: "center",
  },
  spacer: {
    height: getResponsiveHeight(4),
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
  },
  scrollContainer: {
    paddingBottom: getResponsiveHeight(1.8),
    marginTop: getResponsiveHeight(2),
  },
  selectorContainer: {
    marginBottom: getResponsiveHeight(2),
  },
  label: {
    fontSize: getResponsiveFontSize(16),
    marginBottom: getResponsiveHeight(1),
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionCircle: {
    width: getResponsiveWidth(8),
    height: getResponsiveWidth(8),
    borderRadius: getResponsiveWidth(4),
    marginRight: getResponsiveWidth(2),
    marginBottom: getResponsiveHeight(1),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.text,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  customOption: {
    borderStyle: "dashed",
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
  },
  saveButton: {
    marginTop: getResponsiveHeight(2),
    marginBottom: getResponsiveHeight(2),
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
});

export default EditAvatarScreen;
