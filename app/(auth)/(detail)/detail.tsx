import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, useColorScheme, Linking, Keyboard, FlatList, TouchableOpacity, TextInput, Pressable } from 'react-native';
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
    const [isTransfer, setIsTransfer] = useState(false);

    const iconColor = useColorScheme() === 'light' ? Colors.light.text : Colors.dark.text;

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

    const onToggleTransfer = useCallback(() => {
        triggerLightHapticFeedback();
        setIsTransfer(!isTransfer);
    }, [isTransfer]);

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
            <ThemedView style={styles.loadingWrapper}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }
    
    return (
        <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollViewContent}
            enableOnAndroid={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isKeyboardVisible}
            style={{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }}
        >
            <ThemedView style={styles.mainContainer}>
                <View style={styles.headerWrapper}>
                    <ThemedButton onPress={router.back} iconName="chevron-back-outline" />
                    <ThemedButton onPress={handleExpandPress} iconName="ellipsis-vertical-outline" />
                </View>
                <ThemedPinnedCard
                    style={styles.pinnedCardWrapper}
                    metadata_type={item.metadata_type}
                    code={item.code}
                    type={item.type}
                    metadata={item.metadata}
                    accountName={item.account_name}
                    accountNumber={item.account_number}
                />

                <View style={[styles.infoWrapper, {
                    backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground,
                }]}>
                    <TouchableWithoutFeedback onPress={openMap}>
                        <View style={styles.actionButton}>
                            <Ionicons name="location-outline" size={20} color={iconColor} />
                            <ThemedText style={styles.labelText} type="defaultSemiBold">
                                Nearby Location
                            </ThemedText>
                        </View>
                    </TouchableWithoutFeedback>
                    {(item.type === 'bank' || item.type === 'ewallet') && (
                        <View style={styles.transferSection}>
                            <TouchableWithoutFeedback onPress={onToggleTransfer}>
                                <View style={styles.actionButton}>
                                    <Ionicons name="qr-code-outline" size={20} color={iconColor} />
                                    <ThemedText style={styles.labelText} type="defaultSemiBold">
                                        Create a transfer order
                                    </ThemedText>
                                </View>
                            </TouchableWithoutFeedback>
                            {isTransfer && (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }}>
                                        <TextInput
                                            style={styles.inputField}
                                            placeholder="Enter amount"
                                            keyboardType="numeric"
                                            value={amount}
                                            onChangeText={(text) => setAmount(formatAmount(text))}
                                        />
                                        <Pressable>
                                            <Ionicons name="chevron-forward-outline" size={20} color={iconColor} />
                                        </Pressable>
                                    </View>
                                    <FlatList
                                        data={amountSuggestions}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item) => item}
                                        contentContainerStyle={styles.suggestionListContent}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity onPress={() => setAmount(item)}>
                                                <View style={styles.suggestionItem}>
                                                    <ThemedText>{item}</ThemedText>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        style={styles.suggestionList}
                                    />
                                </>
                            )}
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
    scrollViewContent: {
        flexGrow: 1,
        paddingHorizontal: 15,
    },
    mainContainer: {
    },
    headerWrapper: {
        paddingTop: STATUSBAR_HEIGHT + 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
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
    storeDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    labelText: {
        fontSize: 16,
        marginBottom: 5,
    },
    truncatedText: {
        fontSize: 16,
        maxWidth: 300,
        overflow: 'hidden',
    },
    infoWrapper: { 
        marginTop: 30,
        borderRadius: 10,
        paddingVertical: 15,
    },
    actionButton: { 
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 15,
    },
    loadingWrapper: { 
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transferSection: { 
        marginTop: 15,
    },
    inputField: {
        height: 50,
        marginTop: 10,
        fontSize: 16,
        color: Colors.light.text,
        width: 300,
        overflow: 'hidden',
    },
    suggestionList: { 
        marginTop: 10,
        paddingHorizontal: 15,
    },
    suggestionListContent: {
        gap: 10,
    },
    suggestionItem: {
        backgroundColor: Colors.light.buttonBackground,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
    },
});
