import React, { memo, useMemo, useEffect } from "react";
import {
  Image,
  StyleSheet,
  View,
  Pressable,
  Text,
  Platform
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import Barcode from "react-native-barcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { getIconPath } from "@/utils/returnIcon";
import { returnItemData } from "@/utils/returnItemData";
import { returnMidpointColors } from "@/utils/returnMidpointColor";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight
} from "@/utils/responsive";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming
} from "react-native-reanimated";

// Constants
const MIDPOINT_COUNT = 6;
const QR_SIZE = getResponsiveWidth(16.8);
const BARCODE_WIDTH = getResponsiveWidth(33.6);
const BARCODE_HEIGHT = getResponsiveWidth(16.8);
const DEFAULT_GRADIENT_START = "#FAF3E7";
const DEFAULT_GRADIENT_END = "#D6C4AF";

// Create animated component once outside of component
const ReanimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// Define a default structure for itemData using preferred fallback colors
const defaultItemData = {
  name: "...",
  color: { light: DEFAULT_GRADIENT_START, dark: DEFAULT_GRADIENT_END },
  accent_color: { light: DEFAULT_GRADIENT_END, dark: DEFAULT_GRADIENT_START },
  type: "store"
};

const defaultIconPath = null;

export type ThemedCardItemProps = {
  isActive?: boolean;
  code: string | null;
  type: "bank" | "store" | "ewallet";
  metadata: string;
  metadata_type?: "qr" | "barcode";
  accountName?: string;
  accountNumber?: string;
  style?: object;
  animatedStyle?: object;
  onItemPress?: () => void;
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
  cardHolderStyle?: object;
  enableGlassmorphism?: boolean; // New prop to toggle glassmorphism
};

const ThemedCardItem = memo(function ThemedCardItem({
  isActive = false,
  code: rawCode,
  type,
  metadata,
  metadata_type = "qr",
  accountName,
  accountNumber,
  style,
  animatedStyle,
  onItemPress,
  onMoreButtonPress,
  onDrag,
  cardHolderStyle,
  enableGlassmorphism = true
}: ThemedCardItemProps): JSX.Element {
  const code = useMemo(() => (rawCode === null ? "" : rawCode), [rawCode]);

  const isCodeEmptyOrPlaceholder = useMemo(
    () => code === "" || code === "N/A",
    [code]
  );

  const itemData = useMemo(() => {
    if (isCodeEmptyOrPlaceholder) {
      return defaultItemData;
    }
    return returnItemData(code) || defaultItemData;
  }, [code, isCodeEmptyOrPlaceholder]);

  const { name, color, accent_color, type: itemDataType } = itemData;

  const isN_ACode = useMemo(() => code === "N/A", [code]);

  const cardType = useMemo(() => {
    if (type) return type;
    if (itemDataType) return itemDataType;
    return isN_ACode ? "bank" : "store";
  }, [type, itemDataType, isN_ACode]);

  const iconPath = useMemo(() => {
    if (isCodeEmptyOrPlaceholder) {
      return defaultIconPath;
    }
    return getIconPath(code) || defaultIconPath;
  }, [code, isCodeEmptyOrPlaceholder]);

  const accountDisplayName = useMemo(() => {
    if (cardType !== "store" && accountNumber) {
      const maskedLength = Math.max(0, accountNumber.length - 4);
      return `${"*".repeat(maskedLength)}${accountNumber.slice(-4)}`;
    }
    return "";
  }, [cardType, accountNumber]);

  const displayMetadata = useMemo(() => {
    const safeMetadata = metadata || "";
    if (isCodeEmptyOrPlaceholder || !safeMetadata) {
      return "";
    }
    return safeMetadata;
  }, [metadata, isCodeEmptyOrPlaceholder]);

  const footerText = useMemo(() => {
    if (iconPath && iconPath !== 124 && cardType) {
      return cardType === "store" ? displayMetadata : accountDisplayName;
    }
    return "";
  }, [iconPath, cardType, displayMetadata, accountDisplayName]);

  // Reanimated shared values for QR/Barcode placeholder dimensions.
  const placeholderWidth = useSharedValue(QR_SIZE);
  const placeholderHeight = useSharedValue(QR_SIZE);

  const animatedPlaceholderStyle = useAnimatedStyle(() => ({
    width: withTiming(placeholderWidth.value, { duration: 200 }),
    height: withTiming(placeholderHeight.value, { duration: 200 })
  }));

  useEffect(() => {
    if (metadata_type === "barcode") {
      placeholderWidth.value = BARCODE_WIDTH;
      placeholderHeight.value = BARCODE_HEIGHT;
    } else {
      placeholderWidth.value = QR_SIZE;
      placeholderHeight.value = QR_SIZE;
    }
  }, [metadata_type, placeholderWidth, placeholderHeight]);

  const metadataContent = useMemo(() => {
    if (!displayMetadata) {
      return null;
    }
    if (metadata_type === "qr") {
      return <QRCode value={displayMetadata} size={QR_SIZE} />;
    }
    return (
      <Barcode
        height={BARCODE_HEIGHT}
        maxWidth={BARCODE_WIDTH}
        value={displayMetadata}
        format="CODE128"
      />
    );
  }, [displayMetadata, metadata_type]);

  const gradientColors = useMemo(
    () =>
      returnMidpointColors(
        color?.light,
        accent_color?.light,
        MIDPOINT_COUNT
      ) || [color.light, accent_color.light],
    [color, accent_color]
  );

  // Glassmorphism gradient colors (more transparent)
  const glassGradientColors = useMemo(() => {
    if (!enableGlassmorphism) return gradientColors;

    // Create glassmorphism colors with transparency
    return [
      "rgba(255, 255, 255, 0.25)",
      "rgba(255, 255, 255, 0.15)",
      "rgba(255, 255, 255, 0.1)",
      "rgba(255, 255, 255, 0.08)"
    ];
  }, [enableGlassmorphism, gradientColors]);

  // Background gradient for glassmorphism effect
  const backgroundGradient = useMemo(() => {
    if (!enableGlassmorphism) return null;

    return gradientColors;
  }, [enableGlassmorphism, gradientColors]);

  // --- CORRECTED PART ---
  // The wrapping Animated.View is removed. The animatedStyle is applied
  // directly to the ReanimatedLinearGradient.
  const cardContent = (
    <View style={styles.cardWrapper}>
      {/* Background gradient for glassmorphism */}
      {enableGlassmorphism && backgroundGradient && (
        <LinearGradient
          colors={backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
      )}

      {/* Glassmorphism overlay layers */}
      {enableGlassmorphism && (
        <>
          <View style={styles.glassLayer1} />
          <View style={styles.glassLayer2} />
        </>
      )}

      <ReanimatedLinearGradient
        colors={enableGlassmorphism ? glassGradientColors : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.cardContainer,
          enableGlassmorphism && styles.glassCard,
          style,
          animatedStyle // This is the correct and only place it should be
        ]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.leftHeaderContainer}>
            <View
              style={[
                styles.logoContainer,
                enableGlassmorphism && styles.glassLogoContainer
              ]}
            >
              {iconPath ? (
                <Image
                  source={iconPath}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logo} />
              )}
            </View>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.cardName,
                enableGlassmorphism && styles.glassText
              ]}
            >
              {name}
            </Text>
          </View>

          {onMoreButtonPress && (
            <Pressable
              onPress={onMoreButtonPress}
              hitSlop={{
                bottom: getResponsiveHeight(4.8),
                left: getResponsiveWidth(7.2),
                right: getResponsiveWidth(7.2),
                top: getResponsiveHeight(3.6)
              }}
              style={styles.moreButton}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={getResponsiveFontSize(20)}
                color={
                  enableGlassmorphism ? "rgba(255,255,255,0.9)" : "white"
                }
              />
            </Pressable>
          )}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.cardHolderName,
                enableGlassmorphism && styles.glassText,
                cardHolderStyle
              ]}
            >
              {accountName || ""}
            </Text>

            {cardType && (
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[
                  styles.cardType,
                  enableGlassmorphism && styles.glassSubText
                ]}
              >
                {footerText}
              </Text>
            )}
          </View>

          <View
            style={[
              styles.qrContainer,
              enableGlassmorphism && styles.glassQrContainer
            ]}
          >
            {metadataContent}
          </View>
        </View>

        {/* Drag Handle */}
        {onDrag && (
          <View style={styles.dragHandle}>
            <MaterialCommunityIcons
              name="drag-horizontal"
              size={getResponsiveFontSize(20)}
              color="rgba(255,255,255,0.5)"
            />
          </View>
        )}
      </ReanimatedLinearGradient>
    </View>
  );
  // --- END OF CORRECTION ---

  return (
    <View
      style={[
        styles.outerContainer,
        enableGlassmorphism && styles.glassOuterContainer
      ]}
    >
      {onItemPress ? (
        <Pressable
          disabled={isActive}
          onPress={onItemPress}
          onLongPress={onDrag}
          delayLongPress={250}
          android_ripple={{
            color: enableGlassmorphism
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.2)",
            foreground: true,
            borderless: false
          }}
          style={styles.pressableContainer}
        >
          {cardContent}
        </Pressable>
      ) : (
        cardContent
      )}
    </View>
  );
});

