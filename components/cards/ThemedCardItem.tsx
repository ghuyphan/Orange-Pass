import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { Image, StyleSheet, View, Dimensions, Pressable } from 'react-native';
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

  const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);

  const backgroundColor = colorScheme === 'light' ? color?.light || '#ffffff' : color?.dark || '#000000';
  const footerBackgroundColor = colorScheme === 'light' ? accent_color?.light || '#f0f0f0' : accent_color?.dark || '#303030';

  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (type === 'bank') {
      const length = accountNumber?.length ?? 0;
      const maskedLength = Math.max(0, length - 4);
      return `${'*'.repeat(maskedLength)}${accountNumber?.slice(-4)}`;
    } else {
      return full_name;
    }
  }, [type, accountNumber, full_name]);

  const handleItemPress = useCallback(() => {
    if (!isActive) {
      onItemPress();
    }
  }, [isActive, onItemPress]);

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
    marginBottom: 25,
    borderRadius: 10,
    overflow: 'hidden'
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handleItemPress}
        onLongPress={onDrag}
        delayLongPress={150}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
      >
        <View style={[styles.touchableHighlight, style]}>
          <ThemedView style={[styles.itemContainer, { backgroundColor }]}>
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.dragIconContainer}>
                  <Ionicons name="menu" size={18} color="white" />
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
                <Pressable
                  onPress={onMoreButtonPress}
                  hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color="white" />
                </Pressable>
              )}
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qr}>
                {metadata_type === 'qr' ? (
                  <QRCode value={metadata} size={75} />
                ) : (
                  <Barcode height={75} maxWidth={150} value={metadata} format="CODE128" />
                )}
              </View>
            </View>

            <View style={[styles.footerContainer, { backgroundColor: footerBackgroundColor }]}>
              <ThemedText style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
                {accountName || ' '}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  touchableHighlight: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemContainer: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 15,
    pointerEvents: 'box-none',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dragIconContainer: {
    pointerEvents: 'none',
  },
  leftHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 35,
    aspectRatio: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  icon: {
    width: '60%',
    height: '60%',
  },
  labelContainer: {
    flexDirection: 'column',
    pointerEvents: 'none',
  },
  companyName: {
    fontSize: 14,
    color: 'white',
    marginBottom: -2,
  },
  companyFullName: {
    fontSize: 14,
    flexShrink: 1,
    width: screenWidth * 0.5,
    overflow: 'hidden',
    color: 'white',
  },
  qrContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'flex-end',
    pointerEvents: 'none',
  },
  qr: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    pointerEvents: 'none',
  },
  footerText: {
    fontSize: 13,
    color: 'white',
  },
});
