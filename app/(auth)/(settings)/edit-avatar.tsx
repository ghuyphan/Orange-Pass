import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/buttons";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import Avatar, {
  AvatarConfig as NiceAvatarConfig,
  SexType,
  HairStyleType,
} from "@zamplyy/react-native-nice-avatar";
import { LinearGradient } from "expo-linear-gradient";
import { t } from "@/i18n";
import {
  getResponsiveWidth,
  getResponsiveHeight,
  getResponsiveFontSize,
} from "@/utils/responsive";
import { useTheme } from "@/context/ThemeContext";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { updateAvatarConfig } from "@/store/reducers/authSlice";
import { updateUserAvatarCombined } from "@/services/localDB/userDB";
import { Colors } from "@/constants/Colors";
import ColorPicker, {
  Preview,
  HueSlider,
  Panel1,
} from "reanimated-color-picker";

// Define proper types for avatar configuration that extends the NiceAvatarConfig
type CustomAvatarConfig = Omit<NiceAvatarConfig, "sex" | "hairStyle"> & {
  sex: SexType; // Made non-optional as computeFullConfig will ensure it
  hairStyle: HairStyleType; // Made non-optional
  faceColor: string;
  earSize: "small" | "big";
  hairColor: string;
  hatStyle: "none" | "beanie" | "turban";
  hatColor: string;
  eyeStyle: "circle" | "oval" | "smile";
  glassesStyle: "none" | "round" | "square";
  noseStyle: "short" | "long" | "round";
  mouthStyle: "laugh" | "smile" | "peace";
  shirtStyle: "hoody" | "short" | "polo";
  shirtColor: string;
};

const commonOptionMargin = {
  marginRight: getResponsiveWidth(2),
  marginBottom: getResponsiveHeight(1),
};

