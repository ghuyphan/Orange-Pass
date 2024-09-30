import React, { useCallback, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedPinnedCard } from '@/components/cards';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { t } from '@/i18n';
import { ThemedText } from '@/components/ThemedText';
import ThemedBottomSheet from '@/components/bottomsheet/ThemedBottomSheet';
import BottomSheet from '@gorhom/bottom-sheet';

export default function DetailScreen() {
    const { id, item: encodedItem } = useLocalSearchParams(); // Get 'id' and 'item' from params
    const bottomSheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const colorScheme = useColorScheme();

    // Use useUnmountBrightness hook
    useUnmountBrightness(0.8, true);

    // Deserialize the item using useMemo for optimization
    const item: QRRecord | null = useMemo(() => {
        if (!encodedItem) return null;
        try {
            return JSON.parse(decodeURIComponent(encodedItem as string));
        } catch (error) {
            console.error('Failed to parse item:', error);
            return null;
        }
    }, [encodedItem]);

    const handleExpandPress = useCallback(() => {
        bottomSheetRef.current?.expand();
    }, []);

    if (!item) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={styles.scrollViewContainer}
            style={[
                {
                    backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background,
                },
            ]}
        >
            <ThemedView style={styles.container}>
                <View style={styles.headerContainer}>
                    <ThemedButton onPress={router.back} iconName="chevron-back-outline" />
                    <ThemedButton onPress={handleExpandPress} iconName="ellipsis-vertical" />
                </View>
                <ThemedPinnedCard
                    style={styles.pinnedCard}
                    metadata_type={item.metadata_type}
                    code={item.code}
                    type={item.type}
                    metadata={item.metadata}
                    accountName={item.account_name}
                    accountNumber={item.account_number}
                />
                {item.type === 'store' && (
                    <View style={[styles.storeContainer, {
                        backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
                    }]}>
                        <View style={styles.storeContent}>
                            <ThemedText style={styles.memberIdText} type="defaultSemiBold">
                                Member ID
                            </ThemedText>
                            <ThemedText>
                                {item.code}
                            </ThemedText>
                            <ThemedText>{item.metadata}</ThemedText>
                        </View>
                    </View>
                )}
            </ThemedView>
            <ThemedBottomSheet
                ref={bottomSheetRef}
                onEditPress={() => {}}
                editText={t('homeScreen.edit')}
                deleteText={t('homeScreen.delete')}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
    },
    headerContainer: {
        paddingTop: STATUSBAR_HEIGHT + 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pinnedCard: {
        marginTop: 40,
    },
    storeContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginTop: 50,
    },
    storeContent: {
        flexDirection: 'column',
    },
    memberIdText: {
        fontSize: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerContainer: {
        flex: 1,
        marginTop: 50,
        gap: 15,
    },
});
