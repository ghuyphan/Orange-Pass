import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Linking, FlatList, TextInput, Pressable, Image } from 'react-native';
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
import { t } from '@/i18n';
import { ThemedText } from '@/components/ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { returnItemData } from '@/utils/returnItemData';
import { getVietQRData } from '@/utils/vietQR';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { throttle } from 'lodash';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemsByType } from '@/utils/returnItemData';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { ThemedFilterSkeleton } from '@/components/skeletons';
import { isLoading } from 'expo-font';
import { baseColors } from 'moti/build/skeleton/shared';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

interface Item {
    code: string;
    name: string;
}

const AMOUNT_SUGGESTIONS = ['10,000', '50,000', '100,000', '500,000', '1,000,000'];

export default function DetailScreen() {
    useUnmountBrightness(1, false);
    const { item: encodedItem } = useLocalSearchParams();
    const router = useRouter();
    const { currentTheme } = useTheme();
    const isOffline = useSelector((state: RootState) => state.network.isOffline);
    const bottomSheetRef = useRef<BottomSheet>(null);

    // State variables
    const [amount, setAmount] = useState('');
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [vietQRBanks, setVietQRBanks] = useState<any[]>([]);
    const transferHeight = useSharedValue(0);

    // Derived values and constants
    const cardColor = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground;
    const iconColor = currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon;

    // Optimize bank loading
    useEffect(() => {
        setIsLoading(true);
        const loadBanks = setTimeout(() => {
            const banks = returnItemsByType('vietqr');
            setVietQRBanks(banks);
        }, 500);

        setIsLoading(false);
        return () => clearTimeout(loadBanks);
    }, []);

    // Memoized item parsing to prevent unnecessary re-renders
    const item = useMemo(() => {
        if (!encodedItem) return null;
        try {
            return JSON.parse(decodeURIComponent(String(encodedItem)));
        } catch (error) {
            console.error('Failed to parse item:', error);
            return null;
        }
    }, [encodedItem]);

    const handleExpandPress: () => void = () => {
        bottomSheetRef.current?.snapToIndex(0);
    }

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

    const openBank = useCallback(() => {
        const url = `https://dl.vietqr.io/pay?app=tpb`;

        Linking.openURL(url).catch((err) => {
            console.error('Failed to open bank link:', err);
            setIsToastVisible(true);
            setToastMessage(t('detailsScreen.failedToOpenGoogleMaps'));
        });
    }, []);

    // Corrected onToggleTransfer with correct dependencies
    const onToggleTransfer = useCallback(() => {
        if (isOffline) return;
        transferHeight.value = transferHeight.value === 0 ? 100 : 0;
    }, [isOffline, transferHeight]);

    // Corrected transferAmount with proper dependencies
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
                    item.account_number,
                    item.account_name,
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

    // Animated styles for the transfer section
    const transferStyle = useAnimatedStyle(() => ({
        height: withTiming(transferHeight.value, {
            duration: 300,
            easing: Easing.bezier(0.4, 0, 0.2, 1)
        }),
        opacity: withTiming(transferHeight.value > 0 ? 1 : 0, {
            duration: 250,
            easing: Easing.out(Easing.quad)
        }),
        transform: [{
            scaleY: withTiming(transferHeight.value > 0 ? 1 : 0.95, {
                duration: 300,
                easing: Easing.bezier(0.4, 0, 0.2, 1)
            })
        }],
        overflow: 'hidden',
        pointerEvents: transferHeight.value > 0 ? 'auto' : 'none',
    }));

    const renderSuggestionItem = useCallback(({ item }: { item: string }) => (
        <Pressable
            onPress={() => setAmount(item)}
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
            <ThemedText style={styles.suggestionText}>{item}</ThemedText>
        </Pressable>
    ), [currentTheme]);

    const renderPaymentMethodItem = useCallback(({ item, onPress }: { item: Item, onPress: (bankCode: string) => void }) => (
        <View style={styles.botSuggestionItem}>
            <Pressable
                style={{ borderRadius: 16, overflow: 'hidden', elevation: 3, backgroundColor: '#fff', height: 55, width: 55, justifyContent: 'center', alignItems: 'center' }}
                // onPress={onOpenPayment(item.code)}
                onPress={() => onPress(item.code)}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            >
                <Image source={getIconPath(item.code)} style={{ width: 30, height: 30 }} resizeMode='contain' />
            </Pressable>
            <ThemedText numberOfLines={1} style={{ fontSize: 12, maxWidth: 55 }}>{item.name}</ThemedText>
        </View>
    ), []);


    if (!item) {
        return (
            <ThemedView style={styles.loadingWrapper}>
                <ThemedText>No item found.</ThemedText>
            </ThemedView>
        );
    }

    return (
        <>
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

                    {(item.type === 'bank' || item.type === 'ewallet') && (
                        <View style={[styles.transferContainer, isOffline ? { opacity: 0.4, pointerEvents: 'none' } : {}]}>
                            <Pressable
                                onPress={onToggleTransfer}
                                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
                            >
                                <View style={styles.actionButton}>
                                    <MaterialCommunityIcons color={iconColor} name="qrcode" size={18} selectionColor={iconColor} />
                                    <ThemedText style={styles.labelText}>
                                        {t('detailsScreen.createQrCode')}
                                    </ThemedText>
                                    {isOffline && (
                                        <MaterialCommunityIcons name="wifi-off" size={18} color={iconColor} />
                                    )}
                                </View>
                            </Pressable>

                            <Animated.View style={[styles.transferSection, transferStyle]}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.inputField, { color: currentTheme === 'light' ? Colors.light.text : Colors.dark.text }]}
                                        placeholder={t('detailsScreen.receivePlaceholder')}
                                        keyboardType="numeric"
                                        value={amount}
                                        placeholderTextColor={currentTheme === 'light' ? Colors.light.placeHolder : Colors.dark.placeHolder}
                                        onChangeText={(text) => setAmount(formatAmount(text))}
                                    />
                                    <View style={[styles.currencyContainer, currentTheme === 'light' ? { borderColor: 'rgba(0, 0, 0, 0.2) ' } : { borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
                                        <ThemedText style={styles.currencyText}>đ</ThemedText>
                                    </View>
                                    <Pressable
                                        hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
                                        onPress={transferAmount}
                                        style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}
                                    >
                                        <MaterialCommunityIcons name={amount ? 'navigation' : 'navigation-outline'} size={18} color={iconColor} />
                                    </Pressable>

                                </View>
                                <FlatList
                                    data={AMOUNT_SUGGESTIONS}
                                    horizontal
                                    style={styles.suggestionList}
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.toString()}
                                    contentContainerStyle={styles.suggestionListContent}
                                    renderItem={renderSuggestionItem}
                                    initialNumToRender={3}
                                    maxToRenderPerBatch={3}
                                    windowSize={3}
                                />
                            </Animated.View>
                        </View>
                    )}

                    {item.type === 'store' && (
                        <View style={[styles.bottomContainer, { backgroundColor: cardColor }]}>
                            <View style={styles.bottomTitle}>
                                <MaterialCommunityIcons name="bank-outline" size={18} color={iconColor} />
                                <ThemedText>{t('detailsScreen.bankTransfer')}</ThemedText>
                                <Image source={require('@/assets/images/vietqr.png')} style={{ height: 30, width: 70, marginLeft: -15 }} resizeMode="contain" />
                            </View>
                            <FlatList
                                data={vietQRBanks}
                                horizontal
                                style={styles.botSuggestionList}
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item) => item.code}
                                contentContainerStyle={styles.botSuggestionListContent}
                                renderItem={({ item }) => (
                                    renderPaymentMethodItem({ item: { code: item.code, name: item.name }, onPress: openBank })
                                )}
                                ListEmptyComponent={
                                    <View style={{ flexDirection: 'row', gap: 25 }}>
                                        <View style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                                            <View style={{ backgroundColor: 'red', height: 55, width: 55, borderRadius: 16 }} />
                                            <View style={{ backgroundColor: 'blue', height: 15, width: 50, borderRadius: 16 }} />
                                        </View>

                                        <View style={{ backgroundColor: 'red', height: 55, width: 55, borderRadius: 16 }} />
                                        <View style={{ backgroundColor: 'red', height: 55, width: 55, borderRadius: 16 }} />
                                        <View style={{ backgroundColor: 'red', height: 55, width: 55, borderRadius: 16 }} />
                                        <View style={{ backgroundColor: 'red', height: 55, width: 55, borderRadius: 16 }} />
                                    </View>
                                }
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
                            onPress: () => {},
                        }
                    ]}
                />
            </KeyboardAwareScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: 15,
        maxHeight: '130%',
    },
    headerWrapper: {
        paddingTop: STATUSBAR_HEIGHT + 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    pinnedCardWrapper: {
        marginBottom: 30,
    },
    infoWrapper: {
        borderRadius: 16,
        gap: 5,
        overflow: 'hidden',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 10,
        borderRadius: 16,
        overflow: 'hidden'
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
    transferSection: {
        // marginTop: 15,
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    inputField: {
        height: 50,
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
    currencyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 22,
        borderRadius: 50,
        overflow: 'hidden',
        marginRight: 10,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1
    },
    currencyText: {
        fontSize: 16,
        opacity: 0.3
    },
    suggestionList: {
    },
    suggestionListContent: {
        gap: 10,
        paddingHorizontal: 15,
        paddingBottom: 10,
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