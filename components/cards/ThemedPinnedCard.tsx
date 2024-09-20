import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import QRCode from 'react-native-qrcode-svg';
import Barcode from 'react-native-barcode-svg';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TouchableHighlight } from 'react-native';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedPinnedCard = {
    lightColor?: string;
    darkColor?: string;
    code: string;
    type: "bank" | "store" | "ewallet";
    metadata: string;
    metadata_type: "qr" | "barcode";
    accountName?: string;
    accountNumber?: string;
    onMoreButtonPress?: () => void;
    onItemLongPress?: () => void;
    style?: object;
};

export const ThemedPinnedCard = memo(function ThemedCardItem({
    lightColor,
    darkColor,
    code,
    type,
    metadata,
    metadata_type,
    accountName,
    accountNumber,
    onMoreButtonPress,
    onItemLongPress,
    style
}: ThemedPinnedCard): JSX.Element {
    const colorScheme = useColorScheme();
    const colors = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const { full_name, name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
    const iconPath = useMemo(() => getIconPath(code), [code]);

    return (
        <TouchableHighlight
            onLongPress={onItemLongPress}
            style={[styles.touchableHighlight, style]}
            underlayColor={colorScheme === 'light' ? color.dark : color.light}
        >
            <ThemedView
                style={[styles.itemContainer, { backgroundColor: colorScheme === 'light' ? color.light : color.dark }]}
            >
                <View style={styles.headerContainer}>
                    <View style={styles.leftHeaderContainer}>
                        <View style={styles.iconContainer}>
                            <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                        </View>
                        <View style={styles.labelContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.companyName}>{name}</ThemedText>
                        </View>
                    </View>
                </View>

                <View style={styles.qrContainer}>
                    <View style={styles.qr}>
                        {metadata_type == "qr" ? 
                            <QRCode
                            value={metadata}
                            size={150}
                            logo={iconPath}
                            logoSize={35}
                            logoBackgroundColor="white"
                            logoBorderRadius={50}
                            logoMargin={5}
                            quietZone={3}
                        /> :
                            <Barcode height={100} maxWidth={280} value={metadata} format="CODE128" />
                        }

                    </View>
                    {type == 'bank' && (
                        <View style={[styles.infoContainer, { marginTop: 15 }]}>
                            <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>{accountName}</ThemedText>
                            <ThemedText style={styles.accountNumber} numberOfLines={1}>{accountNumber}</ThemedText>
                        </View>
                    )}
                </View>
            </ThemedView>
        </TouchableHighlight>
    );
});

const styles = StyleSheet.create({
    touchableHighlight: {
        borderRadius: 15,
    },
    itemContainer: {
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 20,
        overflow: 'hidden',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    leftHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rightHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconContainer: {
        width: 45,
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
        width: '50%',
        height: '50%',
    },
    companyName: {
        fontSize: 20,
    },
    companyFullName: {
        fontSize: 14,
        flexShrink: 1,
        flexWrap: 'nowrap',
        width: 200,  // Adjust as needed
    },
    qrContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // paddingVertical: 15,
        paddingTop: 20
    },
    qr: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white'
    },
    infoContainer: {
        justifyContent: 'center',
    },
    accountName: {
        fontSize: 20,
        textAlign: 'center',
    },
    accountNumber: {
        fontSize: 16,
        textAlign: 'center',
    },
    expandIconContainer: {
        borderRadius: 50,
        padding: 10,
    },
});