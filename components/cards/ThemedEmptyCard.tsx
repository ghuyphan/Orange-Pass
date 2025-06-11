import React, { useMemo, useState } from "react";
import { Image, StyleSheet, View, Pressable, Platform } from "react-native";
import { ThemedText } from "../ThemedText";
import { ThemedButton } from "../buttons/ThemedButton";
import { useTheme } from "@/context/ThemeContext";
import { Colors } from "@/constants/Colors";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight
} from "@/utils/responsive";
import { t } from "@/i18n";
import { Menu } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";

export type ThemedEmptyCardProps = {
  lightColor?: string;
  darkColor?: string;
  headerLabel: string;
  footerLabel: string;
  showFooterButton?: boolean;
  footButtonLabel: string;
  cardOnPress?: () => void;
  buttonOnPress?: () => void;
  style?: object;
  footerStyle?: object;
  paddingTop?: number;
  image?: any;
  testID?: string;
  dropdownOptions: {
    label: string;
    onPress: () => void;
    testID?: string;
    icon?: string;
  }[];
  menuStyle?: object;
  menuContentStyle?: object;
  enableGlassmorphism?: boolean; // New prop to toggle glassmorphism
};

export const DEFAULT_IMAGE = require("@/assets/images/card.png");

// Default gradient for glassmorphism background
const DEFAULT_GRADIENT_START = "#E0E5F2";
const DEFAULT_GRADIENT_END = "#B8C6E0";

