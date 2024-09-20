import React, { memo, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { TouchableHighlight } from 'react-native';
import { getIconPath } from '@/utils/returnIcon';
import { returnItemData } from '@/utils/returnItemData';

export type ThemedListItemProps = {
    code: string;
    type: "bank" | "store";
    onItemPress: () => void;
}

export const ThemedListItem = memo(function ThemedListItem({
    code,
    type,
    onItemPress
}: ThemedListItemProps): JSX.Element {
    const colorScheme = useColorScheme();

    const { name, full_name, color, accent_color } = useMemo(() => returnItemData(code, type), [code, type]);

    const bankIcon = useMemo(() => getIconPath(code), [code]);

    return (
        <TouchableHighlight
            onPress={onItemPress}
            underlayColor={colorScheme === 'light' ? Colors.light.cardFooter : Colors.dark.inputBackground}
        >
            <ThemedView style={styles.itemContainer}>
                <View style={[styles.iconContainer, { backgroundColor: colorScheme === 'light' ? Colors.light.logoIcon : Colors.dark.logoIcon }]}>
                    <Image
                        source={bankIcon}
                        style={styles.icon}
                        resizeMode='contain'
                    />
                </View>
                <ThemedView style={styles.textContainer}>
                    <ThemedText type='defaultSemiBold' style={styles.bankName}>{name}</ThemedText>
                    <ThemedText type='default' numberOfLines={1} style={styles.bankFullName}>{full_name}</ThemedText>
                </ThemedView>
            </ThemedView>
        </TouchableHighlight>
    );
});

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 10,
    },
    iconContainer: {
        width: 45,  // Adjust the size as needed
        height: 45, // Adjust the size as needed
        borderRadius: 25, // Half of the width/height
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    icon: {
        width: '50%',
        height: '50%',
        resizeMode: 'contain',  // U
    },
    textContainer: {
        flex: 1,
    },
    bankName: {
        fontSize: 16,
    },
    bankFullName: {
        fontSize: 14,
    },
});