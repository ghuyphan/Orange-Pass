import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ThemedText } from '../ThemedText';
import QRCode from 'react-native-qrcode-svg';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';
import { returnMidpointColors } from '@/utils/returnMidpointColor';
import { LinearGradient } from 'expo-linear-gradient';

export type ThemedVietQRProps = {
    code: string;
    type: 'bank' | 'store' | 'ewallet';
    metadata: string;
    accountName?: string;
    accountNumber?: string;
    style?: object;
};

export const ThemedVietQRCard = memo(function ThemedVietQRCard({
    code,
    type,
    metadata,
    accountName,
    accountNumber,
    style,
}: ThemedVietQRProps): JSX.Element {
    const { width } = useWindowDimensions();

    const qrSize = useMemo(() => width * 0.44, [width]);
    const { name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);
    const iconPath = useMemo(() => getIconPath(code), [code]);

    return (
        <LinearGradient
            colors={
                returnMidpointColors(
                    color?.light || '#FAF3E7',
                    accent_color?.light || '#D6C4AF',
                    6
                ) || ['#FAF3E7', '#D6C4AF']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.container, style]}
        >
            <View style={styles.headerContainer}>
                <View style={styles.logoContainer}>
                    <Image source={iconPath} style={styles.logo} resizeMode="contain" />
                </View>
                <ThemedText style={styles.companyName}>
                    {name}
                </ThemedText>
            </View>

            <View style={styles.codeContainer}>
                <View style={styles.codeWrapper}>
                    <QRCode
                        value={metadata}
                        size={qrSize}
                        // logo={iconPath}
                        // logoSize={qrSize * 0.2}
                        // logoBackgroundColor="white"
                        // logoBorderRadius={50}
                        // logoMargin={5}
                        quietZone={3}
                    />
                </View>

                <View style={styles.additionalInfoContainer}>
                    <View style={styles.brandContainer}>
                        <Image 
                            style={styles.vietQRIcon} 
                            source={require('@/assets/images/vietqr.png')} 
                            resizeMode="contain" 
                        />
                        <View style={styles.divider} />
                        <Image 
                            style={styles.napasIcon} 
                            source={require('@/assets/images/napas.png')} 
                            resizeMode="contain" 
                        />
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
            </View>
        </LinearGradient>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        // padding: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 15,
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
    companyName: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    codeContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeWrapper: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 8,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    additionalInfoContainer: {
        width: '100%',
    },
    brandContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.4)',
        borderRadius: 10,
        padding: 5,
        marginBottom: 15,
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
    },
    infoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountName: {
        color: 'white',
        fontSize: 19,
        fontWeight: '600',
        // marginBottom: 5,
    },
    accountNumber: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        maxWidth: 250,
    },
});

export default ThemedVietQRCard;