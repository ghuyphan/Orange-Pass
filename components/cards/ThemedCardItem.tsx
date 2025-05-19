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
import Barcode from "react-native-barcode-svg"; // Ensure defaultProps warning is fixed in this component's source
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
const ReanimatedLinearGradient =
  Animated.createAnimatedComponent(LinearGradient);

// Define a default structure for itemData using preferred fallback colors
const defaultItemData = {
  name: "...", // Use "..." as placeholder name
  color: { light: DEFAULT_GRADIENT_START, dark: DEFAULT_GRADIENT_END }, // Default light color
  accent_color: { light: DEFAULT_GRADIENT_END, dark: DEFAULT_GRADIENT_START }, // Default accent color
  type: "store", // Provide a default type
  // Add any other properties expected from returnItemData with defaults if necessary
  // e.g., bin: ""
};

// Define a default icon path or handle it in getIconPath
const defaultIconPath = null; // Or require a placeholder image: require('@/assets/images/placeholder-icon.png');

export type ThemedCardItemProps = {
  isActive?: boolean;
  code: string | null; // Code can be string or null
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
  code: rawCode, // Renamed prop to rawCode
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
  // Normalize code: treat null as an empty string.
  const code = useMemo(() => (rawCode === null ? "" : rawCode), [rawCode]);

  // Determine if the code signifies an empty or specific placeholder state ("N/A")
  const isCodeEmptyOrPlaceholder = useMemo(
    () => code === "" || code === "N/A",
    [code]
  );

  // Derived data from the code using memoization
  const itemData = useMemo(() => {
    if (isCodeEmptyOrPlaceholder) {
      return defaultItemData; // Use default data directly if code is empty or "N/A"
    }
    // Otherwise, attempt to fetch item data, falling back to default if not found
    return returnItemData(code) || defaultItemData;
  }, [code, isCodeEmptyOrPlaceholder]);

  // Now destructuring is safe because itemData is guaranteed to be an object
  const { name, color, accent_color, type: itemDataType } = itemData;

  // Specifically check if the normalized code is "N/A"
  const isN_ACode = useMemo(() => code === "N/A", [code]);

  const cardType = useMemo(() => {
    // Prioritize the explicitly passed 'type' prop
    if (type) return type;
    // Fallback to the type from itemData (which might be the default 'store')
    if (itemDataType) return itemDataType;
    // Final fallback based on isN_ACode (less likely needed if defaultItemData.type is set)
    return isN_ACode ? "bank" : "store";
  }, [type, itemDataType, isN_ACode]);

  // Use a default icon path if needed, or ensure getIconPath handles unknown codes gracefully
  const iconPath = useMemo(() => {
    if (isCodeEmptyOrPlaceholder) {
      return defaultIconPath; // Use default icon directly if code is empty or "N/A"
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
    // Don't display metadata if code is empty/placeholder or metadata itself is empty
    if (isCodeEmptyOrPlaceholder || !safeMetadata) {
      return "";
    }
    return safeMetadata;
  }, [metadata, isCodeEmptyOrPlaceholder]);

  // Memoize the footer text so that we do not re-calculate it each render
  const footerText = useMemo(() => {
    // Check if iconPath is valid before comparing (adjust 124 if needed)
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

  // Memoize the metadata content (QR code or Barcode or placeholder)
  const metadataContent = useMemo(() => {
    // displayMetadata will be "" if code is empty/placeholder or metadata prop is empty
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
          size={QR_SIZE} // Use constant for consistency
        />
      );
    }
    // Ensure Barcode component handles empty string gracefully if displayMetadata can be ''
    return (
      <Barcode
        height={BARCODE_HEIGHT} // Use constant
        maxWidth={BARCODE_WIDTH} // Use constant
        value={displayMetadata}
        format="CODE128"
      />
    );
  }, [displayMetadata, metadata_type, animatedPlaceholderStyle]);

  const gradientColors = useMemo(
    () =>
      // itemData.color and itemData.accent_color will be from defaultItemData if code was empty/placeholder
      returnMidpointColors(
        color?.light,
        accent_color?.light,
        MIDPOINT_COUNT
      ) || [color.light, accent_color.light], // Fallback to the current (potentially default) colors
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
            {/* Conditionally render Image only if iconPath is valid */}
            {iconPath ? (
              <Image
                source={iconPath}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              // Optional: Render a placeholder icon/view if iconPath is null/defaultIconPath
              <View style={styles.logo} />
            )}
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.cardName}
          >
            {name} {/* name is now guaranteed to be a string ("..." if default) */}
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
            {accountName || ""} {/* Ensure accountName is string */}
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

        {/* Ensure qrContainer styles accommodate the placeholder */}
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
    alignItems: "center",
    overflow: "hidden" // Keep logo contained
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
    pointerEvents: "none" // Keep this if interactions should go through the Pressable wrapper
  },
  footerLeft: {
    flexDirection: "column",
    justifyContent: "flex-end", // Align text towards the bottom
    flexShrink: 1, // Allow text to shrink if needed
    paddingRight: getResponsiveWidth(1) // Add some space between text and QR
  },
  cardHolderName: {
    color: "white",
    fontSize: getResponsiveFontSize(15),
    fontWeight: "600",
    maxWidth: getResponsiveWidth(54) // Adjust as needed
  },
  cardType: {
    color: "rgba(255,255,255,0.7)",
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveHeight(0.6),
    maxWidth: getResponsiveWidth(32), // Adjust as needed
    overflow: "hidden"
  },
  qrContainer: {
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(1.5), // Slightly reduced padding
    alignSelf: "flex-end" // Align to the bottom right of the footer
  },
  qrPlaceholder: {
    // Dimensions are applied by animatedPlaceholderStyle
    // backgroundColor: "#E0E0E0", // Light grey placeholder background
    borderRadius: getResponsiveWidth(1.5) // Match container's padding/radius
    // No explicit padding needed here, size comes from animation
  },
  dragHandle: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: getResponsiveHeight(0.5), // Add slight padding if needed
    pointerEvents: "none"
  },
  pressableContainer: {
    borderRadius: getResponsiveWidth(4), // Match cardContainer borderRadius
    overflow: "hidden"
  }
});

export default ThemedCardItem;
