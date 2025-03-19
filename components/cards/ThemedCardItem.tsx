import React, { memo, useMemo, useEffect } from "react";
import {
  Image,
  StyleSheet,
  View,
  Pressable,
  Text
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

// Create animated component once outside of component
const ReanimatedLinearGradient =
  Animated.createAnimatedComponent(LinearGradient);

export type ThemedCardItemProps = {
  isActive?: boolean;
  code: string;
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
};

const ThemedCardItem = memo(function ThemedCardItem({
  isActive = false,
  code,
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
  cardHolderStyle
}: ThemedCardItemProps): JSX.Element {
  // Derived data from the code using memoization
  const itemData = useMemo(() => returnItemData(code), [code]);
  const { name, color, accent_color, type: itemDataType } = itemData;

  const isDefaultCode = useMemo(() => code === "N/A", [code]);

  const cardType = useMemo(() => {
    if (type) return type;
    if (itemDataType) return itemDataType;
    return isDefaultCode ? "bank" : "store";
  }, [type, itemDataType, isDefaultCode]);

  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (cardType !== "store" && accountNumber) {
      const maskedLength = Math.max(0, accountNumber.length - 4);
      return `${"*".repeat(maskedLength)}${accountNumber.slice(-4)}`;
    }
    return "";
  }, [cardType, accountNumber]);

  const displayMetadata = useMemo(() => {
    return !isDefaultCode && metadata ? metadata : "";
  }, [metadata, isDefaultCode]);

  // Memoize the footer text so that we do not re-calculate it each render
  const footerText = useMemo(() => {
    // Only show text if iconPath is not a specific value (124) –
    // Note: adjust this check according to your actual logic.
    if (iconPath !== 124 && cardType) {
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
  }, [metadata_type]);

  // Memoize the metadata content (QR code or Barcode or placeholder)
  const metadataContent = useMemo(() => {
    if (!displayMetadata) {
      return (
        <Animated.View
          style={[styles.qrPlaceholder, animatedPlaceholderStyle]}
        />
      );
    }
    if (metadata_type === "qr") {
      return (
        <QRCode
          value={displayMetadata}
          size={getResponsiveWidth(18)}
        />
      );
    }
    return (
      <Barcode
        height={getResponsiveHeight(8.5)}
        maxWidth={getResponsiveWidth(31)}
        value={displayMetadata}
        format="CODE128"
      />
    );
  }, [
    displayMetadata,
    metadata_type,
    animatedPlaceholderStyle
  ]);

  const gradientColors = useMemo(
    () =>
      returnMidpointColors(
        color.light,
        accent_color.light,
        MIDPOINT_COUNT
      ) || ["#FAF3E7", "#D6C4AF"],
    [color, accent_color]
  );

  const cardContent = (
    <ReanimatedLinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardContainer, style, animatedStyle]}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.leftHeaderContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={iconPath}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.cardName}
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
              color="white"
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
            style={[styles.cardHolderName, cardHolderStyle]}
          >
            {accountName}
          </Text>

          {cardType && (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.cardType}
            >
              {footerText}
            </Text>
          )}
        </View>

        <View style={styles.qrContainer}>{metadataContent}</View>
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
  );

  return (
    <View style={styles.outerContainer}>
      {onItemPress ? (
        <Pressable
          disabled={isActive}
          onPress={onItemPress}
          onLongPress={onDrag}
          delayLongPress={250}
          android_ripple={{
            color: "rgba(0, 0, 0, 0.2)",
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
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    aspectRatio: 1.65,
    justifyContent: "space-between"
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
  logoContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(6),
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center"
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
    flexDirection: "column"
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
  qrContainer: {
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(2)
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(2)
  },
  dragHandle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none"
  },
  pressableContainer: {
    borderRadius: getResponsiveWidth(5),
    overflow: "hidden"
  }
});

export default ThemedCardItem;
