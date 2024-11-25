import { ScrollView, StyleProp, ViewStyle, StyleSheet, View, Pressable } from 'react-native';
import React, { useMemo, useCallback } from 'react';
import { t } from '@/i18n';
import { ThemedText } from './ThemedText';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

type ThemedFilterProps = {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    style?: StyleProp<ViewStyle>;
};

const filters = [
    { key: 'all', label: t('homeScreen.filters.all'), iconName: 'filter' },
    { key: 'bank', label: t('homeScreen.filters.bank'), iconName: 'bank' },
    { key: 'ewallet', label: t('homeScreen.filters.ewallet'), iconName: 'wallet' },
    { key: 'store', label: t('homeScreen.filters.store'), iconName: 'store' },
];

const ThemedFilter = React.memo(({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
    const { locale } = useLocale();
    const { currentTheme } = useTheme();
    const isDarkMode = currentTheme === 'dark';

    const handlePress = useCallback((filterKey: string) => onFilterChange(filterKey), [onFilterChange]);

    return (
        <ScrollView
            showsHorizontalScrollIndicator={false}
            horizontal
            contentContainerStyle={[styles.filterContainer, style]}
        >
            {filters.map((filter) => {
                const isSelected = selectedFilter === filter.key;

                const textAnimatedStyle = useAnimatedStyle(() => ({
                    opacity: withTiming(isSelected ? 1 : 0, { duration: 300 }),
                    transform: [{ translateX: withTiming(isSelected ? 0 : -10, { duration: 300 }) }],
                    marginLeft: withTiming(isSelected ? 5 : 0, { duration: 300 }),
                }));

                return (
                    <View key={filter.key} style={styles.filterButtonContent}>
                        <Pressable
                            onPress={() => handlePress(filter.key)}
                            style={({ pressed }) => [
                                styles.filterButton,
                                isDarkMode ? styles.darkModeButton : styles.lightModeButton,
                                isSelected && (isDarkMode ? styles.selectedFilterDarkMode : styles.selectedFilterLightMode),
                                pressed && { opacity: 0.7 },
                            ]}
                            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)', borderless: false }}
                        >
                            <Animated.View style={styles.animatedView}>
                                <MaterialCommunityIcons
                                    name={isSelected ? filter.iconName : `${filter.iconName}-outline`}
                                    size={18}
                                    color={
                                        isSelected
                                            ? isDarkMode
                                                ? '#5A4639'
                                                : '#FFFFFF'
                                            : isDarkMode
                                            ? '#FFFFFF'
                                            : '#5A4639'
                                    }
                                />
                                <Animated.View style={textAnimatedStyle}>
                                    {isSelected && (
                                        <ThemedText
                                            style={[
                                                styles.baseTextStyle,
                                                isSelected &&
                                                    (isDarkMode
                                                        ? styles.selectedFilterTextDarkMode
                                                        : styles.selectedFilterTextLightMode),
                                            ]}
                                        >
                                            {filter.label}
                                        </ThemedText>
                                    )}
                                </Animated.View>
                            </Animated.View>
                        </Pressable>
                    </View>
                );
            })}
        </ScrollView>
    );
});
const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        gap: 5,
        paddingHorizontal: 15,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 15,
        overflow: 'hidden',
    },
    baseTextStyle: {
        fontSize: 16,
    },
    selectedFilterTextLightMode: {
        color: '#FFF',
        fontSize: 16,
    },
    selectedFilterTextDarkMode: {
        color: '#5A4639',
        fontSize: 16,
    },
    selectedFilterLightMode: {
        backgroundColor: '#5A4639',
    },
    selectedFilterDarkMode: {
        backgroundColor: '#FFF5E1',
    },
    darkModeButton: {
        backgroundColor: '#4E3B32',
    },
    lightModeButton: {
        backgroundColor: '#e8dcd3',
    },
    filterButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        overflow: 'hidden',
        borderRadius: 15,
    },
 animatedView: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Add padding to accommodate the text
        paddingHorizontal: 10, 
    },
});

export default ThemedFilter;