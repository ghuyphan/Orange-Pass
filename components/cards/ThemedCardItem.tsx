import React, { memo, useMemo, useEffect } from 'react';
import { Image, StyleSheet, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';

const ReanimatedLinearGradient = Reanimated.createAnimatedComponent(LinearGradient);
export type ThemedCardItemProps = {
  isActive?: boolean;
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type?: 'qr' | 'barcode'; // Make metadata_type optional
  accountName?: string;
  accountNumber?: string;
  style?: object;
  animatedStyle?: object;
  onItemPress?: () => void;
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
  cardHolderStyle?: object;
};

const MIDPOINT_COUNT = 6; // Named constant

const ThemedCardItem = memo(function ThemedCardItem(props: ThemedCardItemProps): JSX.Element {
  const {
    isActive = false, // Default value for isActive
    code,
    type,
    metadata,
    metadata_type = 'qr', // Default value for metadata_type
    accountName,
    accountNumber,
    style,
    animatedStyle,
    onItemPress,
    onMoreButtonPress,
    onDrag,
    cardHolderStyle
  } = props;

  const itemData = useMemo(() => returnItemData(code), [code]);
  const { name, color, accent_color, type: itemDataType } = itemData;

  const isDefaultCode = useMemo(() => code === 'N/A', [code]);

  const cardType = useMemo(() => {
    if (type) return type;
    if (itemDataType) return itemDataType;
    return isDefaultCode ? 'bank' : 'store';
  }, [type, itemDataType, isDefaultCode]);

  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (cardType !== 'store') {
      if (accountNumber) {
        const maskedLength = Math.max(0, accountNumber.length - 4);
        return `${'*'.repeat(maskedLength)}${accountNumber.slice(-4)}`;
      } else {
        return '';
      }
    }
    return accountName;
  }, [cardType, accountNumber, accountName]);

  const displayMetadata = useMemo(() => {
    if (isDefaultCode || !metadata) {
      return '';
    }
    return metadata;
  }, [metadata, isDefaultCode]);


  // Reanimated Shared Value and Animated Style for QR/Barcode Placeholder
  const placeholderWidth = useSharedValue(getResponsiveWidth(16.8)); // Initial width for QR
  const placeholderHeight = useSharedValue(getResponsiveWidth(16.8));

  const animatedPlaceholderStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(placeholderWidth.value, { duration: 200 }),
      height: withTiming(placeholderHeight.value, { duration: 200 }),
    };
  });

  // Update shared values based on metadata_type
  useEffect(() => {
    if (metadata_type === 'barcode') {
      placeholderWidth.value = getResponsiveWidth(33.6);
      placeholderHeight.value = getResponsiveWidth(16.8);

    } else {
      placeholderWidth.value = getResponsiveWidth(16.8); // Reset to QR code size.
      placeholderHeight.value = getResponsiveWidth(16.8);
    }
  }, [metadata_type, placeholderWidth, placeholderHeight]);


  const renderContent = () => (
    <ReanimatedLinearGradient
      colors={returnMidpointColors(color.light, accent_color.light, MIDPOINT_COUNT) || ['#FAF3E7', '#D6C4AF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardContainer, style, animatedStyle]}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.leftHeaderContainer}>
          <View style={styles.logoContainer}>
            <Image source={iconPath} style={styles.logo} resizeMode="contain" />
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
              top: getResponsiveHeight(3.6),
            }}
            style={{marginRight: -getResponsiveWidth(2.4)}}
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
              {iconPath !== 124 ? cardType === 'store' ? displayMetadata : accountDisplayName : ''}
            </Text>
          )}
        </View>
        <View style={styles.qrContainer}>
          {displayMetadata ? (
            metadata_type === 'qr' ? (
              <QRCode value={displayMetadata} size={getResponsiveWidth(17)} />
            ) : (
              <Barcode
                height={getResponsiveHeight(8.4)}
                maxWidth={getResponsiveWidth(33)}
                value={displayMetadata}
                format="CODE128"
              />
            )
          ) : (
            <Animated.View style={[styles.qrPlaceholder, animatedPlaceholderStyle]} />
          )}
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
  );

  return (
    <View
      style={[
        styles.outerContainer,
        { marginHorizontal: getResponsiveWidth(3.6), marginBottom: getResponsiveHeight(1.8) },
      ]}
    >
      {onItemPress ? (
        <Pressable
          disabled={isActive}
          onPress={onItemPress}
          onLongPress={onDrag}
          delayLongPress={250}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
          style={styles.pressableContainer}
        >
          {renderContent()}
        </Pressable>
      ) : (
        renderContent()
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    shadowColor: '#000', // Or a dynamic color based on theme
    shadowOffset: { width: 0, height: 2 }, // Reduced shadow offset
    shadowOpacity: 0.1, // Reduced shadow opacity
    shadowRadius: 4, // Reduced shadow radius
    elevation: 5,
  },
  cardContainer: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    aspectRatio: 1.65,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(2.4),
  },
  cardName: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    maxWidth: getResponsiveWidth(36), // Consider making this more dynamic
  },
  logoContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(6),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  footerLeft: {
    flexDirection: 'column',
  },
  cardHolderName: {
    color: 'white',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    maxWidth: getResponsiveWidth(55), // Consider making this more dynamic
  },
  cardType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveHeight(0.6),
    maxWidth: getResponsiveWidth(32), // Consider making this more dynamic
    overflow: 'hidden',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(2),
  },
  qrPlaceholder: {
    width: getResponsiveWidth(16.8),  // Initial size for QR
    height: getResponsiveWidth(16.8), // Initial size for QR
    backgroundColor: 'white',
    borderRadius: getResponsiveWidth(2),
    padding: getResponsiveWidth(2),
  },
  dragHandle: {
        position: 'absolute', // Consider removing absolute positioning
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pressableContainer: {
    borderRadius: getResponsiveWidth(5),
    overflow: 'hidden',
  },
});

export default ThemedCardItem;