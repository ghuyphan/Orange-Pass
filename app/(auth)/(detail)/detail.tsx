import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, Linking, Keyboard, FlatList, TextInput, Pressable, Image} from 'react-native';
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
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';

// Utility function to format the amount
const formatAmount = (amount: string) => {
    return amount.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function DetailScreen() {
    const { locale } = useLocale();
    useUnmountBrightness(1, false);
    const { item: encodedItem } = useLocalSearchParams();
    const router = useRouter();
    const { currentTheme } = useTheme();
    const isOffline = useSelector((state: RootState) => state.network.isOffline);

    // State variables
    const [amount, setAmount] = useState('');
    const [isToastVisible, setIsToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const transferHeight = useSharedValue(0);

    // Derived values and constants
    const iconColor = currentTheme === 'light' ? Colors.light.text : Colors.dark.text;
    const amountSuggestions = ['10,000', '50,000', '100,000', '500,000', '1,000,000'];

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

    // Effect hook for keyboard listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            // No need to manage keyboard visibility state here
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            // No need to manage keyboard visibility state here
        });

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // useCallback for optimized event handlers
    const handleExpandPress = useCallback(() => {
        // This function is currently unused, consider removing or implementing
    }, []);

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
    }, [item, t]);

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
                const response = await getVietQRData(
                    item.account_number,
                    item.account_name,
                    itemName?.number_code || '',
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
            } catch (error) {
                console.error('Error generating QR code:', error);
            } finally {
                setIsSyncing(false);
                setIsToastVisible(false);
            }
        }, 500), [item, amount, router, t]
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

    // SuggestionItem component (consider moving this outside for better organization)
    const SuggestionItem = React.memo(({ item, onPress: onPress }: { item: string; onPress: (item: string) => void }) => (
        <Pressable
            onPress={() => onPress(item)}
            android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            style={[
                styles.suggestionItem,
                {
                    backgroundColor: currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground,
                    overflow: 'hidden',
                },
            ]}
        >
            <ThemedText style={styles.suggestionText}>{item}</ThemedText>
        </Pressable>
    ));

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
                extraScrollHeight={80}
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

                <View style={[styles.infoWrapper, {
                    backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
                }]}>
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
                                    <ThemedText>đ</ThemedText>
                                    <Pressable
                                        hitSlop={{ bottom: 40, left: 30, right: 30, top: 30 }}
                                        onPress={transferAmount}
                                        style={[styles.transferButton, { opacity: amount ? 1 : 0.3 }]}
                                    >
                                        <MaterialCommunityIcons name="chevron-right" size={18} color={iconColor} />
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
                                        <SuggestionItem item={item} onPress={setAmount} />
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
                <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'flex-start', backgroundColor: 'red' }}>
                    <Image source={require('@/assets/images/logoIcons/MOMO.png')} style={{ width: 50, height: 50, borderRadius: 16, }} resizeMode="contain" />
                    <Image source={require('@/assets/images/logoIcons/ZLP.png')} style={{ width: 50, height: 50, borderRadius: 16, }} resizeMode="contain" />
                    </View>
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
        marginBottom: 25,
    },
    pinnedCardWrapper: {
        marginBottom: 30,
    },
    cardWrapper: {
        padding: 15,
        borderRadius: 16,
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
        borderRadius: 16,
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
        borderRadius: 16,
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
        borderRadius: 16,
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