export function ThemedEmptyCard({
  headerLabel,
  footerLabel,
  showFooterButton = true,
  footButtonLabel,
  cardOnPress,
  buttonOnPress,
  style,
  footerStyle,
  paddingTop,
  image = DEFAULT_IMAGE,
  testID,
  dropdownOptions,
  menuStyle,
  menuContentStyle,
  enableGlassmorphism = true // Default to true
}: ThemedEmptyCardProps) {
  const { currentTheme: colorScheme } = useTheme();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const colors = useMemo(
    () => ({
      text: colorScheme === "light" ? Colors.light.text : Colors.dark.text,
      buttonBackground:
        colorScheme === "light"
          ? Colors.light.buttonBackground
          : Colors.dark.buttonBackground,
      cardBackground:
        colorScheme === "light"
          ? Colors.light.cardBackground
          : Colors.dark.cardBackground,
      cardFooter:
        colorScheme === "light"
          ? Colors.light.cardFooter
          : Colors.dark.cardFooter
    }),
    [colorScheme]
  );

  const styles = useMemo(
    () => createThemedEmptyCardStyles(paddingTop),
    [paddingTop]
  );

  const handleButtonPress = () => {
    if (dropdownOptions?.length > 0) {
      setIsMenuVisible(true);
    } else {
      buttonOnPress?.();
    }
  };

  const renderDropdownItem = (
    option: {
      label: string;
      onPress: () => void;
      testID?: string;
      icon?: string;
    },
    index: number
  ) => (
    <Pressable
      key={index}
      style={styles.dropdownItem}
      onPress={() => {
        option.onPress();
        setIsMenuVisible(false);
      }}
      testID={option.testID}
    >
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={1}
        style={[
          styles.dropdownItemText,
          enableGlassmorphism && styles.glassText
        ]}
      >
        {t(option.label)}
      </ThemedText>
    </Pressable>
  );

  // --- Glassmorphism Gradients ---
  const backgroundGradient = useMemo(() => {
    if (!enableGlassmorphism) return null;
    return [DEFAULT_GRADIENT_START, DEFAULT_GRADIENT_END];
  }, [enableGlassmorphism]);

  const glassGradientColors = useMemo(() => {
    if (!enableGlassmorphism) return [];
    return [
      "rgba(255, 255, 255, 0.35)",
      "rgba(255, 255, 255, 0.2)",
      "rgba(255, 255, 255, 0.15)"
    ];
  }, [enableGlassmorphism]);

  const cardContent = (
    <View
      style={
        enableGlassmorphism
          ? styles.cardWrapper
          : [
              styles.cardContainer,
              { backgroundColor: colors.cardBackground },
              style
            ]
      }
    >
      {/* Background and overlay layers for glassmorphism */}
      {enableGlassmorphism && backgroundGradient && (
        <>
          <LinearGradient
            colors={backgroundGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.backgroundGradient}
          />
          <View style={styles.glassLayer1} />
        </>
      )}

      <LinearGradient
        // Use transparent gradient for glass, or a single transparent color for standard
        colors={
          enableGlassmorphism
            ? glassGradientColors
            : ["transparent", "transparent"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.cardContainer,
          enableGlassmorphism && styles.glassCard,
          !enableGlassmorphism && { backgroundColor: colors.cardBackground },
          style
        ]}
      >
        <View style={styles.cardHeaderContainer}>
          <ThemedText
            style={[
              styles.label,
              enableGlassmorphism ? styles.glassText : { color: colors.text }
            ]}
            type="title"
            numberOfLines={2}
          >
            {t(headerLabel)}
          </ThemedText>
        </View>

        <View style={styles.cardImageContainer}>
          <Image
            source={image}
            style={styles.image}
            accessibilityRole="image"
            accessibilityLabel={t(headerLabel)}
          />
        </View>

        <View
          style={[
            styles.cardFooterContainer,
            enableGlassmorphism
              ? styles.glassFooter
              : { backgroundColor: colors.cardFooter },
            footerStyle
          ]}
        >
          <ThemedText
            style={[
              styles.footerLabel,
              enableGlassmorphism && styles.glassSubText
            ]}
            numberOfLines={1}
          >
            {t(footerLabel)}
          </ThemedText>
          {showFooterButton && (
            <Menu
              visible={isMenuVisible}
              onDismiss={() => setIsMenuVisible(false)}
              anchor={
                <ThemedButton
                  label={t(footButtonLabel)}
                  onPress={handleButtonPress}
                  style={[
                    styles.cardFooterButton,
                    enableGlassmorphism
                      ? styles.glassButton
                      : { backgroundColor: colors.buttonBackground }
                  ]}
                  textStyle={enableGlassmorphism ? styles.glassText : {}}
                />
              }
              anchorPosition="bottom"
              style={menuStyle}
              contentStyle={[
                styles.menuContent,
                enableGlassmorphism
                  ? styles.glassMenuContent
                  : { backgroundColor: colors.buttonBackground },
                menuContentStyle
              ]}
            >
              {dropdownOptions.map(renderDropdownItem)}
            </Menu>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View
      style={[
        styles.outerContainer,
        enableGlassmorphism && styles.glassOuterContainer
      ]}
    >
      <Pressable onPress={cardOnPress} testID={testID} disabled={!cardOnPress}>
        {cardContent}
      </Pressable>
    </View>
  );
}

const createThemedEmptyCardStyles = (paddingTop?: number) =>
  StyleSheet.create({
    outerContainer: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5
    },
    glassOuterContainer: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8
    },
    cardWrapper: {
      position: "relative",
      borderRadius: getResponsiveWidth(4),
      overflow: "hidden"
    },
    backgroundGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    },
    glassLayer1: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.1)"
    },
    cardContainer: {
      borderRadius: getResponsiveWidth(4),
      zIndex: 1
    },
    glassCard: {
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      borderTopWidth: 1.5,
      borderLeftWidth: 1.5,
      borderTopColor: "rgba(255, 255, 255, 0.4)",
      borderLeftColor: "rgba(255, 255, 255, 0.4)"
    },
    cardHeaderContainer: {
      flexDirection: "row",
      width: "100%",
      paddingTop: paddingTop || getResponsiveHeight(2),
      paddingHorizontal: getResponsiveWidth(4.8)
    },
    label: {
      fontSize: getResponsiveFontSize(28),
      lineHeight: getResponsiveFontSize(38)
    },
    glassText: {
      color: "rgba(255, 255, 255, 0.95)",
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3
    },
    glassSubText: {
      color: "rgba(255, 255, 255, 0.85)",
      textShadowColor: "rgba(0, 0, 0, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2
    },
    cardImageContainer: {
      alignItems: "center",
      height: getResponsiveHeight(30),
      justifyContent: "center",
      paddingBottom: getResponsiveHeight(3)
    },
    image: {
      width: getResponsiveWidth(90),
      height: getResponsiveHeight(38),
      resizeMode: "contain"
    },
    cardFooterContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getResponsiveHeight(1.8),
      paddingHorizontal: getResponsiveWidth(4.8),
      justifyContent: "space-between",
      borderBottomLeftRadius: getResponsiveWidth(4),
      borderBottomRightRadius: getResponsiveWidth(4)
    },
    glassFooter: {
      backgroundColor: "rgba(0, 0, 0, 0.05)"
    },
    footerLabel: {
      fontSize: getResponsiveFontSize(16),
      flex: 1,
      marginRight: getResponsiveWidth(2)
    },
    cardFooterButton: {
      paddingHorizontal: getResponsiveWidth(4.8)
    },
    glassButton: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)"
    },
    menuContent: {
      borderRadius: getResponsiveWidth(6),
      paddingHorizontal: getResponsiveWidth(2.4)
    },
    glassMenuContent: {
      backgroundColor: "rgba(120, 120, 120, 0.7)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
      paddingHorizontal: getResponsiveWidth(2.4)
    },
    dropdownItem: {
      gap: getResponsiveWidth(2),
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getResponsiveHeight(1.2),
      paddingHorizontal: getResponsiveWidth(2.4)
    },
    dropdownItemText: {
      fontSize: getResponsiveFontSize(15)
    }
  });