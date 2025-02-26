import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TextInput, Image, Pressable, ActivityIndicator, Linking } from 'react-native'; // Added Linking
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemsByType } from '@/utils/returnItemData';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import { MMKV } from 'react-native-mmkv';
import { ThemedInput } from '@/components/Inputs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface BankItem {
    code: string;
    name: string;
}

const storage = new MMKV();
const LAST_USED_BANK_KEY = 'lastUsedBank'; // Keeping this for storing the LAST used bank, even if not sorting.

const BankSelectScreen = () => {
    const { currentTheme } = useTheme();
    const router = useRouter();
    const { selectedBankCode: initialSelectedBankCode } = useLocalSearchParams(); // Get initial selection

    const [searchQuery, setSearchQuery] = useState('');
    const [allBanks, setAllBanks] = useState<BankItem[]>([]);
    const [filteredBanks, setFilteredBanks] = useState<BankItem[]>([]);
    const [selectedBankCode, setSelectedBankCode] = useState<string | null>(
        String(initialSelectedBankCode) || null
    ); // Track selected bank


    useEffect(() => {
        const loadBanks = () => {
            let banks = returnItemsByType('vietqr');
            setAllBanks(banks);
            setFilteredBanks(banks);

        };
        loadBanks();

    }, []);

    useEffect(() => {
        if (searchQuery === '') {
            setFilteredBanks(allBanks);
        } else {
            const filtered = allBanks.filter(
                (bank) =>
                    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    bank.code.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredBanks(filtered);
        }
    }, [searchQuery, allBanks]);

    const handleBankSelect = useCallback(async (bankCode: string) => {
        setSelectedBankCode(bankCode); // Update selected bank
        storage.set(LAST_USED_BANK_KEY, bankCode);

        // Open the banking app (like in DetailScreen)
        let lowerCaseCode = bankCode.toLowerCase();
        if (lowerCaseCode === 'vib') {
            lowerCaseCode = 'vib-2';
        } else if (lowerCaseCode === 'acb') {
            lowerCaseCode = 'acb-biz';
        }
        const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;
        try {
            await Linking.openURL(url);
            router.back(); // Navigate back after opening the app
        } catch (err) {
            console.error('Failed to open URL:', err);
            // Consider adding a toast message here to inform the user.
        }
    }, [router]);

    const renderBankItem = useCallback(({ item }: { item: BankItem }) => {
        return (
            <Pressable
                style={[
                    styles.bankItem,
                    // { backgroundColor: currentTheme === 'light' ? Colors.light.buttonBackground : Colors.dark.buttonBackground },
                ]}
                onPress={() => handleBankSelect(item.code)}
            >
                <View style={styles.bankIconContainer}>
                    <Image source={getIconPath(item.code)} style={styles.bankIcon} resizeMode="contain" />
                </View>
                <ThemedText style={[styles.bankName, { color: currentTheme === 'light' ? Colors.light.text : Colors.dark.text }]}>{item.name}</ThemedText>
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={getResponsiveFontSize(16)}
                    color={currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon}
                />
            </Pressable>
        );
    }, [currentTheme, handleBankSelect, selectedBankCode]);


    const renderEmptyComponent = useCallback(() => (
        <View style={styles.emptyContainer}>
            {searchQuery ? (
                <ThemedText>{t('detailsScreen.noBanksFound')}</ThemedText>
            ) : (
                <ActivityIndicator size={getResponsiveFontSize(25)} color={currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon} />
            )}
        </View>
    ), [searchQuery, currentTheme]);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.headerWrapper}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveHeight(3.8) }}>
                    <ThemedButton onPress={router.back} iconName="chevron-left" />
                </View>
                <ThemedInput
                    iconName="magnify"
                    placeholder={t('detailsScreen.searchBank')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={{ borderRadius: getResponsiveWidth(16) }}
                />
            </View>

            <FlatList
                style={[styles.listStyle, {backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground}]}
                data={filteredBanks}
                renderItem={renderBankItem}
                keyExtractor={(item) => item.code}
                ListEmptyComponent={renderEmptyComponent}
                contentContainerStyle={[styles.listContent]}
                showsVerticalScrollIndicator={false}
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: getResponsiveHeight(10), // Adjusted paddingTop to match DetailScreen
    },
    headerWrapper: {
        flexDirection: 'column',
        paddingHorizontal: getResponsiveWidth(3.6),
    },
    searchInput: {
        marginTop: getResponsiveHeight(3.6),
        paddingHorizontal: getResponsiveWidth(4.8),
        paddingVertical: getResponsiveHeight(1.2),
        borderRadius: getResponsiveWidth(4),
        borderWidth: 1,
        marginHorizontal: getResponsiveWidth(4.8),
        marginBottom: getResponsiveHeight(1.8),
        fontSize: getResponsiveFontSize(16),
    },
    bankItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: getResponsiveWidth(2.5),
        paddingVertical: getResponsiveHeight(1.8),
        paddingHorizontal: getResponsiveWidth(4.8),
        borderRadius: getResponsiveWidth(4),
        marginBottom: getResponsiveHeight(1.2),
    },
    bankIconContainer: {
        width: getResponsiveWidth(9.6),
        height: getResponsiveWidth(9.6),
        borderRadius: getResponsiveWidth(12),
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    bankIcon: {
        width: '60%',
        height: '60%',
    },
    bankName: {
        fontSize: getResponsiveFontSize(14),
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: getResponsiveHeight(3.6),
    },
    listStyle: {
        marginHorizontal: getResponsiveWidth(3.6),
        marginTop: getResponsiveHeight(1.8), 
        borderRadius: getResponsiveWidth(4),
        marginBottom: getResponsiveHeight(3.6),
    },
    listContent: {
        borderRadius: getResponsiveWidth(4),
    },
    selectedBankItem: {
        borderWidth: 1,
        borderColor: Colors.light.background, // Or any color indicating selection
    },
    selectedIconContainer: {
        backgroundColor: Colors.light.background,
        borderRadius: getResponsiveFontSize(100),
        width: getResponsiveFontSize(20),
        height: getResponsiveFontSize(20),
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkIcon: {
        color: '#fff', // Checkmark color
        fontSize: getResponsiveFontSize(12)
    }
});

export default BankSelectScreen;