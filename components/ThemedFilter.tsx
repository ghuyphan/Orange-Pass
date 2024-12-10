import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    FlatList,
    StyleProp,
    ViewStyle,
    StyleSheet,
    View,
    Pressable,
    LayoutAnimation,
} from 'react-native';
import { t } from '@/i18n'; // Translation function
import { ThemedText } from './ThemedText';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

// Enable LayoutAnimation for Android
// if (
//     Platform.OS === "android" &&
//     UIManager.setLayoutAnimationEnabledExperimental
// ) {
//     UIManager.setLayoutAnimationEnabledExperimental(true);
// }

type ThemedFilterProps = {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    style?: StyleProp<ViewStyle>;
};

interface FilterItemType {
    key: string;
    label: string;
    iconName: string;
}

const FilterItem = React.memo(
    ({
        item,
        isSelected,
        isDarkMode,
        handlePress,
    }: {
        item: FilterItemType;
        isSelected: boolean;
        isDarkMode: boolean;
        handlePress: (filterKey: string) => void;
    }) => {
        const animatedStyle = useAnimatedStyle(() => ({
            opacity: withTiming(isSelected ? 1 : 0, {
                duration: 100,
                easing: Easing.out(Easing.ease),
            }),
            transform: [
                {
                    translateX: withTiming(isSelected ? 0 : -10, {
                        duration: 100,
                        easing: Easing.out(Easing.ease),
                    }),
                },
            ],
        }));

        return (
            <Pressable
                onPress={() => {
                    handlePress(item.key);
                }}
                style={({ pressed }) => [
                    styles.filterButton,
                    isDarkMode
                        ? styles.darkModeButton
                        : styles.lightModeButton,
                    isSelected &&
                    (isDarkMode
                        ? styles.selectedFilterDarkMode
                        : styles.selectedFilterLightMode),
                    pressed && { opacity: 0.7 },
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.2)', foreground: true, borderless: false }}
            >
                <View style={[styles.animatedView, isSelected ? { gap: 5 } : { gap: 0 }]}>
                    <MaterialCommunityIcons
                        name={
                            isSelected
                                ? item.iconName
                                : `${item.iconName}-outline`
                        }
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
                    {isSelected && (
                        <Animated.View style={animatedStyle}>
                            <ThemedText
                                style={[
                                    styles.baseTextStyle,
                                    isSelected &&
                                    (isDarkMode
                                        ? styles.selectedFilterTextDarkMode
                                        : styles.selectedFilterTextLightMode),
                                ]}
                            >
                                {item.label}
                            </ThemedText>
                        </Animated.View>
                    )}
                </View>
            </Pressable>
        );
    },
    (prevProps, nextProps) =>
        prevProps.item.key === nextProps.item.key &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isDarkMode === nextProps.isDarkMode &&
        prevProps.item.label === nextProps.item.label
);

const ThemedFilter = ({ selectedFilter, onFilterChange, style }: ThemedFilterProps) => {
    const { locale } = useLocale();
    const { currentTheme } = useTheme();
    const isDarkMode = currentTheme === 'dark';

    // State to force re-render and update translations
    const [filterKey, setFilterKey] = useState(0);

    // Add an effect to update filterKey when locale changes
    useEffect(() => {
        setFilterKey(prev => prev + 1);
    }, [locale]);

    // Generate filters with fresh translations each render
    const filters: FilterItemType[] = [
        {
            key: 'all',
            label: t('homeScreen.filters.all'),
            iconName: 'view-grid'
        },
        {
            key: 'bank',
            label: t('homeScreen.filters.bank'),
            iconName: 'bank'
        },
        {
            key: 'ewallet',
            label: t('homeScreen.filters.ewallet'),
            iconName: 'wallet'
        },
        {
            key: 'store',
            label: t('homeScreen.filters.store'),
            iconName: 'store'
        }
    ];

    const customLayoutAnimation = useMemo(() =>
        LayoutAnimation.create(
            250, // Reduced duration
            LayoutAnimation.Types.easeInEaseOut,
            LayoutAnimation.Properties.opacity,
        ),
        []);

    const handlePress = useCallback(
        (filterKey: string) => {
            LayoutAnimation.configureNext(customLayoutAnimation);
            onFilterChange(filterKey);
        },
        [onFilterChange, customLayoutAnimation],
    );

    const renderItem = ({ item }: { item: FilterItemType }) => (
        <FilterItem
            item={item}
            key={`${locale}-${item.key}-${filterKey}`}
            isSelected={selectedFilter === item.key}
            isDarkMode={isDarkMode}
            handlePress={handlePress}
        />
    );

    return (
        <FlatList
            horizontal
            key={filterKey}
            data={filters}
            keyExtractor={(item) => `${locale}-${item.key}-${filterKey}`}
            renderItem={renderItem}
            extraData={[selectedFilter, locale, filterKey]}
            contentContainerStyle={[styles.filterContainer, style]}
            showsHorizontalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    filterContainer: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 15,
        justifyContent: 'space-evenly',
        // backgroundColor: 'red',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 16,
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
        backgroundColor: Colors.dark.buttonBackground
    },
    lightModeButton: {
        backgroundColor: Colors.light.buttonBackground
    },
    filterButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        borderRadius: 15,
        flex: 1,
    },
    animatedView: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
});

export default ThemedFilter;