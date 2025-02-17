import React, { useCallback } from 'react';
import {
    StyleSheet,
    TouchableWithoutFeedback,
    Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { StyleProps } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // You might not need this, depending on the icons.

// Components
import { ThemedText } from '@/components/ThemedText';

// Types
type QRResultProps = {
    codeValue: string;
    codeType: string;
    iconName?: keyof typeof MaterialIcons.glyphMap;
    animatedStyle: StyleProps;
};

export const QRResult: React.FC<QRResultProps> = ({ codeValue, codeType, iconName, animatedStyle }) => {

    const getFormattedText = useCallback(() => {
        switch (codeType) {
            case 'URL':
                try {
                    //  Split the codeValue string using the delimiter.
                    const parts = codeValue.split(' ');
                    // Get the link.
                    const url = parts[2];

                    console.log(url);

                    // Extract a descriptive name from the URL (e.g., "wikipedia" from "en.m.wikipedia.org")
                    const urlObject = new URL(url); // Use the URL constructor for robust parsing
                    let domain = urlObject.hostname; // e.g., "en.m.wikipedia.org"

                    // Remove "www." and "en.m." prefixes, and get the main domain part.
                    domain = domain.replace(/^www\./, ''); // Remove "www." if present
                    domain = domain.replace(/^en\.m\./, ''); //remove en.m.
                    const domainParts = domain.split('.');
                    const siteName = domainParts[0]; //  "wikipedia"

                    // Capitalize the first letter for better display
                    const capitalizedSiteName = siteName.charAt(0).toUpperCase() + siteName.slice(1);

                    return `Navigate to ${capitalizedSiteName}?`;

                } catch (error) {
                    // Handle potential URL parsing errors (e.g., invalid URL)
                    console.error("Error parsing URL:", error);
                    return `Open link?`; // Fallback text
                }

            case 'WIFI':
                // Example WIFI string (adapt as needed):  WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
                try {
                    const wifiData = codeValue.substring(5); //Remove the WIFI: at the begining.
                    const wifiParts = wifiData.split(';');
                    let ssid = '';
                    for(const part of wifiParts){
                        if(part.startsWith("S:")){
                            ssid = part.substring(2); //extract the name
                            break;
                        }
                    }

                    return `Connect to Wi-Fi ${ssid}?`;
                } catch (error) {
                    console.error("Error parsing WIFI data:", error);
                    return "Connect to Wi-Fi?";
                }
            
            case 'bank':
                 //Example:  bank:BAWAG;bic:BKAUATWW;
                 try{
                    const bankData = codeValue.substring(5);
                    const bankParts = bankData.split(';');
                    let bankName = '';
                    for(const part of bankParts){
                        if(part.startsWith('bank:')){
                           bankName = part.substring(5);
                           break;
                        }
                    }
                    return `Open ${bankName} application.`;
                 }catch(error){
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
                const parts = codeValue.split(' ');
                const url = parts[2];
                Linking.openURL(url);
                break;
            case 'WIFI':
               //No action for the case of WIFI in this moment.
                break;
            case 'bank':
                //No action for the case of bank
                break;
            
        }
    }, [codeValue, codeType]);

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
        maxWidth: 200,  // Increased max width
    },
});