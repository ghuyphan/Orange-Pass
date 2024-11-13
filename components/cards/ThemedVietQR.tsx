import React, { memo, useMemo, useState, useEffect } from 'react';
import { Image, StyleSheet, View, TouchableHighlight, InteractionManager, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import QRCode from 'react-native-qrcode-svg';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedVietQRProps = {
    lightColor?: string;
    darkColor?: string;
    code: string;
    type: 'bank' | 'store' | 'ewallet';
    metadata: string;
    accountName?: string;
    accountNumber?: string;
    amount?: string;
    style?: object;
};

export const ThemedVietQRCard = memo(function ThemedVietQRCard({
    lightColor,
    darkColor,
    code,
    type,
    metadata,
    accountName,
    accountNumber,
    amount,
    style,
}: ThemedVietQRProps): JSX.Element {
    const colorScheme = useColorScheme();
    const { width } = useWindowDimensions();

    // Calculate sizes based on screen width
    const qrSize = useMemo(() => width * 0.45, [width]); // Adjust QR code size to 50% of screen width

    // Memoize the result of returnItemData to avoid unnecessary computations
    const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);

    // Memoize iconPath to prevent re-computation
    const iconPath = useMemo(() => getIconPath(code), [code]);

    // State to control when to render the QR code or barcode
    const [shouldRenderCode, setShouldRenderCode] = useState(false);

    useEffect(() => {
        // Defer the rendering of the QR code/barcode to prevent blocking the UI thread
        const task = InteractionManager.runAfterInteractions(() => {
            setShouldRenderCode(true);
        });
        return () => task.cancel();
    }, []);

    // Memoize styles to avoid inline style objects causing re-renders
    const backgroundColorStyle = useMemo(
        () => ({
            backgroundColor: colorScheme === 'light' ? color.light : color.dark,
        }),
        [colorScheme, color.light, color.dark]
    );
    
    return (
            <ThemedView style={[styles.itemContainer, backgroundColorStyle]}>
                <View style={styles.headerContainer}>
                    <View style={styles.leftHeaderContainer}>
                        <View style={styles.iconContainer}>
                            <Image source={iconPath} style={styles.icon} resizeMode="contain" />
                        </View>
                        <View style={styles.labelContainer}>
                            <ThemedText type="defaultSemiBold" style={styles.companyName}>
                                {name}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                <View style={styles.qrContainer}>
                    {shouldRenderCode && (
                        <View style={styles.qr}>
                            <QRCode
                                value={metadata}
                                size={qrSize}
                                logo={iconPath}
                                logoSize={qrSize * 0.2} // Adjust logo size relative to the QR code size
                                logoBackgroundColor="white"
                                logoBorderRadius={50}
                                logoMargin={5}
                                quietZone={3}
                            />
                        </View>
                    )}
                    <View style={[styles.logoContainer]}>
                        <Image style={styles.vietQRIcon} source={require('@/assets/images/vietqr-icon.png')} resizeMode="contain" />
                        <View style={styles.divider} />
                        <Image style={styles.napasIcon} source={require('@/assets/images/napas-icon.png')} resizeMode="contain" />
                    </View>
                    {/* {type === 'bank' && ( */}
                    <View style={styles.infoContainer}>
                        <ThemedText type="defaultSemiBold" style={styles.accountName} numberOfLines={1}>
                            {accountName}
                        </ThemedText>
                        <ThemedText style={styles.accountNumber} numberOfLines={1}>
                            {accountNumber}
                        </ThemedText>

                    </View>
                </View>
            </ThemedView>
    );
});

const styles = StyleSheet.create({
    touchableHighlight: {
        borderRadius: 15,
    },
    itemContainer: {
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
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
    iconContainer: {
        width: 35,
        aspectRatio: 1,
        borderRadius: 50,
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
        fontSize: 18,
        color: 'white',
    },
    qrContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        paddingTop: 20,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // marginVertical: -10, 
        // marginBottom: -30, 
        // marginVertical: 10,
        paddingRight: 10,
        backgroundColor: '#fff',
        borderRadius: 10,

    },
    vietQRIcon: {
        width: '24%',
        marginRight: -5,
        height: 40,
    },
    divider: {
        width: 1,
        height: '40%',
        backgroundColor: '#535f78',
        marginHorizontal: 10,
    },
    napasIcon: {
        width: '22%',
        height: 30,
        marginTop: 5,
        marginLeft: 5,
    },
    qr: {
        padding: 10,
        borderRadius: 10,
        backgroundColor: 'white',
        marginBottom: 10,
    },
    infoContainer: {
        justifyContent: 'center',
        gap: 5, // Increased padding
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
