import React, { useCallback } from 'react';
import {
    StyleSheet,
    View,
    TouchableWithoutFeedback,
    Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { StyleProps } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Components
import { ThemedText } from '@/components/ThemedText';

// Types
type QRResultProps = {
    codeValue: string;
    codeType: string;
    iconName?: keyof typeof MaterialCommunityIcons.glyphMap;
    animatedStyle: StyleProps;
};

export const QRResult: React.FC<QRResultProps> = ({ codeValue, codeType, iconName, animatedStyle }) => {
    const onResultTap = useCallback(() => {
        console.log('onResultTap', codeValue, codeType);
        switch (codeType) {
            case 'URL':
                // Linking.openURL(codeValue);
                console.log(codeValue);
                break;
            case 'WIFI':
                console.log(codeValue);
                break;
        }
    }, [codeValue, codeType]);

    return (

        <TouchableWithoutFeedback onPress={onResultTap}>
            <Animated.View style={[styles.qrResultContainer, animatedStyle]}>
                <MaterialIcons name={iconName} size={18} color="black" />
                <ThemedText type='defaultSemiBold' numberOfLines={1} style={styles.qrResultText}>
                    {codeValue}
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