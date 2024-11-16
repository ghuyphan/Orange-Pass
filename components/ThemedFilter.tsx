import { ScrollView, StyleProp, ViewStyle, StyleSheet, View, Pressable } from 'react-native';
import React from 'react';
import { t } from '@/i18n';
import { useColorScheme } from 'react-native';
import { ThemedText } from './ThemedText';
import { useLocale } from '@/context/LocaleContext';
import { useCallback } from 'react';

type ThemedFilterProps = {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    style?: StyleProp<ViewStyle>;
};

const ThemedFilter = React.memo(({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
    const filters = [
        { key: 'all', label: t('homeScreen.filters.all') },
        { key: 'bank', label: t('homeScreen.filters.bank') },
        { key: 'ewallet', label: t('homeScreen.filters.ewallet') },
        { key: 'store', label: t('homeScreen.filters.store') }
    ];

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';

    const handlePress = useCallback((filterKey: string) => {
        onFilterChange(filterKey);
    }, [onFilterChange]);

    return (
        <ScrollView showsHorizontalScrollIndicator={false} horizontal contentContainerStyle={[styles.filterContainer, style]}>
            {filters.map((filter) => (
                <Pressable
                    key={filter.key}
                    onPress={() => handlePress(filter.key)}
                    style={[
                        styles.filterButton,
                        isDarkMode ? styles.darkModeButton : styles.lightModeButton,
                        selectedFilter === filter.key && (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode),
                    ]}
                    android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
                >
                    <View>
                        <ThemedText
                            style={[
                                styles.baseTextStyle,
                                selectedFilter === filter.key && (isDarkMode ? styles.selectedFilterTextDarkMode : styles.selectedFilterTextLightMode)
                            ]}
                        >
                            {filter.label}
                        </ThemedText>
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        gap: 10,
        // marginBottom: 10,
        paddingHorizontal: 15,
    },
    filterButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    selectedFilterLightMode: {
        backgroundColor: '#5A4639', // example color for light mode
    },
    baseTextStyle: {
        fontSize: 14,
    },
    selectedFilterTextLightMode: {
        color: '#FFF',
        fontSize: 14,
    },
    selectedFilterTextDarkMode: {
        color: '#5A4639',
        fontSize: 14,
    },
    selectedFilterDarkMode: {
        backgroundColor: '#FFF5E1', // example color for dark mode
    },
    darkModeButton: {
        backgroundColor: '#4E3B32',
    },
    lightModeButton: {
        backgroundColor: '#E1D5C9',
    },
    filterText: {
        // color: '#E7C9B3', // Default text color
    },
});

export default ThemedFilter;
