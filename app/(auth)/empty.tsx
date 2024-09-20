import { StyleSheet, ScrollView, View, Platform } from 'react-native';

import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedEmptyCard } from '@/components/cards/ThemedEmptyCard';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { t } from '@/i18n';

export default function EmptyScreen() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const onNavigateToScanScreen = () => {
        router.push('/(scan)/scan-main');
    }
    return (
        <View
            // contentContainerStyle={{ flexGrow: 1 }}
            style={[{ flex: 1, backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }]}
        >
            <ThemedView style={styles.container}>
                <ThemedEmptyCard
                    headerLabel={t('homeScreen.emptyCard.header')}
                    footerLabel={t('homeScreen.emptyCard.footer')}
                    footButtonLabel={t('homeScreen.emptyCard.footerButton')}
                    cardOnPress={() => {}}
                    buttonOnPress={onNavigateToScanScreen}
                    style={{paddingTop: 110}}
                    footerStyle={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                />
                <ThemedText style={styles.content} type="default">{t('homeScreen.emptyCard.content')}</ThemedText>
            </ThemedView>
            <View style={styles.headerContainer}>
                <ThemedButton
                    onPress={router.back}
                    iconName="chevron-back"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexGrow: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    content: {
        paddingHorizontal: 15,
        fontSize: 18,
        marginTop: 30,
        lineHeight: 22
    },
    headerContainer: {
        position: 'absolute',
        top: STATUSBAR_HEIGHT + 25,
        left: 15,
        zIndex: 10,
    },
});
