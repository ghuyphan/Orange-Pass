import React, { memo, useMemo, useEffect, useCallback } from 'react';
import { Image, StyleSheet, View, Dimensions, Pressable } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData'; 
import { returnMidpointColor } from "@/utils/returnMidpointColor"
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useLocale } from '@/context/LocaleContext'; 

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

  const { currentTheme } = useTheme();
  const { locale } = useLocale();
  const colors = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

  const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type, locale), [code, type, locale]);

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
    marginHorizontal: 15,
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
        delayLongPress={200}
        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
      >
        <View style={[styles.touchableHighlight, style]}>
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
                  <MaterialIcons name="menu" size={18} color="white" />
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
                  <MaterialIcons name="more-vert" size={18} color="white" />
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
  },
  companyFullName: {
    fontSize: 14,
    flexShrink: 1,
    width: screenWidth * 0.5,
    overflow: 'hidden',
    color: 'white',
  },
  qrContainer: {
    marginVertical: 10,
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
    paddingBottom: 10,
    pointerEvents: 'none',
  },
  footerText: {
    fontSize: 13,
    color: 'white',
  },
});
