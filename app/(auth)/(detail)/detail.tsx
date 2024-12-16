import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Linking, FlatList, TextInput, Pressable, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { openBrowserAsync } from 'expo-web-browser';
import BottomSheet from '@gorhom/bottom-sheet';
import { throttle } from 'lodash';

// Local imports
import { RootState } from '@/store/rootReducer';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import QRRecord from '@/types/qrType';
// Components
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedPinnedCard } from '@/components/cards';
import { ThemedText } from '@/components/ThemedText';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';

// Utilities
import { returnItemData } from '@/utils/returnItemData';
import { getVietQRData } from '@/utils/vietQR';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemsByType } from '@/utils/returnItemData';
import { deleteQrCode, getQrCodeById, updateQrIndexes } from '@/services/localDB/qrDB';

import {
    setQrData,
    addQrData,
    updateQrData,
    removeQrData
} from '@/store/reducers/qrSlice';

// Constants
const AMOUNT_SUGGESTIONS = ['10,000', '50,000', '100,000', '500,000', '1,000,000'];

// Types
interface ItemData {
    code: string;
    type: 'bank' | 'store' | 'ewallet';
    metadata: string;
    metadata_type: 'qr' | 'barcode';
    account_name?: string;
    account_number?: string;
    style?: object;
}

interface BankItem {
    code: string;
    name: string;
}

