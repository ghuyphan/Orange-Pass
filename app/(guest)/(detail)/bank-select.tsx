import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
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
const LAST_USED_BANK_KEY = 'lastUsedBank';
const BATCH_SIZE = 20; // Load banks in batches

const BankSelectScreen = () => {
    const { currentTheme } = useTheme();
    const router = useRouter();
    const { banks: encodedBanks, selectedBankCode: initialSelectedBankCode } = useLocalSearchParams();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [allBanks, setAllBanks] = useState<BankItem[]>([]);
    const [displayedBanks, setDisplayedBanks] = useState<BankItem[]>([]);
    const [selectedBankCode, setSelectedBankCode] = useState<string | null>(
        String(initialSelectedBankCode) || null
    );
    const [isLoading, setIsLoading] = useState(true);
    const [currentBatch, setCurrentBatch] = useState(1);
    
    // Memoize theme-dependent styles and colors
    const iconColor = useMemo(() => 
        currentTheme === 'light' ? Colors.light.icon : Colors.dark.icon,
    [currentTheme]);
    
    const bankNameStyle = useMemo(() => [
        styles.bankName, 
        { color: currentTheme === 'light' ? Colors.light.text : Colors.dark.text }
    ], [currentTheme]);
    
    const listStyle = useMemo(() => [
        styles.listStyle, 
        { backgroundColor: currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground }
    ], [currentTheme]);

    // Initial load of banks data
    useEffect(() => {
        let banksData: BankItem[] = [];
        
        try {
            if (encodedBanks) {
                // Use the banks passed from detail screen
                banksData = JSON.parse(String(encodedBanks)) as BankItem[];
            } else {
                // Fallback if no banks were passed
                banksData = returnItemsByType('vietqr');
            }
        } catch (e) {
            console.error("Error processing banks:", e);
            // Fallback to loading banks if there's an error
            banksData = returnItemsByType('vietqr');
        }
        
        // Store all banks but only display the first batch
        setAllBanks(banksData);
        setIsLoading(false);
    }, [encodedBanks]);
    
    // Handle batch display of banks
    useEffect(() => {
        // When all banks or search changes, update displayed banks in batches
        if (searchQuery) {
            // For search, show all matching results immediately
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = allBanks.filter(
                (bank) =>
                    bank.name.toLowerCase().includes(lowerQuery) ||
                    bank.code.toLowerCase().includes(lowerQuery)
            );
            setDisplayedBanks(filtered);
        } else {
            // For initial display, load in batches
            const endIndex = currentBatch * BATCH_SIZE;
            setDisplayedBanks(allBanks.slice(0, endIndex));
        }
    }, [allBanks, searchQuery, currentBatch]);

    // Load more banks when user scrolls near the end
    const handleLoadMore = useCallback(() => {
        if (searchQuery === '' && displayedBanks.length < allBanks.length) {
            setCurrentBatch(prev => prev + 1);
        }
    }, [searchQuery, displayedBanks.length, allBanks.length]);

    const handleBankSelect = useCallback(async (bankCode: string) => {
        setSelectedBankCode(bankCode);
        storage.set(LAST_USED_BANK_KEY, bankCode);

        // Prepare URL for bank app
        let lowerCaseCode = bankCode.toLowerCase();
        if (lowerCaseCode === 'vib') {
            lowerCaseCode = 'vib-2';
        } else if (lowerCaseCode === 'acb') {
            lowerCaseCode = 'acb-biz';
        }
        const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;
        
        try {
            await Linking.openURL(url);
            router.back();
        } catch (err) {
            console.error('Failed to open URL:', err);
            router.back();
        }
    }, [router]);

    const renderBankItem = useCallback(({ item }: { item: BankItem }) => (
        <Pressable
            style={styles.bankItem}
            onPress={() => handleBankSelect(item.code)}
        >
            <View style={styles.bankIconContainer}>
                <Image 
                    source={getIconPath(item.code)} 
                    style={styles.bankIcon} 
                    resizeMode="contain" 
                />
            </View>
            <ThemedText style={bankNameStyle}>{item.name}</ThemedText>
            <MaterialCommunityIcons
                name="chevron-right"
                size={getResponsiveFontSize(16)}
                color={iconColor}
            />
        </Pressable>
    ), [handleBankSelect, bankNameStyle, iconColor]);

    const renderFooter = useCallback(() => {
        if (isLoading && displayedBanks.length > 0) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={iconColor} />
                </View>
            );
        }
        return null;
    }, [isLoading, displayedBanks.length, iconColor]);

    const renderEmptyComponent = useMemo(() => (
        <View style={styles.emptyContainer}>
            {searchQuery ? (
                <ThemedText>{t('detailsScreen.noBanksFound')}</ThemedText>
            ) : isLoading ? (
                <ActivityIndicator size={getResponsiveFontSize(25)} color={iconColor} />
            ) : (
                <ThemedText>{t('detailsScreen.noBanksAvailable')}</ThemedText>
            )}
        </View>
    ), [searchQuery, isLoading, iconColor]);

    const keyExtractor = useCallback((item: BankItem) => item.code, []);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.headerWrapper}>
                <View style={styles.headerButtonRow}>
                    <ThemedButton onPress={router.back} iconName="chevron-left" />
                </View>
                <ThemedInput
                    iconName="magnify"
                    placeholder={t('detailsScreen.searchBank')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                />
            </View>

            <FlatList
                style={listStyle}
                data={displayedBanks}
                renderItem={renderBankItem}
                keyExtractor={keyExtractor}
                ListEmptyComponent={renderEmptyComponent}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={8}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={true}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.3}
                ListFooterComponent={renderFooter}
            />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: getResponsiveHeight(8.5),
    },
    headerWrapper: {
        flexDirection: 'column',
        paddingHorizontal: getResponsiveWidth(3.6),
    },
    headerButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: getResponsiveHeight(4),
    },
    searchInput: {
        borderRadius: getResponsiveWidth(16),
        paddingVertical: getResponsiveHeight(1),
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
        minHeight: getResponsiveHeight(20),
    },
    footerLoader: {
        paddingVertical: getResponsiveHeight(2),
        alignItems: 'center',
    },
    listStyle: {
        marginHorizontal: getResponsiveWidth(3.6),
        marginTop: getResponsiveHeight(1.8),
        borderRadius: getResponsiveWidth(4),
        marginBottom: getResponsiveHeight(3.6),
    },
    listContent: {
        borderRadius: getResponsiveWidth(4),
        paddingVertical: getResponsiveHeight(1),
    },
});

export default BankSelectScreen;
