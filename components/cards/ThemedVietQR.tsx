import React, { memo, useMemo, useState, useEffect } from 'react';
import { Image, StyleSheet, View, InteractionManager, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/context/ThemeContext';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColor } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';

export type ThemedVietQRProps = {
    code: string;
    type: 'bank' | 'store' | 'ewallet';
    metadata: string;
    accountName?: string;
    accountNumber?: string;
};

export const ThemedVietQRCard = memo(function ThemedVietQRCard({
    code,
    type,
    metadata,
    accountName,
    accountNumber,
}: ThemedVietQRProps): JSX.Element {
    const { currentTheme } = useTheme();
    const { width } = useWindowDimensions();

    const qrSize = useMemo(() => width * 0.45, [width]);
    const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
    const iconPath = useMemo(() => getIconPath(code), [code]);
    const [shouldRenderCode, setShouldRenderCode] = useState(false);

    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setShouldRenderCode(true);
        });
        return () => task.cancel();
    }, []);

    return (
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
                <View style={styles.leftHeaderContainer}>
                    <View style={styles.iconContainer}>
                        <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                    </View>
                    <ThemedText type="defaultSemiBold" style={styles.companyName}>
                        {name}
                    </ThemedText>
                </View>
            </View>

            <View style={styles.qrContainer}>
                {shouldRenderCode && (
                    <View style={styles.qr}>
                        <QRCode
                            value={metadata}
                            size={qrSize}
                            logo={iconPath}
                            logoSize={qrSize * 0.2}
                            logoBackgroundColor="white"
                            logoBorderRadius={50}
                            logoMargin={5}
                            quietZone={3}
                        />
                    </View>
                )}
                <View style={styles.logoContainer}>
                    {/* <VIETQR width={70} height={30} style={styles.vietQRIcon} /> */}
                    <Image style={styles.vietQRIcon} source={require('@/assets/images/vietqr.png')} resizeMode="contain" />
                    <View style={styles.divider} />
                    <Image style={styles.napasIcon} source={require('@/assets/images/napas.png')} resizeMode="contain" />
                    {/* <NAPAS width={60} height={30} style={styles.napasIcon} /> */}
                </View>
                <View style={styles.infoContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>
                        {accountName}
                    </ThemedText>
                    <ThemedText style={styles.accountNumber} numberOfLines={1}>
                        {accountNumber}
                    </ThemedText>
                </View>
            </View>
        </LinearGradient>
    );
});

const styles = StyleSheet.create({
    itemContainer: {
        borderRadius: 15,
        paddingHorizontal: 15, // Horizontal: 15
        paddingVertical: 10,  // Vertical: 10
        overflow: 'hidden',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10, // Vertical: 10
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
    companyName: {
        fontSize: 16,
        color: 'white',
    },
    qrContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,  // Vertical: 10
        paddingHorizontal: 15, // Horizontal: 15
        paddingVertical: 5,   // Vertical: 5 (adjusted for smaller height)
        backgroundColor: '#fff',
        borderRadius: 15,
    },
    vietQRIcon: {
        width: '23%',
        height: 30,
    },
    divider: {
        width: 1.5,
        height: '50%',
        backgroundColor: '#535f78',
        marginHorizontal: 15,
    },
    napasIcon: {
        width: '21%',
        height: 20,
        marginTop: 5,
        marginLeft: 5,
    },
    qr: {
        padding: 10,
        borderRadius: 15,
        backgroundColor: 'white',
        marginBottom: 10, // Vertical: 10
    },
    infoContainer: {
        justifyContent: 'center',
    },
    accountName: {
        fontSize: 18,
        textAlign: 'center',
        color: 'white',
    },
    accountNumber: {
        fontSize: 16,
        textAlign: 'center',
        color: 'white',
    }
});