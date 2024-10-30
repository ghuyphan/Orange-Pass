import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, TouchableWithoutFeedback, useColorScheme, Linking, Keyboard, FlatList, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
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
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { throttle } from 'lodash';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function DetailScreen() {
    const { item: encodedItem } = useLocalSearchParams();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const colorScheme = useColorScheme();
    const [amount, setAmount] = useState(''); // State to hold the amount of money
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);

    const iconColor = useColorScheme() === 'light' ? Colors.light.text : Colors.dark.text;

    useUnmountBrightness(0.8, true);

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

    const transferHeight = useSharedValue(0);

    const transferStyle = useAnimatedStyle(() => ({
        height: withTiming(transferHeight.value, { 
            duration: 300, 
            easing: Easing.out(Easing.ease) 
          }),
          marginTop: withTiming(transferHeight.value > 0 ? 10 : 0, { 
            duration: 300, 
            easing: Easing.out(Easing.ease) 
          }),
          opacity: withTiming(transferHeight.value > 0 ? 1 : 0, { 
            duration: 300, 
            easing: Easing.out(Easing.ease) 
          }),
          pointerEvents: transferHeight.value > 0 ? 'auto' : 'none',
    }));
    
    const onToggleTransfer = useCallback(() => {
        if (isOffline) return; // Prevent action if offline
        triggerLightHapticFeedback();
        transferHeight.value = transferHeight.value === 0 ? 90 : 0;
    }, [isOffline]);

    const transferAmount = useCallback(throttle(async () => {

        if (!item || !item.type || !item.code || !amount) return;
        
        triggerLightHapticFeedback();
        setIsSyncing(true);
        setIsToastVisible(true);

        const itemName = returnItemData(item.code, item.type);
        setToastMessage('Generating QR code...');

        try {
            const response = await getVietQRData(
                item.account_number,
                item.account_name,
                itemName.number_code,
                parseInt(amount.replace(/,/g, '')),
                'Hello'
            );

            const qrCode = response.data.qrCode;
            router.replace({
                pathname: '/qr-screen',
                params: {
                    metadata: qrCode,
                    amount: amount,
                    originalItem: encodeURIComponent(JSON.stringify(item)),
                },
            });
        } finally {
            setIsToastVisible(false);
        }
    }, 500), [item, amount])

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
            extraScrollHeight={50}
            showsVerticalScrollIndicator={false}
            scrollEnabled={isKeyboardVisible}
            style={{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }}
        >
            <ThemedView style={styles.mainContainer}>
                <View style={styles.headerWrapper}>
                    <ThemedButton onPress={router.back} iconName="chevron-back-outline" />
                    <ThemedButton onPress={handleExpandPress} iconName="ellipsis-vertical" />
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
                                {t('detailsScreen.nearbyLocation')}
                            </ThemedText>
                        </View>
                    </TouchableWithoutFeedback>

                    {(item.type === 'bank' || item.type === 'ewallet') && (
                        <View style={[styles.transferContainer,  isOffline ? { opacity: 0.4, pointerEvents: 'none' } : {}]}>
                            <TouchableWithoutFeedback onPress={onToggleTransfer}>
                                <View style={styles.actionButton}>
                                    <Ionicons name="qr-code-outline" size={20} color={iconColor} />
                                    <ThemedText style={styles.labelText} type="defaultSemiBold">
                                        {t('detailsScreen.createQrCode')}
                                    </ThemedText>
                                    {isOffline && (
                                    <Ionicons name="cloud-offline-outline" size={20} color={iconColor} />
                                )}
                                </View>
                            </TouchableWithoutFeedback>
                            {/* {isTransfer && ( */}
                                <Animated.View style={[styles.transferSection, transferStyle]}>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={[styles.inputField, { color: colorScheme === 'light' ? Colors.light.text : Colors.dark.text }]}
                                            placeholder={t('detailsScreen.receivePlaceholder')}
                                            keyboardType="numeric"
                                            value={amount}
                                            onChangeText={(text) => setAmount(formatAmount(text))}
                                        />
                                        <Pressable onPress={transferAmount} style={[styles.transferButton, {opacity: amount ? 1 : 0.3}]}>
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
                                                <View style={[styles.suggestionItem, { backgroundColor: colorScheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonHighlight }]}>
                                                    <ThemedText style={styles.suggestionText}>{item}</ThemedText>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </Animated.View>
                        </View>
                    )}
                </View>
                <ThemedBottomSheet
                    ref={bottomSheetRef}
                    onEditPress={() => { }}
                    editText={t('homeScreen.edit')}
                    deleteText={t('homeScreen.delete')}
                />
                <ThemedStatusToast
                    isSyncing={isSyncing}
                    isVisible={isToastVisible}
                    message={toastMessage}
                    iconName="cloud-offline"
                    onDismiss={() => setIsToastVisible(false)}
                    style={styles.toastContainer}
                />
            </ThemedView>
        </KeyboardAwareScrollView>
    );
}
const styles = StyleSheet.create({
    scrollViewContent: {
        // flexGrow: 1,
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
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    storeDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    labelText: {
        fontSize: 16,
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
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transferContainer: {
        // gap: 10,
    },
    transferSection: {
        // marginTop: 15,
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
    },
    inputField: {
        height: 50,
        fontSize: 16,
        width: 290,
        overflow: 'hidden',
    },
    transferButton: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginRight: -10,
    },
    suggestionListContent: {
        gap: 10,
        paddingHorizontal: 15,
    },
    suggestionItem: {
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
    },
    suggestionText: {
        fontSize: 16,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 40,
        left: 15,
        right: 15,
    },
});
