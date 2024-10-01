import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, useColorScheme, Linking, Keyboard, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { returnItemData } from '@/utils/returnItemData';
import { triggerLightHapticFeedback } from '@/utils/haptic';
import { getVietQRData } from '@/utils/vietQR';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function DetailScreen() {
    const { id, item: encodedItem } = useLocalSearchParams();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [amount, setAmount] = useState(''); // State to hold the amount of money
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    useUnmountBrightness(0.8, false);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, [isKeyboardVisible]);

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

    const openMap = useCallback(() => {
        triggerLightHapticFeedback();
        if (!item || !item.type || !item.code) return;

        let itemName = returnItemData(item.code, item.type);

        if (!itemName || !itemName.name) {
            console.error('Invalid itemName or itemName.name');
            return;
        }

        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itemName.name)}`;
        Linking.openURL(url).catch((err) => console.error('Failed to open Google Maps:', err));
    }, [item]);

    const transferAmount = useCallback(() => {
        triggerLightHapticFeedback();
        if (!item || !item.type || !item.code || !amount) return;

        let itemName = returnItemData(item.code, item.type);
        getVietQRData(item.account_number, item.account_name, itemName.number_code, parseInt(amount.replace(/,/g, '')), 'Hello')
            .then((response) => {
                console.log(response.data.qrCode);
            });
    }, [item, amount]);

    // Amount suggestions
    const amountSuggestions = ['10,000', '50,000', '100,000', '500,000', '1,000,000'];

    if (!item) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContainer}
            enableOnAndroid={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isKeyboardVisible}
            style={{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }}
        >
            <ThemedView style={styles.container}>
                <View style={styles.headerContainer}>
                    <ThemedButton onPress={router.back} iconName="chevron-back-outline" />
                    <ThemedButton onPress={handleExpandPress} iconName="ellipsis-vertical-outline" />
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
                    <View style={[styles.cardContainer, {
                        backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
                    }]}>
                        <View style={styles.storeContent}>
                            <View>
                                <ThemedText style={styles.memberIdText} type="defaultSemiBold">
                                    Member ID
                                </ThemedText>
                                <ThemedText
                                    style={styles.memberIdContent}
                                    numberOfLines={1}
                                    ellipsizeMode="middle"
                                >
                                    {item.metadata}
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                )}

                <View style={[styles.infoContainer, {
                    backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
                }]}>
                    <TouchableWithoutFeedback onPress={openMap}>
                        <View style={styles.button}>
                            <Ionicons name="location-outline" size={20} color={Colors.light.text} />
                            <ThemedText style={styles.memberIdText} type="defaultSemiBold">
                                Nearby Location
                            </ThemedText>
                        </View>
                    </TouchableWithoutFeedback>
                    {(item.type === 'bank' || item.type === 'ewallet') && (
                        <View style={styles.transferContainer}>
                            <TouchableWithoutFeedback onPress={transferAmount}>
                                <View style={styles.button}>
                                    <Ionicons name="qr-code-outline" size={20} color={Colors.light.text} />
                                    <ThemedText style={styles.memberIdText} type="defaultSemiBold">
                                        Create a transfer order
                                    </ThemedText>
                                </View>
                            </TouchableWithoutFeedback>
                            <TextInput
                                style={styles.customInput}
                                placeholder="Enter amount"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={(text) => setAmount(formatAmount(text))}
                            />
                            <FlatList
                                data={amountSuggestions}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => (
                                    <TouchableOpacity onPress={() => setAmount(item)}>
                                        <View style={styles.suggestionButton}>
                                            <ThemedText>{item}</ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                style={styles.suggestionStrip}
                            />
                        </View>
                    )}
                </View>
                <ThemedBottomSheet
                    ref={bottomSheetRef}
                    onEditPress={() => { }}
                    editText={t('homeScreen.edit')}
                    deleteText={t('homeScreen.delete')}
                />
            </ThemedView>
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    scrollViewContainer: {
        flexGrow: 1,
        paddingHorizontal: 15,
    },
    container: {},
    headerContainer: {
        paddingTop: STATUSBAR_HEIGHT + 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    pinnedCard: {
        marginTop: 20,
        marginBottom: 30,
    },
    cardContainer: {
        marginTop: 20,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    storeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    memberIdText: {
        fontSize: 16,
        marginBottom: 5,
    },
    memberIdContent: {
        fontSize: 16,
        maxWidth: 300,
        overflow: 'hidden',
    },
    infoContainer: {
        marginTop: 30,
        borderRadius: 10,
        paddingVertical: 15,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transferContainer: {
        marginTop: 15,
    },
    customInput: {
        height: 50,
        paddingHorizontal: 15,
        marginTop: 10,
        fontSize: 16,
        color: Colors.light.text,
    },
    suggestionStrip: {
        marginTop: 10,
    },
    suggestionButton: {
        backgroundColor: Colors.light.inputBackground,
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
});
