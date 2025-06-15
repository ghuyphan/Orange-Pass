import React, { useMemo } from "react";
import { Image, StyleSheet, View, Platform } from "react-native";
import { ThemedText } from "../ThemedText";
import QRCode from "react-native-qrcode-svg";
import { getIconPath } from "@/utils/returnIcon";
import { returnItemData } from "@/utils/returnItemData";
import { returnMidpointColors } from "@/utils/returnMidpointColor";
import { LinearGradient } from "expo-linear-gradient";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight
} from "@/utils/responsive";
import { useGlassStyle } from "@/hooks/useGlassStyle";

// Constants
const DEFAULT_GRADIENT_START = "#FAF3E7";
const DEFAULT_GRADIENT_END = "#D6C4AF";

export type ThemedVietQRProps = {
  code: string;
  type: "bank" | "store" | "ewallet" | "vietqr";
  metadata: string;
  accountName?: string;
  accountNumber?: string;
  style?: object;
  amount?: string;
  enableGlassmorphism?: boolean;
};

export const ThemedVietQRCard = ({
  code,
  type,
  metadata,
  accountName,
  accountNumber,
  style,
  amount,
  enableGlassmorphism = true
}: ThemedVietQRProps): JSX.Element => {
  const { overlayColor, borderColor } = useGlassStyle();
  
  const qrSize = useMemo(() => getResponsiveWidth(42), []);
  const itemData = useMemo(() => returnItemData(code, type), [code, type]);

  const displayName = itemData?.name || "Unknown Service";
  const displayColor = itemData?.color || { light: DEFAULT_GRADIENT_START };
  const displayAccentColor = itemData?.accent_color || {
    light: DEFAULT_GRADIENT_END
  };
  const iconPath = useMemo(() => getIconPath(code), [code]);

  const gradientColors = useMemo(
    () =>
      returnMidpointColors(
        displayColor.light,
        displayAccentColor.light,
        6
      ) || [displayColor.light, displayAccentColor.light],
    [displayColor, displayAccentColor]
  );

  // Glassmorphism gradient colors (more transparent)
  const glassGradientColors = useMemo(() => {
    if (!enableGlassmorphism) return gradientColors;
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

      {/* Glassmorphism overlay */}
      {enableGlassmorphism && (
        <View style={[styles.defaultOverlay, { backgroundColor: overlayColor }]} />
      )}

      <LinearGradient
        colors={enableGlassmorphism ? glassGradientColors : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.cardContainer,
          enableGlassmorphism && [styles.glassCard, { borderColor }]
        ]}
      >
        <View style={styles.headerContainer}>
          <View
            style={[
              styles.logoContainer,
              enableGlassmorphism && styles.glassLogoContainer
            ]}
          >
            <Image
              source={iconPath}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <ThemedText
            style={[
              styles.companyName,
              enableGlassmorphism && styles.glassText
            ]}
            numberOfLines={1}
          >
            {displayName}
          </ThemedText>
        </View>

        <View style={styles.codeContainer}>
          <View
            style={[
              styles.codeWrapper,
              enableGlassmorphism && styles.glassQrContainer
            ]}
          >
            <QRCode
              value={metadata}
              size={qrSize}
              quietZone={getResponsiveWidth(0.8)}
            />
          </View>
          <View style={styles.additionalInfoContainer}>
            <View
              style={[
                styles.brandContainer,
                enableGlassmorphism && styles.glassPill
              ]}
            >
              <Image
                style={styles.vietQRIcon}
                source={require("@/assets/images/vietqr.png")}
                resizeMode="contain"
              />
              <View style={styles.divider} />
              <Image
                style={styles.napasIcon}
                source={require("@/assets/images/napas.png")}
                resizeMode="contain"
              />
            </View>

            {amount && (
              <View
                style={[
                  styles.amountTextContainer,
                  enableGlassmorphism && styles.glassPill
                ]}
              >
                <ThemedText
                  style={[
                    styles.amountText,
                    enableGlassmorphism && styles.glassText
                  ]}
                  numberOfLines={1}
                >
                  {amount} VND
                </ThemedText>
              </View>
            )}

            <View style={styles.infoContainer}>
              {accountName && (
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.accountName,
                    enableGlassmorphism && styles.glassText
                  ]}
                  numberOfLines={1}
                >
                  {accountName}
                </ThemedText>
              )}
              {accountNumber && (
                <ThemedText
                  style={[
                    styles.accountNumber,
                    enableGlassmorphism && styles.glassSubText
                  ]}
                  numberOfLines={1}
                >
                  {accountNumber}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View
      style={[
        styles.outerContainer,
        enableGlassmorphism && styles.glassOuterContainer,
        style
      ]}
    >
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
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
    bottom: 0,
    opacity: 0.8
  },
  defaultOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0
  },
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    justifyContent: "space-between",
    position: "relative",
    zIndex: 1
  },
  glassCard: {
    borderWidth: 1,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderTopColor: "rgba(255, 255, 255, 0.3)",
    borderLeftColor: "rgba(255, 255, 255, 0.3)"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveHeight(2.4),
    gap: getResponsiveWidth(3.6)
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
  companyName: {
    color: "white",
    fontSize: getResponsiveFontSize(16),
    fontWeight: "bold",
    flex: 1
  },
  glassText: {
    color: "rgba(255, 255, 255, 0.95)",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  codeContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  codeWrapper: {
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(4),
    padding: getResponsiveWidth(2.5),
    marginBottom: getResponsiveHeight(1.8),
    alignItems: "center",
    justifyContent: "center"
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
  additionalInfoContainer: {
    width: "100%"
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: getResponsiveWidth(2.5),
    paddingVertical: getResponsiveHeight(0.6),
    paddingHorizontal: getResponsiveWidth(2.4),
    marginBottom: getResponsiveHeight(1.8)
  },
  glassPill: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)"
  },
  vietQRIcon: {
    width: getResponsiveWidth(18),
    height: getResponsiveHeight(3.6)
  },
  divider: {
    width: getResponsiveWidth(0.35),
    height: "60%",
    backgroundColor: "#535f78",
    marginHorizontal: getResponsiveWidth(2.5)
  },
  napasIcon: {
    width: getResponsiveWidth(15),
    height: getResponsiveHeight(2.4)
  },
  infoContainer: {
    alignItems: "center",
    justifyContent: "center"
  },
  accountName: {
    color: "white",
    fontSize: getResponsiveFontSize(19),
    fontWeight: "600",
    marginBottom: getResponsiveHeight(0.3)
  },
  accountNumber: {
    color: "rgba(255,255,255,0.7)",
    fontSize: getResponsiveFontSize(15),
    maxWidth: getResponsiveWidth(60)
  },
  glassSubText: {
    color: "rgba(255,255,255,0.8)",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  amountTextContainer: {
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingVertical: getResponsiveHeight(0.8),
    paddingHorizontal: getResponsiveWidth(4),
    borderRadius: getResponsiveWidth(2.5),
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveHeight(1.5),
    maxWidth: "80%"
  },
  amountText: {
    color: "white",
    fontSize: getResponsiveFontSize(15),
    fontWeight: "bold",
    textAlign: "center"
  }
});

export default ThemedVietQRCard;