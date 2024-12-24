import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Linking, FlatList, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { throttle } from 'lodash';
import { MMKV } from 'react-native-mmkv';

// Local imports
import { RootState } from '@/store/rootReducer';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
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
import { deleteQrCode, updateQrIndexes } from '@/services/localDB/qrDB';

import { setQrData } from '@/store/reducers/qrSlice';

// Constants
const AMOUNT_SUGGESTIONS = ['10,000', '50,000', '100,000', '500,000', '1,000,000'];
const LAST_USED_BANK_KEY = 'lastUsedBank';

// Types
interface ItemData {
    id: string;
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

// MMKV instance
const storage = new MMKV();

// Utility function to format the amount
const formatAmount = (amount: string): string =>
    amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');


const DetailScreen = () => {
    const { currentTheme } = useTheme();
    const dispatch = useDispatch();
    const { item: encodedItem, id } = useLocalSearchParams();
    const qrData = useSelector((state: RootState) => state.qr.qrData);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);
    const router = useRouter();
    useUnmountBrightness(1, false);

    const bottomSheetRef = useRef<BottomSheet>(null);

    const [amount, setAmount] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);
    const [isLoadingBanks, setIsLoadingBanks] = useState(true);

    const item = useMemo<ItemData | null>(() => {
        if (!encodedItem) return null;
        try {
            return JSON.parse(decodeURIComponent(String(encodedItem)));
        } catch (error) {
            console.error('Failed to parse item:', error);
            return null;
        }
    }, [encodedItem]);

    const cardColor = useMemo(() => currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground, [currentTheme]);
    const buttonColor = useMemo(() => currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground, [currentTheme]);
    const buttonTextColor = useMemo(() => currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon, [currentTheme]);
    const iconColor = useMemo(() => currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon, [currentTheme]);

    useEffect(() => {
        const loadBanks = async () => {
            if (item?.type !== 'store') return;
    
            const lastUsedBankCode = storage.getString(LAST_USED_BANK_KEY);
            let banks = returnItemsByType('vietqr');
    
            if (lastUsedBankCode) {
                const lastUsedBankIndex = banks.findIndex(bank => bank.code === lastUsedBankCode);
                if (lastUsedBankIndex !== -1) {
                    const lastUsedBank = banks.splice(lastUsedBankIndex, 1)[0];
                    banks.unshift(lastUsedBank);
                }
            }
    
            setVietQRBanks(banks);
            setIsLoadingBanks(false);
        };
    
        setTimeout(() => {
            loadBanks();
        }, 300);
    }, [item?.type]);

    const handleExpandPress = useCallback(() => {
        bottomSheetRef.current?.snapToIndex(0);
    }, []);

    const handleDeletePress = useCallback(async () => {
        if (!id || Array.isArray(id)) return;

        try {
            setIsSyncing(true);
            setIsToastVisible(true);
            setToastMessage(t('homeScreen.deleting'));

            await deleteQrCode(id);

            const updatedData = qrData.filter(qrItem => qrItem.id !== id);
            const reindexedData = updatedData.map((qrItem, index) => ({
                ...qrItem,
                qr_index: index,
                updated: new Date().toISOString(),
            }));
            dispatch(setQrData(reindexedData));

            await updateQrIndexes(reindexedData);

            setIsModalVisible(false);
            setIsToastVisible(false);
            router.replace('/home');
        } catch (error) {
            console.error('Error deleting QR code:', error)
            setToastMessage(t('homeScreen.deleteError'));
            setIsToastVisible(true);
        } finally {
            setIsSyncing(false);
        }
    }, [id, qrData, dispatch, router]);

    const handleOpenMap = useCallback(() => {
        if (!item) return;

        const itemName = returnItemData(item.code, item.type);
        if (!itemName?.name) return;

        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itemName.name)}`;

        Linking.openURL(url).catch((err) => {
            console.error('Failed to open Google Maps:', err);
            setIsToastVisible(true);
            setToastMessage(t('detailsScreen.failedToOpenGoogleMaps'));
        });
    }, [item]);

    const handleOpenBank = useCallback(async (code: string) => {
        let lowerCaseCode = code.toLowerCase();
    
        if (lowerCaseCode === 'vib') {
            lowerCaseCode = 'vib-2';
        } else if (lowerCaseCode === 'acb') {
            lowerCaseCode = 'acb-biz';
        }
    
        const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;
        try {
            await Linking.openURL(url);
            storage.set(LAST_USED_BANK_KEY, code); 

            if (item?.type === 'store') {
                const updatedBanks = [...vietQRBanks];
                const bankIndex = updatedBanks.findIndex(bank => bank.code === code);
                if (bankIndex !== -1) {
                    const selectedBank = updatedBanks.splice(bankIndex, 1)[0];
                    updatedBanks.unshift(selectedBank);
                    setVietQRBanks(updatedBanks);
                }
            }
        } catch (err) {
            console.error('Failed to open URL:', err);
        }
    }, [vietQRBanks, item?.type]);
    

    const handleTransferAmount = useCallback(
        throttle(async () => {
            if (!item || !amount) return;

            setIsSyncing(true);
            setIsToastVisible(true);
            setToastMessage(t('detailsScreen.generatingQRCode'));

            try {
                const itemName = returnItemData(item.code, item.type);
                const message = `${t('detailsScreen.transferMessage')} ${item.account_name}`;
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
                setIsToastVisible(true);
                setToastMessage(t('detailsScreen.generateError'));
            } finally {
                setIsSyncing(false);
                // setIsToastVisible(false);
            }
        }, 500),
        [item, amount, router]
    );

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

    const renderPaymentMethodItem = useCallback(({ item: bankItem }: { item: BankItem }) => (
        <Pressable
            style={[styles.bankItemPressable, { backgroundColor: buttonColor }]}
            onPress={() => handleOpenBank(bankItem.code)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
        >
            <View style={styles.bankIconContainer}>
                <Image source={getIconPath(bankItem.code)} style={styles.bankIcon} resizeMode='contain' />
            </View>
            <ThemedText numberOfLines={1} style={[styles.bankItemText, { color: buttonTextColor }]}>{bankItem.name}</ThemedText>
        </Pressable>
    ), [handleOpenBank, buttonColor, buttonTextColor]);

    const renderEmptyComponent = useCallback(() => (
        <View style={styles.loadingSkeleton}>
            <ActivityIndicator size={25} color={iconColor} />
        </View>
    ), [iconColor]);

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
                    onPress={handleOpenMap}
                    android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false }}
                    style={styles.actionButton}
                >
                    <View style={styles.actionHeader}>
                        <MaterialCommunityIcons name="map-marker-outline" size={16} color={iconColor} />
                        <ThemedText style={styles.labelText}>
                            {t('detailsScreen.nearbyLocation')}
                        </ThemedText>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={iconColor} />
                </Pressable>

                {/* Transfer Section for Bank/E-Wallet */}
                {(item.type === 'bank' || item.type === 'ewallet') && (
                    <View style={[styles.transferContainer, isOffline ? { opacity: 0.4, pointerEvents: 'none' } : {}]}>
                        <View style={styles.transferHeader}>
                            <MaterialCommunityIcons name="qrcode" size={16} color={iconColor} />
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
                                    onPress={handleTransferAmount}
                                    style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}
                                >
                                    <MaterialCommunityIcons name={amount ? 'chevron-right' : 'chevron-right'} size={16} color={iconColor} />
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
                            style={styles.bankList}
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={(item) => item.code}
                            contentContainerStyle={styles.bankListContent}
                            renderItem={renderPaymentMethodItem}
                            ListEmptyComponent={renderEmptyComponent}
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
                enableDynamicSizing={true}
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
                onPrimaryAction={handleDeletePress}
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
        paddingBottom: 15,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        gap: 10,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
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
        // No changes needed here
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
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    inputField: {
        marginVertical: 10,
        fontSize: 16,
        flexGrow: 1,
        flexShrink: 1
    },
    transferButton: {
        marginLeft: 5,
    },
    loadingSkeleton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        height: 75,
    },
    bankItemPressable: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 75,
        width: 70,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: Colors.light.toastBackground,
        flexDirection: 'column',
        gap: 3
    },
    bankIcon: {
        width: '55%',
        height: '55%',
        pointerEvents: 'none'
    },
    bankIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 35,
        height: 35,
        backgroundColor: 'white',
        borderRadius: 50,
        overflow: 'hidden',
        pointerEvents: 'none'
    },
    bankItemText: {
        fontSize: 12,
        maxWidth: 60,
        textAlign: 'center',
        pointerEvents: 'none'
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
        marginHorizontal: 12,
        borderWidth: 1,
    },
    currencyText: {
        fontSize: 16,
    },
    suggestionList: {
        // No changes needed here
    },
    suggestionListContent: {
        gap: 10,
        paddingHorizontal: 20,
    },
    suggestionItem: {
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 16,
        overflow: 'hidden',
    },
    suggestionText: {
        fontSize: 16,
    },
    bankList: {
        // No changes needed here
    },
    bankListContent: {
        gap: 15,
        paddingHorizontal: 20,
        flexGrow: 1
    },
    toastContainer: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
    },
    bottomContainer: {
        flexDirection: 'column',
        // gap: 15,

        borderRadius: 16
    },
    bottomTitle: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    }
});

export default DetailScreen;