// Utility function to format the amount
const formatAmount = (amount: string): string =>
    amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function DetailScreen() {
    // 1. Hooks (sorted alphabetically)
    const { currentTheme } = useTheme();
    const dispatch = useDispatch();
    const { item: encodedItem, id, user_id } = useLocalSearchParams();
    const qrData = useSelector((state: RootState) => state.qr.qrData);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);
    const router = useRouter();
    useUnmountBrightness(1, false);

    // 2. Refs
    const bottomSheetRef = useRef<BottomSheet>(null);

    // 3. State (sorted alphabetically)
    const [amount, setAmount] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);

    // 4. Memoized values (sorted alphabetically)
    const item = useMemo<ItemData | null>(() => {
        if (!encodedItem) return null;
        try {
            return JSON.parse(decodeURIComponent(String(encodedItem)));
        } catch (error) {
            console.error('Failed to parse item:', error);
            return null;
        }
    }, [encodedItem]);

    // 5. Derived values (sorted alphabetically)
    const cardColor = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;
    const iconColor = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;

    // Effects
    useEffect(() => {
        const loadBanks = () => {
            const banks = returnItemsByType('vietqr');
            setVietQRBanks(banks);
        };

        loadBanks();
    }, []);

    // Handlers
    const handleExpandPress = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(0);
    }, []);

    const onDeletePress = useCallback(async () => {
        if (!id) return;

        try {
            setIsSyncing(true);
            setIsToastVisible(true);
            setToastMessage(t('homeScreen.deleting'));

            // Delete the specific QR code from the database
            await deleteQrCode(id);

            // 1. Update Redux store directly
            const updatedData = qrData.filter(item => item.id !== id);
            const reindexedData = updatedData.map((item, index) => ({
                ...item,
                qr_index: index,
                updated: new Date().toISOString(),
            }));
            dispatch(setQrData(reindexedData));
            //   setIsEmpty(reindexedData.length === 0);

            // 2. Update indexes in the database 
            await updateQrIndexes(reindexedData);

            // Reset UI state
            setIsModalVisible(false);
            setIsToastVisible(false);
        } catch (error) {
            setToastMessage(t('homeScreen.deleteError'));
            setIsToastVisible(true);
        } finally {
            router.replace('/home');
            //   setSelectedItemId(null);
            setIsSyncing(false);
        }
    }, [id, qrData, dispatch, router]); // Include qrData in the dependency array


    const openMap = useCallback(() => {
        if (!item?.type || !item?.code) return;

        const itemName = returnItemData(item.code, item.type);
        if (!itemName?.name) return;

        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itemName.name)}`;

        Linking.openURL(url).catch((err) => {
            console.error('Failed to open Google Maps:', err);
            setIsToastVisible(true);
            setToastMessage(t('detailsScreen.failedToOpenGoogleMaps'));
        });
    }, [item]);

    // const openBank = useCallback(() => {
    const openBank = useCallback(async () => {
        const url = `https://dl.vietqr.io/pay?app=tpb`;
        try {
            await Linking.openURL(url);
        } catch (err) {
            console.error('Failed to open URL:', err);
        }
    }, []);

    const transferAmount = useCallback(
        throttle(async () => {
            if (!item?.type || !item?.code || !amount) return;

            setIsSyncing(true);
            setIsToastVisible(true);
            setToastMessage(t('detailsScreen.generatingQRCode'));

            try {
                const itemName = returnItemData(item.code, item.type);
                const message = t('detailsScreen.transferMessage') + ' ' + item.account_name;
                const response = await getVietQRData(
                    item.account_number ?? '',
                    item.account_name ?? '',
                    itemName?.bin || '',
                    parseInt(amount.replace(/,/g, '')),
                    message
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
            } catch (error) {
                console.error('Error generating QR code:', error);
            } finally {
                setIsSyncing(false);
                setIsToastVisible(false);
            }
        }, 500),
        [item, amount, router, t]
    );

    // Render helpers
    const renderSuggestionItem = useCallback(({ item: suggestionItem }: { item: string }) => (
        <Pressable
            onPress={() => setAmount(suggestionItem)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            style={[
                styles.suggestionItem,
                {
                    backgroundColor: currentTheme === 'light'
                        ? Colors.light.buttonBackground
                        : Colors.dark.buttonBackground,
                    overflow: 'hidden',
                },
            ]}
        >
            <ThemedText style={styles.suggestionText}>{suggestionItem}</ThemedText>
        </Pressable>
    ), [currentTheme]);

    const renderPaymentMethodItem = useCallback(({ item: bankItem, onPress }: { item: BankItem, onPress: (bankCode: string) => void }) => (
        <View style={styles.botSuggestionItem}>
            <Pressable
                style={styles.bankItemPressable}
                onPress={() => onPress(bankItem.code)}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            >
                <Image source={getIconPath(bankItem.code)} style={styles.bankIcon} resizeMode='contain' />
            </Pressable>
            <ThemedText numberOfLines={1} style={styles.bankItemText}>{bankItem.name}</ThemedText>
        </View>
    ), []);

    // Render guard
    if (!item) {
        return (
            <ThemedView style={styles.loadingWrapper}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }

    return (
        <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            style={[{ backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background }]}
            contentContainerStyle={styles.container}
            extraScrollHeight={100}
            extraHeight={200}
            enableOnAndroid
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerWrapper}>
                <ThemedButton onPress={router.back} iconName="chevron-left" />
                <ThemedButton onPress={handleExpandPress} iconName="dots-vertical" />
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

            <View style={[styles.infoWrapper, { backgroundColor: cardColor }]}>
                {/* Map Action */}
                <Pressable
                    onPress={openMap}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false }}
                    style={styles.actionButton}
                >
                    <MaterialCommunityIcons name="map-marker-outline" size={18} color={iconColor} />
                    <ThemedText style={styles.labelText}>
                        {t('detailsScreen.nearbyLocation')}
                    </ThemedText>
                </Pressable>

                {/* Transfer Section for Bank/E-Wallet */}
                {(item.type === 'bank' || item.type === 'ewallet') && (
                    <View style={[styles.transferContainer, isOffline ? { opacity: 0.4, pointerEvents: 'none' } : {}]}>
                        <View style={styles.transferHeader}>
                            <MaterialCommunityIcons name="qrcode" size={18} color={iconColor} />
                            <ThemedText style={styles.labelText}>
                                {t('detailsScreen.createQrCode')}
                            </ThemedText>
                        </View>
                        <View style={styles.transferSection}>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={[styles.inputField, { color: currentTheme === 'light' ? Colors.light.text : Colors.dark.text }]}
                                    placeholder={t('detailsScreen.receivePlaceholder')}
                                    keyboardType="numeric"
                                    value={amount}
                                    placeholderTextColor={currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                                    onChangeText={(text) => setAmount(formatAmount(text))}
                                />
                                {amount && (
                                    <Pressable
                                        hitSlop={{ bottom: 20, left: 15, right: 15, top: 20 }}
                                        onPress={() => setAmount('')}
                                        style={[styles.transferButton]}
                                    >
                                        <MaterialCommunityIcons name={'close-circle'} size={16} color={iconColor} />
                                    </Pressable>
                                )}
                                <View style={[styles.currencyContainer, currentTheme === 'light' ? { borderColor: 'rgba(0, 0, 0, 0.2)' } : { borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
                                    <ThemedText style={[styles.currencyText, currentTheme === 'light' ? { color: 'rgba(0, 0, 0, 0.2)' } : { color: 'rgba(255, 255, 255, 0.2)' }]}>đ</ThemedText>
                                </View>
                                <Pressable
                                    hitSlop={{ bottom: 20, left: 15, right: 15, top: 20 }}
                                    onPress={transferAmount}
                                    style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}
                                >
                                    <MaterialCommunityIcons name={amount ? 'navigation' : 'navigation-outline'} size={16} color={iconColor} />
                                </Pressable>
                            </View>
                            <FlatList
                                data={AMOUNT_SUGGESTIONS}
                                horizontal
                                style={styles.suggestionList}
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item}
                                contentContainerStyle={styles.suggestionListContent}
                                renderItem={renderSuggestionItem}
                                initialNumToRender={3}
                                maxToRenderPerBatch={3}
                                windowSize={3}
                            />
                        </View>
                    </View>
                )}

                {/* Bank Transfer Section for Store */}
                {item.type === 'store' && (
                    <View style={[styles.bottomContainer, { backgroundColor: cardColor }]}>
                        <View style={styles.bottomTitle}>
                            <MaterialCommunityIcons name="bank-outline" size={18} color={iconColor} />
                            <ThemedText>{t('detailsScreen.bankTransfer')}</ThemedText>
                            <Image source={require('@/assets/images/vietqr.png')} style={styles.vietQRLogo} resizeMode="contain" />
                        </View>
                        <FlatList
                            data={vietQRBanks}
                            horizontal
                            style={styles.botSuggestionList}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.code}
                            contentContainerStyle={styles.botSuggestionListContent}
                            renderItem={({ item: bankItem }) => (
                                renderPaymentMethodItem({ item: bankItem, onPress: openBank })
                            )}
                        // Optional: Add a loading or empty state component
                        />
                    </View>
                )}

                <ThemedStatusToast
                    isSyncing={isSyncing}
                    isVisible={isToastVisible}
                    message={toastMessage}
                    iconName="wifi-off"
                    onDismiss={() => setIsToastVisible(false)}
                    style={styles.toastContainer}
                />
            </View>

            <ThemedReuseableSheet
                ref={bottomSheetRef}
                title={t('homeScreen.manage')}
                snapPoints={['25%']}
                actions={[
                    {
                        icon: 'pencil-outline',
                        iconLibrary: 'MaterialCommunityIcons',
                        text: t('homeScreen.edit'),
                        onPress: () => bottomSheetRef.current?.close(),
                    },
                    {
                        icon: 'delete-outline',
                        iconLibrary: 'MaterialCommunityIcons',
                        text: t('homeScreen.delete'),
                        onPress: () => {
                            bottomSheetRef.current?.close();
                            setIsModalVisible(true);
                        },
                    }
                ]}
            />
            <ThemedModal
                primaryActionText={t('homeScreen.move')}
                onPrimaryAction={onDeletePress}
                onDismiss={() => setIsModalVisible(false)}
                dismissable={true}
                onSecondaryAction={() => setIsModalVisible(false)}
                secondaryActionText={t('homeScreen.cancel')}
                title={t('homeScreen.confirmDeleteTitle')}
                message={t('homeScreen.confirmDeleteMessage')}
                isVisible={isModalVisible}
                iconName="delete-outline"

            />
        </KeyboardAwareScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 15,

    },
    headerWrapper: {
        paddingTop: STATUSBAR_HEIGHT + 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    pinnedCardWrapper: {
        marginTop: 5,
        marginBottom: 30,
    },
    infoWrapper: {
        // paddingVertical: 5,
        paddingBottom: 15,
        borderRadius: 16,
        // gap: 5,
        overflow: 'hidden',
        backgroundColor: 'red',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        // paddingBottom: 10,
        // paddingTop: 20,
        gap: 10,
        borderRadius: 16,
        overflow: 'hidden',
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelText: {
        fontSize: 16,
    },
    transferContainer: {
        // gap: 10,
    },
    transferHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
        borderRadius: 16,
        overflow: 'hidden'
    },
    transferSection: {
        // marginTop: 15,
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    inputField: {
        // height: 50,
        marginVertical: 10,
        fontSize: 16,
        // width: 290,
        overflow: 'hidden',
        flexGrow: 1,
        flexShrink: 1
    },
    transferButton: {
        marginLeft: 5,
        transform: [{ rotate: '90deg' }],
    },
    bankItemPressable: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        height: 55,
        width: 55,
        justifyContent: 'center',
        alignItems: 'center'
    },
    bankIcon: {
        width: 30,
        height: 30
    },
    bankItemText: {
        fontSize: 12,
        maxWidth: 55
    },
    vietQRLogo: {
        height: 30,
        width: 70,
        marginLeft: -15
    },
    currencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 50,
        overflow: 'hidden',
        marginHorizontal: 10,
        borderWidth: 1,
    },
    currencyText: {
        fontSize: 16,
        // color: 'rgba(255, 255, 255, 0.1)',
        // opacity: 0.3
    },
    suggestionList: {
    },
    suggestionListContent: {
        gap: 10,
        paddingHorizontal: 20,
    },
    suggestionItem: {
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 16,
        overflow: 'hidden',
    },
    suggestionText: {
        fontSize: 16,
    },
    botSuggestionList: {
    },
    botSuggestionListContent: {
        gap: 25,
        paddingHorizontal: 15,
    },
    botSuggestionItem: {
        flexDirection: 'column',
        gap: 5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    botSuggestionText: {
        fontSize: 16,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
    },
    bottomContainer: {
        flexDirection: 'column',
        // marginTop: 20,
        gap: 15,
        // paddingHorizontal: 15,
        paddingBottom: 10,
        borderRadius: 16
    },
    bottomTitle: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        paddingHorizontal: 15
    }
});