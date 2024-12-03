import React, { memo, useMemo, useEffect } from 'react';
import { Image, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColor } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useLocale } from '@/context/LocaleContext';

export type ThemedCardItemProps = {
  code: string;
  type: 'bank' | 'store' | 'ewallet';
  metadata: string;
  metadata_type: 'qr' | 'barcode';
  accountName?: string;
  accountNumber?: string;
  style?: object;
  animatedStyle?: object;
  onItemPress?: () => void; // onItemPress is now optional
  onMoreButtonPress?: () => void;
  onDrag?: () => void;
};

export const ThemedCardItem = memo(function ThemedCardItem(props: ThemedCardItemProps): JSX.Element {
  const {
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

  const { currentTheme } = useTheme();
  const { locale } = useLocale();

  const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type, locale]);
  const iconPath = useMemo(() => getIconPath(code), [code]);

  const accountDisplayName = useMemo(() => {
    if (type === 'bank') {
      const length = accountNumber?.length ?? 0;
      const maskedLength = Math.max(0, length - 4);
      return `${'*'.repeat(maskedLength)}${accountNumber?.slice(-4)}`;
    } else {
      return accountName;
    }
  }, [type, accountNumber, accountName]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      {onItemPress ? (
        <Pressable
          onPress={onItemPress}
          onLongPress={onDrag}
          delayLongPress={150}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
          style={{ marginHorizontal: 15, marginBottom: 15 }}
        >
          <LinearGradient
            colors={
              currentTheme === 'light'
                ? [color?.light || '#f0f8ff', returnMidpointColor(color.light, accent_color.light) || '#dcedff', accent_color?.light || '#a8d4ff']
                : [color?.dark || '#21252b', returnMidpointColor(color.dark, accent_color.dark) || '#343a40', accent_color?.dark || '#495057']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.itemContainer}
          >
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.dragIconContainer}>
                  <MaterialCommunityIcons name="menu" size={18} color="white" />
                </View>
                <View style={styles.leftHeaderContainer}>
                  <View style={styles.iconContainer}>
                    <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                  </View>
                  <View style={styles.labelContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.companyName}>
                      {name}
                    </ThemedText>
                    {type === 'bank' && (
                      <ThemedText style={styles.companyFullName} numberOfLines={1} ellipsizeMode="tail">
                        {accountDisplayName}
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
              {onMoreButtonPress && (
                <Pressable
                  onPress={onMoreButtonPress}
                  hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
                >
                  <MaterialCommunityIcons name="dots-vertical" size={18} color="white" />
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

            <View style={styles.footerContainer}>
              <ThemedText style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
                {accountNumber ? accountName : metadata}
              </ThemedText>
            </View>
          </LinearGradient>
        </Pressable>
      ) : ( // Render content directly without Pressable
        <LinearGradient
          colors={
            currentTheme === 'light'
              ? [color?.light || '#ffffff', returnMidpointColor(color.light, accent_color.light) || '#cccccc', accent_color?.light || '#f0f0f0']
              : [color?.dark || '#000000', returnMidpointColor(color.dark, accent_color.dark) || '#505050', accent_color?.dark || '#303030']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.itemContainer}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <View style={styles.dragIconContainer}>
                <MaterialCommunityIcons name="menu" size={18} color="white" />
              </View>
              <View style={styles.leftHeaderContainer}>
                <View style={styles.iconContainer}>
                  <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                </View>
                <View style={styles.labelContainer}>
                  <ThemedText type="defaultSemiBold" style={styles.companyName}>
                    {name}
                  </ThemedText>
                  {type === 'bank' && (
                    <ThemedText style={styles.companyFullName} numberOfLines={1} ellipsizeMode="tail">
                      {accountDisplayName}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
            {onMoreButtonPress && (
              <Pressable
                onPress={onMoreButtonPress}
                hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
              >
                <MaterialCommunityIcons name="dots-vertical" size={18} color="white" />
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

          <View style={styles.footerContainer}>
            <ThemedText style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
              {accountNumber ? accountName : metadata}
            </ThemedText>
          </View>
        </LinearGradient>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  },
  companyFullName: {
    fontSize: 14,
    width: '100%',
    color: 'white',
  },
  qrContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    marginVertical: 10,
    pointerEvents: 'none',
  },
  qr: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 15,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    // paddingVertical: 10, 
    paddingBottom: 10,
    pointerEvents: 'none',
  },
  footerText: {
    fontSize: 13,
    color: 'white',
  },
});