import React, { useCallback } from 'react';
import {
    StyleSheet,
    TouchableWithoutFeedback,
    Linking,
    View, // Import View
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { StyleProps } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText'; // Use your themed text component

// Types
type QRResultProps = {
    codeValue: string;
    codeType: string;
    codeFormat?: number; // Add codeFormat
    iconName?: keyof typeof MaterialIcons.glyphMap;
    animatedStyle: StyleProps;
    onNavigateToAdd: (codeFormat?: number, codeValue?: string, bin?: string, codeType?: string, codeProvider?: string) => void; // Add this prop
    bin?: string;
    codeProvider?: string;
};

export const QRResult: React.FC<QRResultProps> = ({
    codeValue,
    codeType,
    codeFormat,
    iconName,
    animatedStyle,
    onNavigateToAdd,
    bin,
    codeProvider
}) => {

    const getFormattedText = useCallback(() => {
        switch (codeType) {
            case 'URL':
                try {
                    const urlObject = new URL(codeValue);
                    let domain = urlObject.hostname;
                    domain = domain.replace(/^www\./, '');
                    domain = domain.replace(/^en\.m\./, ''); //remove en.m.  Consider other subdomains too.
                    const domainParts = domain.split('.');
                    const siteName = domainParts[0];
                    const capitalizedSiteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
                    return `Navigate to ${capitalizedSiteName}?`;
                } catch (error) {
                    console.error("Error parsing URL:", error);
                    return `Open link?`; // Fallback text
                }

            case 'WIFI':
                try {
                    const match = codeValue.match(/WIFI:S:([^;]+)/);  // Extract SSID directly
                    if (match) {
                        const ssid = match[1];
                        return `Connect to Wi-Fi ${ssid}?`;
                    } else {
                        return "Connect to Wi-Fi?"; // Handle malformed WiFi strings
                    }
                } catch (error) {
                    console.error("Error parsing WIFI data:", error);
                    return "Connect to Wi-Fi?";
                }

            case 'bank':
                try {
                    console.log(codeValue); 
                    const bankData = codeValue.substring(5);
                    const bankParts = bankData.split(';');
                    let bankName = '';
                    for (const part of bankParts) {
                        if (part.startsWith('bank:')) {
                            bankName = part.substring(5);
                            break;
                        }
                    }
                    return `Add QR Code.`;
                } catch (error) {
                    console.error('Error parsing bank data', error)
                    return `Open bank application.`;
                }
            default:
                return codeValue; // Display raw value for unknown types
        }
    }, [codeValue, codeType]);



    const onResultTap = useCallback(() => {
        switch (codeType) {
            case 'URL':
                Linking.openURL(codeValue);
                break;
            case 'WIFI':
                // No action (as per your requirement)
                break;
            case 'bank':
                onNavigateToAdd(codeFormat, codeValue, bin, codeType, codeProvider); // Pass all necessary data
                break;
            default:
                // If it's not a special type, navigate to the add screen
              
                break;
        }
    }, [codeValue, codeType, codeFormat, onNavigateToAdd, bin, codeProvider]);

    const formattedText = getFormattedText();

    return (
        <TouchableWithoutFeedback onPress={onResultTap}>
            <Animated.View style={[styles.qrResultContainer, animatedStyle]}>
                <MaterialIcons name={iconName} size={18} color="black" />
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
        backgroundColor: '#FFCC00',
        borderRadius: 25,
        gap: 5,
        paddingVertical: 3,
        paddingHorizontal: 12,
    },
    qrResultText: {
        color: 'black',
        fontSize: 12,
        overflow: 'hidden',
        maxWidth: 200,
    },
});