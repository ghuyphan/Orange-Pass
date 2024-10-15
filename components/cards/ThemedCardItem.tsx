import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { Image, StyleSheet, View, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColor } from '@/hooks/useThemeColor';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';

export type ThemedCardItemProps = {
  lightColor?: string;
  darkColor?: string;
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  onItemPress: () => void;
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
  style?: object;
  isActive?: boolean;
};

const screenWidth = Dimensions.get('window').width;

export const ThemedCardItem = memo(function ThemedCardItem(props: ThemedCardItemProps): JSX.Element {
  const {
    lightColor,
    darkColor,
    code,
    type,
    metadata,
    metadata_type,
    accountName,
    accountNumber,
    onItemPress,
    onMoreButtonPress,
    onDrag,
    style,
    isActive,
  } = props;

  const colorScheme = useColorScheme();
  const colors = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Memoize item data to prevent unnecessary recalculations
  const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);

  // Fallback colors
  const backgroundColor = colorScheme === 'light' ? color?.light || '#ffffff' : color?.dark || '#000000';
  const footerBackgroundColor = colorScheme === 'light' ? accent_color?.light || '#f0f0f0' : accent_color?.dark || '#303030';

  // Memoize icon path
  const iconPath = useMemo(() => getIconPath(code), [code]);

  // Memoize account display name
  const accountDisplayName = useMemo(() => {
    if (type === 'bank') {
      const length = accountNumber?.length ?? 0;
      const maskedLength = Math.max(0, length - 3);
      return `${'*'.repeat(maskedLength)}${accountNumber?.slice(-3)}`;
    } else {
      return full_name;
    }
  }, [type, accountNumber, full_name]);

  // Memoize press handlers
  const handleItemPress = useCallback(() => {
    if (!isActive) {
      onItemPress();
    }
  }, [isActive, onItemPress]);

  // Animated values
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0);
  const elevation = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scale.value = withTiming(1.06, { duration: 150 });
      shadowOpacity.value = withTiming(0.3, { duration: 150 });
      elevation.value = 5;
    } else {
      scale.value = withTiming(1, { duration: 100 });
      shadowOpacity.value = withTiming(0, { duration: 100 });
      elevation.value = 0;
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
    elevation: elevation.value,
    marginBottom: 30,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableWithoutFeedback onPress={handleItemPress} onLongPress={onDrag} delayLongPress={150}>
        <View style={[styles.touchableHighlight, style]}>
          <ThemedView style={[styles.itemContainer, { backgroundColor }]}>
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.dragIconContainer}>
                  <Ionicons name="menu-outline" size={18} color="white" />
                </View>
                <View style={styles.leftHeaderContainer}>
                  <View style={styles.iconContainer}>
                    <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                  </View>
                  <View style={styles.labelContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.companyName}>
                      {name}
                    </ThemedText>
                    <ThemedText style={styles.companyFullName} numberOfLines={1} ellipsizeMode="tail">
                      {accountDisplayName}
                    </ThemedText>
                  </View>
                </View>
              </View>
              {onMoreButtonPress && (
                <TouchableWithoutFeedback onPress={onMoreButtonPress}>
                  <View style={styles.moreButtonContainer}>
                    <Ionicons name="ellipsis-vertical-outline" size={18} color="white" />
                  </View>
                </TouchableWithoutFeedback>
              )}
            </View>
            <View style={styles.qrContainer}>
              <View style={styles.qr}>
                {metadata_type === 'qr' ? (
                  <QRCode value={metadata} size={70} />
                ) : (
                  <Barcode height={70} maxWidth={120} value={metadata} format="CODE128" />
                )}
              </View>
            </View>
            <View style={[styles.footerContainer, { backgroundColor: footerBackgroundColor }]}>
              <ThemedText style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
                {accountName}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  touchableHighlight: {
    borderRadius: 10,
  },
  itemContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 15,
    paddingRight: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragIconContainer: {
    paddingHorizontal: 10,
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 35,
    aspectRatio: 1,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  labelContainer: {
    flexDirection: 'column',
  },
  icon: {
    width: '60%',
    height: '60%',
  },
  companyName: {
    fontSize: 16,
    color: 'white',
  },
  companyFullName: {
    fontSize: 14,
    flexShrink: 1,
    width: screenWidth * 0.5,
    overflow: 'hidden',
    color: 'white',
  },
  moreButtonContainer: {
    borderRadius: 50,
    padding: 15,
    right: -20,
  },
  qrContainer: {
    padding: 15,
    alignItems: 'flex-end',
  },
  qr: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 0,
    paddingHorizontal: 15,
    paddingVertical: 5,
    gap: 10,
  },
  footerText: {
    maxWidth: '80%',
    fontSize: 14,
  },
});
