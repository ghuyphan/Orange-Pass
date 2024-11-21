import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { ThemedText } from '@/components/ThemedText';
import { ThemedVietQRCard } from '@/components/cards/ThemedVietQR';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function CreateQRScreen() {
    const { metadata, amount, originalItem: encodedItem } = useLocalSearchParams();
    const router = useRouter();

    useUnmountBrightness(0.8, true);
    
    const item: QRRecord | null = useMemo(() => {
        if (!encodedItem) return null;
        try {
            return JSON.parse(decodeURIComponent(encodedItem as string));
        } catch (error) {
            console.error('Failed to parse item:', error);
            return null;
        }
    }, [encodedItem]);

    if (!item) {
        return (
            <ThemedView style={styles.loadingWrapper}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }

    return (
            <ThemedView style={styles.mainContainer}>
                <View style={styles.headerWrapper}>
                    <ThemedButton onPress={router.back} iconName="chevron-left" />
                </View>
                <ThemedVietQRCard
                    style={styles.pinnedCardWrapper}
                    code={item.code}
                    type={item.type}
                    metadata={metadata.toString()}
                    accountName={item.account_name}
                    accountNumber={item.account_number}
                    // amount={amount}
                />
            </ThemedView>
    );
}
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        paddingHorizontal: 15,
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerWrapper: {
        paddingTop: STATUSBAR_HEIGHT + 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    pinnedCardWrapper: {
        marginTop: 20,
        marginBottom: 30,
        
    },
    cardWrapper: {
        marginTop: 20,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
});
