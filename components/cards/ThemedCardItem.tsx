import React, { memo, useMemo, useEffect } from 'react';
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
    type: "bank" | "store" | "ewallet";
    metadata: string;
    metadata_type: "qr" | "barcode";
    accountName?: string;
    accountNumber?: string;
    onItemPress: () => void;
    onMoreButtonPress?: () => void;
    onDrag?: () => void;  // Add drag prop
    style?: object;
    isActive?: boolean; // Add isActive prop
};

const screenWidth = Dimensions.get('window').width;

export const ThemedCardItem = memo(function ThemedCardItem({
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
}: ThemedCardItemProps): JSX.Element {
    const colorScheme = useColorScheme();
    const colors = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
    const iconPath = useMemo(() => getIconPath(code), [code]);

    const handleItemPress = () => {
        if (!isActive) {
            onItemPress();
        }
    };

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
            <TouchableWithoutFeedback
                style={[styles.touchableHighlight, style]}
                onPress={handleItemPress}
                onLongPress={onDrag}
                delayLongPress={150}
            >
                <ThemedView
                    style={[styles.itemContainer, { backgroundColor: colorScheme === 'light' ? color.light : color.dark }]}
                >
                    <View style={styles.headerContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={styles.dragIconContainer}>
                                <Ionicons name={'menu'} size={18} color={colors} />
                            </View>

                            <View style={styles.leftHeaderContainer}>
                                <View style={styles.iconContainer}>
                                    <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                                </View>
                                <View style={styles.labelContainer}>
                                    <ThemedText type="defaultSemiBold" style={styles.companyName}>{name}</ThemedText>
                                    <ThemedText
                                        style={styles.companyFullName}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {type === "bank" ? `${'*'.repeat((accountNumber?.length ?? 0) - 3)}${accountNumber?.slice(-3)}` : full_name}
                                    </ThemedText>
                                </View>
                            </View>
                        </View>
                        <TouchableWithoutFeedback
                            onPress={onMoreButtonPress}
                            
                        >
                            <View style={styles.moreButtonContainer}>
                                <Ionicons name={'ellipsis-vertical'} size={18} color={colors} />
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                    <View style={styles.qrContainer}>
                        <View style={styles.qr}>
                            {metadata_type === "qr" ? (
                                <QRCode value={metadata} size={70} />
                            ) : (
                                <Barcode height={70} maxWidth={120} value={metadata} format="CODE128" />
                            )}
                        </View>
                    </View>
                    <View style={[styles.footerContainer, { backgroundColor: colorScheme === 'light' ? accent_color.light : accent_color.dark }]}>
                        <ThemedText style={styles.footerText} numberOfLines={1} ellipsizeMode="tail">
                            {accountName}
                        </ThemedText>
                    </View>
                </ThemedView>
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
    },
    companyFullName: {
        fontSize: 14,
        flexShrink: 1,
        flexWrap: 'nowrap',
        width: screenWidth * 0.5, // Adjust width based on screen size
        overflow: 'hidden',
    },
    moreButtonContainer: {
        borderRadius: 50,
        padding: 15,
        right: -15,
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
        justifyContent: 'flex-start',
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
