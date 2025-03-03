// QRResult.tsx
import React, { useCallback } from 'react';
import { StyleSheet, TouchableWithoutFeedback, Linking, Alert } from 'react-native'; // Import Alert
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { StyleProps } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { analyzeCode } from '@/utils/qrUtils'; // Import only necessary functions
import WifiManager from 'react-native-wifi-reborn';

type QRResultProps = {
    codeValue: string;
    codeType: string;          // Consider removing this if it's always derived from scanResult
    codeFormat?: number;
    iconName?: keyof typeof MaterialIcons.glyphMap;
    animatedStyle: StyleProps;
    onNavigateToAdd: (codeFormat?: number, codeValue?: string, bin?: string, codeType?: string, codeProvider?: string) => void;
    bin?: string;
    codeProvider?: string;
};

export const QRResult: React.FC<QRResultProps> = ({
    codeValue,
    codeType,  // Consider removing if unused
    codeFormat,
    iconName,
    animatedStyle,
    onNavigateToAdd,
    bin,
    codeProvider
}) => {

    const scanResult = analyzeCode(codeValue, { codeFormat });
    // console.log('scanResult:', scanResult); // Keep for debugging during development

    const getFormattedText = useCallback(() => {
        switch (scanResult.codeType) {
            case 'URL':
                return `Navigate to ${new URL(scanResult.rawCodeValue).hostname.replace(/^www\./, '')}?`;
            case 'WIFI':
                return `Connect to Wi-Fi ${scanResult.ssid}?`;
            case 'bank':
            case 'ewallet':
                return `Add QR Code.`;
            default:
                return scanResult.rawCodeValue;
        }
    }, [scanResult]);

    const onConnectToWifi = async (ssid: string, password: string, isWep: boolean, isHidden: boolean) => {
        try {
            await WifiManager.connectToProtectedSSID(ssid, password, isWep, isHidden);
            console.log("Connected successfully!");
            Alert.alert("Success", "Connected to Wi-Fi network!"); // User feedback
        } catch (error: any) {
            console.error("Connection failed:", error);
            // Handle specific errors and give user feedback:
            if (error === 'didNotFindNetwork') {
                Alert.alert("Error", "Wi-Fi network not found.");
            } else if (error === 'authenticationErrorOccurred') {
                Alert.alert("Error", "Incorrect Wi-Fi password.");
            } else if (error === 'locationPermissionMissing') {
                Alert.alert("Error", "Location permission is required to scan for Wi-Fi networks. Please enable it in settings.");
            } else {
                Alert.alert("Error", "Failed to connect to Wi-Fi."); // Generic error
            }
        }
    };


    const onResultTap = useCallback(() => {
        switch (scanResult.codeType) {
            case 'URL':
                Linking.openURL(scanResult.rawCodeValue);
                break;
            case 'WIFI':
                // Pass all necessary parameters, including isHidden:
                onConnectToWifi(scanResult.ssid, scanResult.password, scanResult.isWEP, scanResult.isHidden);
                break;
            case 'bank':
            case 'ewallet':
                onNavigateToAdd(scanResult.codeFormat, scanResult.rawCodeValue, scanResult.bin, scanResult.codeType, scanResult.provider);
                break;
        }
    }, [scanResult, onNavigateToAdd]);  // Correct dependencies


    const formattedText = getFormattedText();
    const resolvedIconName = iconName || scanResult.iconName;

    return (
        <TouchableWithoutFeedback onPress={onResultTap}>
            <Animated.View style={[styles.qrResultContainer, animatedStyle]}>
                <MaterialIcons name={resolvedIconName} size={18} color="black" />
                <ThemedText type='defaultSemiBold' numberOfLines={1} style={styles.qrResultText}>
                    {formattedText}
                </ThemedText>
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    qrResultContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFCC00', // Consider using themed colors
        borderRadius: 25,
        gap: 5,
        paddingVertical: 3,
        paddingHorizontal: 12,
    },
    qrResultText: {
        color: 'black',  // Consider using themed colors
        fontSize: 12,
        overflow: 'hidden',
        maxWidth: 200,
    },
});