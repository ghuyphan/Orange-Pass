import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, Linking, Keyboard, FlatList, TextInput, Pressable } from 'react-native';
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
// import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { returnItemData } from '@/utils/returnItemData';
import { getVietQRData } from '@/utils/vietQR';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { throttle } from 'lodash';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function DetailScreen() {
    const { locale } = useLocale();

    const { item: encodedItem } = useLocalSearchParams();

    const bottomSheetRef = useRef<BottomSheet>(null);
    const router = useRouter();
    const { currentTheme } = useTheme();
    // const colorScheme = useColorScheme();
    const [amount, setAmount] = useState(''); // State to hold the amount of money
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const isOffline = useSelector((state: RootState) => state.network.isOffline);

    const iconColor = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;

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
        // triggerLightHapticFeedback();
        if (!item || !item.type || !item.code) return;

        let itemName = returnItemData(item.code, item.type);

        if (!itemName || !itemName.name) {
            console.error('Invalid itemName or itemName.name');
            return;
        }

        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(itemName.name)}`;
        Linking.openURL(url).catch((err) => console.error('Failed to open Google Maps:', err));
    }, [item]);

    // Đặt giá trị ban đầu cho `transferHeight` là 0 để ẩn transfer container
    const transferHeight = useSharedValue(0);

    const transferStyle = useAnimatedStyle(() => ({
        height: withTiming(transferHeight.value, { duration: 250, easing: Easing.out(Easing.ease) }),
        opacity: withTiming(transferHeight.value > 0 ? 1 : 0, { duration: 250, easing: Easing.out(Easing.ease) }),
        overflow: 'hidden', // Giữ nội dung trong phạm vi chiều cao
        pointerEvents: transferHeight.value > 0 ? 'auto' : 'none', // Tắt sự kiện khi ẩn
    }));

    const onToggleTransfer = useCallback(() => {
        if (isOffline) return;
        // triggerLightHapticFeedback();

        // Chuyển đổi giữa mở và đóng `transfer container` bằng cách thay đổi `height`
        transferHeight.value = transferHeight.value === 0 ? 100 : 0; // Điều chỉnh 90 thành chiều cao mong muốn
    }, [isOffline]);

    const transferAmount = useCallback(throttle(async () => {

        if (!item || !item.type || !item.code || !amount) return;

        // triggerLightHapticFeedback();
        setIsSyncing(true);
        setIsToastVisible(true);

        const itemName = returnItemData(item.code, item.type);
        setToastMessage(t('detailsScreen.generatingQRCode'));

        try {
            const response = await getVietQRData(
                item.account_number,
                item.account_name,
                itemName.number_code as string,
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
    const SuggestionItem = React.memo(({ item, onPress: onPress }: { item: string; onPress: (item: string) => void }) => (
        <Pressable
            onPress={() => onPress(item)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            style={[
                styles.suggestionItem,
                {
                    backgroundColor:
                        currentTheme === 'light'
                            ? Colors.light.cardFooter
                            : Colors.dark.cardFooter,
                    overflow: 'hidden',
                    // borderRadius: 15,
                },
            ]}
        >
            <ThemedText style={styles.suggestionText}>{item}</ThemedText>
        </Pressable>
    ));

    return (
        <>
            <KeyboardAwareScrollView
                keyboardShouldPersistTaps="handled"
                style={[{ backgroundColor: currentTheme === 'light' ? Colors.light.background : Colors.dark.background }]}
                contentContainerStyle={styles.container}
                extraScrollHeight={80}
                extraHeight={200}
                enableOnAndroid={true}
                showsVerticalScrollIndicator={false}
                scrollEnabled={isKeyboardVisible}
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

                <View style={[styles.infoWrapper, {
                    backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
                }]}>
                    <Pressable
                        onPress={openMap}
                        android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', borderless: false }}
                        style={styles.actionButton}
                    >
                        {/* <View style={styles.actionButton}> */}
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={iconColor} />
                        <ThemedText style={styles.labelText}>
                            {t('detailsScreen.nearbyLocation')}
                        </ThemedText>
                        {/* </View> */}
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
                                    <ThemedText>đ</ThemedText>
                                    <Pressable hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }} onPress={transferAmount} style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}>
                                        {amount ? <MaterialCommunityIcons name="chevron-right" size={18} color={iconColor} /> :
                                            <MaterialCommunityIcons name="chevron-right" size={18} color={iconColor} />}
                                    </Pressable>
                                </View>
                                <FlatList
                                    data={amountSuggestions}
                                    horizontal
                                    style={styles.suggestionList}
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item}
                                    contentContainerStyle={styles.suggestionListContent}
                                    renderItem={({ item }) => (
                                        <SuggestionItem item={item} onPress={setAmount} colorScheme={currentTheme} />
                                    )}
                                />

                            </Animated.View>
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
                {/* <ThemedBottomSheet
                ref={bottomSheetRef}
                onEditPress={() => { }}
                editText={t('homeScreen.edit')}
                deleteText={t('homeScreen.delete')}
            /> */}
            </KeyboardAwareScrollView>
            
        </>
    );
}
const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        marginHorizontal: 15,
        maxHeight: '130%',
    },
    mainContainer: {
        backgroundColor: 'red'
    },
    headerWrapper: {
        paddingTop: STATUSBAR_HEIGHT + 45,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    pinnedCardWrapper: {
        marginBottom: 30,
    },
    cardWrapper: {
        padding: 15,
        borderRadius: 15,
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
        borderRadius: 15,
        gap: 5,
        overflow: 'hidden',
        // paddingVertical: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 10,
        borderRadius: 15,
        overflow: 'hidden'
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
        paddingHorizontal: 15,
        // gap: 10
    },
    inputField: {
        height: 50,
        fontSize: 16,
        width: 290,
        overflow: 'hidden',
    },
    transferButton: {
        paddingLeft: 5,
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
        borderRadius: 15,
        overflow: 'hidden',

    },
    suggestionText: {
        fontSize: 16,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
    },
});