const getThemedStyles = (
  themeColors: typeof Colors.light | typeof Colors.dark
) => {
  const baseAvatarSize = getResponsiveWidth(30);
  const avatarInitialOffset = getResponsiveHeight(18);

  return StyleSheet.create({
    // ... (your existing styles)
    container: {
      flex: 1,
      paddingHorizontal: getResponsiveWidth(3.6),
      backgroundColor: themeColors.background,
    },
    headerContainer: {
      position: "absolute",
      top: getResponsiveHeight(10),
      left: getResponsiveWidth(3.6),
      right: getResponsiveWidth(3.6),
      flexDirection: "row",
      alignItems: "center",
      zIndex: 10,
      marginLeft: getResponsiveWidth(13),
    },
    headerButtonContainer: {
      position: "absolute",
      top: getResponsiveHeight(10),
      left: getResponsiveWidth(3.6),
      flexDirection: "row",
      alignItems: "center",
      zIndex: 11,
    },
    titleButton: {
      marginRight: getResponsiveWidth(3.6),
    },
    title: {
      fontSize: getResponsiveFontSize(28),
    },
    avatarContainer: {
      alignItems: "center",
      marginTop: avatarInitialOffset,
    },
    gradient: {
      borderRadius: getResponsiveWidth(50),
      padding: getResponsiveWidth(1.2),
      width: baseAvatarSize + getResponsiveWidth(1.2) * 2,
      height: baseAvatarSize + getResponsiveWidth(1.2) * 2,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholder: {
      width: baseAvatarSize,
      height: baseAvatarSize,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
      marginTop: getResponsiveHeight(3),
      paddingHorizontal: getResponsiveWidth(4.8),
      borderRadius: getResponsiveWidth(4),
      backgroundColor: themeColors.cardBackground,
    },
    scrollContainer: {
      paddingTop: getResponsiveHeight(2),
      paddingBottom: getResponsiveHeight(1.8),
    },
    selectorContainer: {
      marginBottom: getResponsiveHeight(2.5),
    },
    label: {
      fontSize: getResponsiveFontSize(16),
      marginBottom: getResponsiveHeight(1.2),
    },
    optionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    optionCircle: {
      ...commonOptionMargin,
      width: getResponsiveWidth(8),
      height: getResponsiveWidth(8),
      borderRadius: getResponsiveWidth(4),
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    selectedOption: {
      borderWidth: 2,
    },
    customOption: {
      borderStyle: "dashed",
    },
    genericOption: {
      ...commonOptionMargin,
      paddingHorizontal: getResponsiveWidth(3),
      paddingVertical: getResponsiveHeight(1),
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: getResponsiveWidth(4),
    },
    genericOptionText: {
      fontSize: getResponsiveFontSize(14),
    },
    saveButton: {
      marginTop: getResponsiveHeight(2),
      marginBottom: getResponsiveHeight(3),
    },
    customSheetContent: {
      flex: 1,
      paddingHorizontal: getResponsiveWidth(5),
      paddingVertical: getResponsiveHeight(2),
      alignItems: "center",
    },
    sheetTitle: {
      fontSize: getResponsiveFontSize(18),
      marginBottom: getResponsiveHeight(2),
      textAlign: "center",
      fontWeight: "bold",
    },
    colorPickerContainer: {
      width: "90%",
      marginBottom: getResponsiveHeight(2),
    },
    previewStyle: {
      height: getResponsiveHeight(5),
      borderRadius: getResponsiveWidth(2),
      marginBottom: getResponsiveHeight(2),
    },
    panelStyle: {
      marginBottom: getResponsiveHeight(2),
    },
    hueSliderStyle: {
      marginBottom: getResponsiveHeight(2),
    },
    selectButtonContainer: {
      width: "90%",
      marginTop: getResponsiveHeight(1),
    },
    selectButton: {},
  });
};

// --- Avatar Options Arrays (Keep outside component if they don't depend on props/state) ---
const faceColors = ["#F5E6CA", "#FFE0BD", "#FFDAB9", "#FFCD94", "#F9C9B6", "#E8BEAC", "#E0CDBA", "#E6D5AE", "#D9B99B", "#EAC086", "#C8B89A", "#BCAFA0", "#D1A17A", "#C68642", "#A1887F", "#8D5524", "#6B4423", "#58331A", "#432616", "#3E271B"];
const earSizes: Array<'small' | 'big'> = ["small", "big"];
const maleHairStyles: HairStyleType[] = ["normal", "thick", "mohawk"];
const femaleHairStyles: HairStyleType[] = ["womanLong", "womanShort"];
const hairColors = [ "#E6BE8A", "#E79CC2", "#23B5D3", "#C19A6B", "#A67B5B", "#B87333", "#8C5A56", "#652DC1", "#704214", "#4B3621", "#000000" ];
const hatStyles: Array<'none' | 'beanie' | 'turban'> = ["none", "beanie", "turban"];
const hatColors = [ "#000000", "#FFFFFF", "#8B4513", "#FDFD96", "#B1E693", "#B5EAD7", "#AEC6CF", "#C3B1E1", "#FFB7B2", "#FFD1DC", "#FFC0CB" ];
const eyeStyles: Array<'circle' | 'oval' | 'smile'> = ["circle", "oval", "smile"];
const glassesStyles: Array<'none' | 'round' | 'square'> = ["none", "round", "square"];
const noseStyles: Array<'short' | 'long' | 'round'> = ["short", "long", "round"];
const mouthStyles: Array<'laugh' | 'smile' | 'peace'> = ["laugh", "smile", "peace"];
const shirtStyles: Array<'hoody' | 'short' | 'polo'> = ["hoody", "short", "polo"];
const shirtColors = [ "#5DADE2", "#CFE8EF", "#B0E0E6", "#58D68D", "#C1E1C1", "#F4D03F", "#F0E6CC", "#F8B195", "#FAE8E0", "#EC7063", "#FFB6C1", "#D3B4AC", "#E8D3EB", "#CBC3E3" ];


// Helper function to compute the full configuration with defaults
const computeFullConfig = (
  sourceConfig: Partial<CustomAvatarConfig> | undefined | null
): CustomAvatarConfig => {
  const base = sourceConfig || {};

  const sex = base.sex || "man";
  const allowedHairStyles = sex === "woman" ? femaleHairStyles : maleHairStyles;
  let hairStyle = base.hairStyle;
  if (!hairStyle || !allowedHairStyles.includes(hairStyle as HairStyleType)) {
    hairStyle = allowedHairStyles[0];
  }

  return {
    faceColor: "#F5E6CA",
    earSize: "small",
    hairColor: "#4B3621",
    hatStyle: "none",
    hatColor: "#000000",
    eyeStyle: "circle",
    glassesStyle: "none",
    noseStyle: "short",
    mouthStyle: "smile",
    shirtStyle: "short",
    shirtColor: "#5DADE2",
    ...base, // Spread source config to override defaults
    sex: sex, // Ensure sex is correctly set
    hairStyle: hairStyle, // Ensure hairStyle is correctly set
  };
};


const EditAvatarScreen = () => {
  const { currentTheme } = useTheme();
  const themeColors = Colors[currentTheme];
  const styles = useMemo(() => getThemedStyles(themeColors), [themeColors]);

  const dispatch = useDispatch();
  const reduxAvatarConfig = useSelector(
    (state: RootState) => state.auth.avatarConfig
  );
  const selectedColor = themeColors.tint;
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // --- State for initial config (to detect changes) ---
  const [initialConfig, setInitialConfig] = useState<CustomAvatarConfig>(() =>
    computeFullConfig(reduxAvatarConfig)
  );

  const [avatarConfig, setAvatarConfig] = useState<CustomAvatarConfig>(() =>
    computeFullConfig(reduxAvatarConfig)
  );

  const [isAvatarPreviewReady, setIsAvatarPreviewReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // State to track changes

  // --- Constants ---
  const baseAvatarSize = getResponsiveWidth(30);

  // --- Custom Color Bottom Sheet State ---
  const customColorSheetRef = useRef<BottomSheet>(null);
  const [customColorProperty, setCustomColorProperty] =
    useState<keyof CustomAvatarConfig | null>(null);
  const [temporaryColor, setTemporaryColor] = useState<string>("#ffffff");

  // Effect to defer Avatar rendering
  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      timerId = setTimeout(() => {
        setIsAvatarPreviewReady(true);
      }, 150);
    });
    return () => {
      interactionPromise.cancel();
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Effect to check for changes between avatarConfig and initialConfig
  useEffect(() => {
    const configsAreEqual = (
      configA: CustomAvatarConfig,
      configB: CustomAvatarConfig
    ): boolean => {
      const keysToCompare: Array<keyof CustomAvatarConfig> = [
        "sex", "faceColor", "earSize", "hairStyle", "hairColor",
        "hatStyle", "hatColor", "eyeStyle", "glassesStyle",
        "noseStyle", "mouthStyle", "shirtStyle", "shirtColor",
      ];
      for (const key of keysToCompare) {
        if (configA[key] !== configB[key]) {
          return false;
        }
      }
      return true;
    };
    setHasChanges(!configsAreEqual(avatarConfig, initialConfig));
  }, [avatarConfig, initialConfig]);


  // Effect to adjust hairStyle when sex changes
  useEffect(() => {
    const currentConfigHairStyle = avatarConfig.hairStyle;
    const isFemale = avatarConfig.sex === "woman";
    const allowedHairStyles = isFemale ? femaleHairStyles : maleHairStyles;

    if (
      !currentConfigHairStyle ||
      !allowedHairStyles.includes(currentConfigHairStyle as HairStyleType)
    ) {
      setAvatarConfig((prev) => ({
        ...prev,
        hairStyle: allowedHairStyles[0],
      }));
    }
  }, [avatarConfig.sex, avatarConfig.hairStyle]); // Dependencies are correct

  const handleColorComplete = useCallback(({ hex }: { hex: string }) => {
    setTemporaryColor(hex);
  }, []);

  const openCustomColorSheet = useCallback(
    (property: keyof CustomAvatarConfig) => {
      setCustomColorProperty(property);
      const currentVal = avatarConfig[property] as string;
      setTemporaryColor(currentVal || "#ffffff");
      customColorSheetRef.current?.expand();
    },
    [avatarConfig]
  );

  const handleOptionSelect = useCallback(
    (property: keyof CustomAvatarConfig, option: string | SexType | HairStyleType) => {
      setAvatarConfig((prev) => ({
        ...prev,
        [property]: option,
      }));
    },
    []
  );

  const handleConfirmColor = useCallback(() => {
    if (customColorProperty) {
      handleOptionSelect(customColorProperty, temporaryColor);
    }
    customColorSheetRef.current?.close();
  }, [customColorProperty, temporaryColor, handleOptionSelect]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return; // Should not be callable if no changes, but as a safeguard
    setIsSaving(true);
    try {
      dispatch(updateAvatarConfig(avatarConfig));
      if (currentUser?.id) {
        await updateUserAvatarCombined(currentUser.id, avatarConfig);
        console.log("Avatar updated successfully in Redux and local DB.");
      }
      router.back();
    } catch (error) {
      console.error("Failed to update avatar:", error);
    } finally {
      setIsSaving(false);
    }
  }, [avatarConfig, currentUser, dispatch, router, hasChanges]);

  const avatarOptions: Array<{
    label: string;
    options: string[]; // For non-color options, these are keys or simple strings
    property: keyof CustomAvatarConfig;
    isColor?: boolean;
  }> = useMemo(() => [ // useMemo to prevent re-creation if not needed
    { label: t("editAvatarScreen.gender"), options: ["man", "woman"], property: "sex" },
    { label: t("editAvatarScreen.faceColor"), options: faceColors, property: "faceColor", isColor: true },
    { label: t("editAvatarScreen.earSize"), options: earSizes, property: "earSize" },
    {
      label: t("editAvatarScreen.hairStyle"),
      options: avatarConfig.sex === "woman" ? femaleHairStyles : maleHairStyles,
      property: "hairStyle",
    },
    { label: t("editAvatarScreen.hairColor"), options: hairColors, property: "hairColor", isColor: true },
    { label: t("editAvatarScreen.hatStyle"), options: hatStyles, property: "hatStyle" },
    ...(avatarConfig.hatStyle !== "none"
      ? [
          {
            label: t("editAvatarScreen.hatColor"),
            options: hatColors,
            property: "hatColor" as keyof CustomAvatarConfig,
            isColor: true,
          },
        ]
      : []),
    { label: t("editAvatarScreen.eyeStyle"), options: eyeStyles, property: "eyeStyle" },
    { label: t("editAvatarScreen.glassesStyle"), options: glassesStyles, property: "glassesStyle" },
    { label: t("editAvatarScreen.noseStyle"), options: noseStyles, property: "noseStyle" },
    { label: t("editAvatarScreen.mouthStyle"), options: mouthStyles, property: "mouthStyle" },
    { label: t("editAvatarScreen.shirtStyle"), options: shirtStyles, property: "shirtStyle" },
    { label: t("editAvatarScreen.shirtColor"), options: shirtColors, property: "shirtColor", isColor: true },
  ], [avatarConfig.sex, avatarConfig.hatStyle, t]); // Add t to dependencies if its instance can change

  const renderOptionSelector = (
    label: string,
    options: string[],
    property: keyof CustomAvatarConfig,
    isColor: boolean | undefined
  ) => {
    const currentPropertyValue = avatarConfig[property];
    const isCustomColorSelected =
      typeof currentPropertyValue === "string" &&
      isColor &&
      !options.includes(currentPropertyValue);

    return (
      <View style={styles.selectorContainer} key={property}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={styles.optionsRow}>
          {options.map((option, index) => {
            const isSelected = currentPropertyValue === option;
            if (isColor) {
              return (
                <TouchableOpacity
                  key={`${property}-${option}-${index}`}
                  onPress={() => handleOptionSelect(property, option)}
                  style={[
                    styles.optionCircle,
                    { backgroundColor: option },
                    isSelected && [
                      styles.selectedOption,
                      { borderColor: selectedColor },
                    ],
                  ]}
                />
              );
            } else {
              return (
                <TouchableOpacity
                  key={`${property}-${option}-${index}`}
                  onPress={() => handleOptionSelect(property, option)}
                  style={[
                    styles.genericOption,
                    isSelected && [
                      styles.selectedOption,
                      { borderColor: selectedColor },
                    ],
                  ]}
                >
                  <ThemedText style={styles.genericOptionText}>
                    {t(`editAvatarScreen.options.${property}.${option}`) ||
                      option}
                  </ThemedText>
                </TouchableOpacity>
              );
            }
          })}
          {isColor && property !== "faceColor" && (
            <Pressable
              key={`${property}-custom`}
              onPress={() => openCustomColorSheet(property)}
              style={[
                styles.optionCircle,
                styles.customOption,
                {
                  backgroundColor: isCustomColorSelected
                    ? (currentPropertyValue as string)
                    : "transparent",
                  borderColor: isCustomColorSelected
                    ? selectedColor
                    : themeColors.text,
                },
                isCustomColorSelected && styles.selectedOption,
              ]}
            >
              <MaterialCommunityIcons
                name="plus"
                size={getResponsiveFontSize(12)}
                color={themeColors.text}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerContainer}>
        <ThemedText style={styles.title} type="title">
          {t("editAvatarScreen.title")}
        </ThemedText>
      </View>
      <View style={styles.headerButtonContainer}>
        <ThemedButton
          iconName="chevron-left"
          style={styles.titleButton}
          onPress={() => router.back()}
        />
      </View>

      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={["#ff9a9e", "#fad0c4", "#fad0c4", "#fbc2eb", "#a18cd1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {isAvatarPreviewReady ? (
            <Avatar
              size={baseAvatarSize}
              {...(avatarConfig as NiceAvatarConfig)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ActivityIndicator color={themeColors.text} size="large" />
            </View>
          )}
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {avatarOptions.map(({ label, options, property, isColor }) =>
          renderOptionSelector(label, options, property, isColor)
        )}
      </ScrollView>

      <ThemedButton
        label={!isSaving ? t("editAvatarScreen.save") : undefined}
        onPress={handleSave}
        style={styles.saveButton}
        loading={isSaving}
        loadingLabel={t("editAvatarScreen.savingLabel")}
        disabled={isSaving || !hasChanges}
      />

      <ThemedReuseableSheet
        ref={customColorSheetRef}
        snapPoints={["55%", "65%"]}
        title={t("editAvatarScreen.selectCustomColor")}
        contentType="custom"
        customContent={
          customColorProperty && (
            <View style={styles.customSheetContent}>
              <ColorPicker
                style={styles.colorPickerContainer}
                value={temporaryColor}
                onCompleteJS={handleColorComplete}
              >
                <Preview style={styles.previewStyle} hideInitialColor />
                <Panel1 style={styles.panelStyle} />
                <HueSlider style={styles.hueSliderStyle} />
              </ColorPicker>
              <View style={styles.selectButtonContainer}>
                <ThemedButton
                  label={t("editAvatarScreen.selectColor")}
                  onPress={handleConfirmColor}
                  style={styles.selectButton}
                />
              </View>
            </View>
          )
        }
      />
    </ThemedView>
  );
};

export default EditAvatarScreen;