// Styles remain the same
const styles = StyleSheet.create({
  outerContainer: {
    marginHorizontal: getResponsiveWidth(3.6),
    marginBottom: getResponsiveHeight(2),
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
    bottom: 0,
    opacity: 0.8
  },
  glassLayer1: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  },
  glassLayer2: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: getResponsiveWidth(3.5)
  },
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    aspectRatio: 1.65,
    justifyContent: "space-between",
    position: "relative",
    zIndex: 1
  },
  glassCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    // Enhanced border highlight for glassmorphism
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
    borderLeftColor: "rgba(255, 255, 255, 0.3)"
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  leftHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4)
  },
  cardName: {
    color: "white",
    fontSize: getResponsiveFontSize(16),
    fontWeight: "bold",
    maxWidth: getResponsiveWidth(36)
  },
  glassText: {
    color: "rgba(255, 255, 255, 0.95)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  logoContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(6),
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  glassLogoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  logo: {
    width: "60%",
    height: "60%"
  },
  moreButton: {
    marginRight: -getResponsiveWidth(2.4)
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    pointerEvents: "none"
  },
  footerLeft: {
    flexDirection: "column",
    justifyContent: "flex-end",
    flexShrink: 1,
    paddingRight: getResponsiveWidth(1)
  },
  cardHolderName: {
    color: "white",
    fontSize: getResponsiveFontSize(15),
    fontWeight: "600",
    maxWidth: getResponsiveWidth(54)
  },
  cardType: {
    color: "rgba(255,255,255,0.7)",
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveHeight(0.6),
    maxWidth: getResponsiveWidth(32),
    overflow: "hidden"
  },
  glassSubText: {
    color: "rgba(255,255,255,0.8)",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  qrContainer: {
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(1.5),
    alignSelf: "flex-end"
  },
  glassQrContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: Platform.OS === "android" ? 3 : 0
  },
  qrPlaceholder: {
    borderRadius: getResponsiveWidth(1.5)
  },
  dragHandle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: getResponsiveHeight(0.5),
    pointerEvents: "none"
  },
  pressableContainer: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden"
  }
});

export default ThemedCardItem;