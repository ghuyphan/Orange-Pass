import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View, Pressable, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';

export type ThemedCardItemProps = {
  isActive?: boolean;
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
  animatedStyle?: object;
  onItemPress?: () => void;
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
};

const ThemedCardItem = memo(function ThemedCardItem(props: ThemedCardItemProps): JSX.Element {
  const {
    isActive,
    code,
    type,
    metadata,
    metadata_type = 'qr',
    accountName,
    accountNumber,
    style,
    animatedStyle,
    onItemPress,
    onMoreButtonPress,
    onDrag,
  } = props;

  const itemData = useMemo(() => returnItemData(code), [code]);
  const { name, color, accent_color, type: itemDataType } = itemData;

  // Determine if we should use the default metadata value
  const isDefaultCode = useMemo(() => code === 'N/A', [code]); // Or whatever your default code is

  // Determine the type based on priority:
  // 1. Explicitly set type in props
  // 2. Type derived from itemData
  // 3. Default to 'bank' if it's the default code, otherwise 'store'
  const cardType = useMemo(() => {
    if (type) return type;
    if (itemDataType) return itemDataType;
    return isDefaultCode ? 'bank' : 'store';
  }, [type, itemDataType, isDefaultCode]);

  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (cardType === 'bank' && accountNumber) {
      const maskedLength = Math.max(0, accountNumber.length - 4);
      return `${'*'.repeat(maskedLength)}${accountNumber.slice(-4)}`;
    }
    return accountName;
  }, [cardType, accountNumber, accountName]);

  // Use a placeholder or an empty string if metadata is not available or if it's the default code
  const displayMetadata = useMemo(() => {
    if (isDefaultCode || !metadata) {
      return ''; // Or a placeholder string like 'N/A' if you prefer
    }
    return metadata;
  }, [metadata, isDefaultCode]);

  const renderContent = () => (
    <LinearGradient
      colors={returnMidpointColors(color.light, accent_color.light, 6) || ['#FAF3E7', '#D6C4AF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.leftHeaderContainer}>
          <View style={styles.logoContainer}>
            <Image source={iconPath} style={styles.logo} resizeMode="contain" />
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cardName}>{name}</Text>
        </View>
        {onMoreButtonPress && (
          <Pressable
            onPress={onMoreButtonPress}
            hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={20} color="white" />
          </Pressable>
        )}
      </View>

      {/* Card Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cardHolderName}>{accountName}</Text>
          {cardType === 'bank' ? (
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cardType}>{accountDisplayName}</Text>
          ) : (
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cardType}>{displayMetadata}</Text>
          )}
        </View>
        <View style={styles.qrContainer}>
          {/* Conditionally render QR/Barcode based on displayMetadata */}
          {displayMetadata ? (
            metadata_type === 'qr' ? (
              <QRCode value={displayMetadata} size={70} />
            ) : (
              <Barcode height={70} maxWidth={125} value={displayMetadata} format="CODE128" />
            )
          ) : (
            <View style={styles.qrPlaceholder}/>
          )}
        </View>
      </View>

      {/* Drag Handle */}
      {onDrag && (
        <View style={styles.dragHandle}>
          <MaterialCommunityIcons name="drag-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      )}
    </LinearGradient>
  );

  return (
    <View style={[styles.outerContainer, { marginHorizontal: 15, marginBottom: 15 }]}>
      <Animated.View style={[animatedStyle, style]}>
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
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  outerContainer: {
    shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.1,
    // shadowRadius: 6,
    // elevation: 5,
  },
  cardContainer: {
    borderRadius: 16,
    // padding: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    aspectRatio: 1.65,
    justifyContent: 'space-between',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: 150, // Set a maximum width
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 25,
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
    fontSize: 16,
    fontWeight: '600',
    maxWidth: 150, // Set a maximum width
  },
  cardType: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
    maxWidth: 120, // Set a maximum width
    overflow: 'hidden',
  },
  qrContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
  },
  qrPlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
  },
  dragHandle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  pressableContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
});

export default ThemedCardItem;