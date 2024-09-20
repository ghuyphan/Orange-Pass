import { StyleSheet, ScrollView, View } from 'react-native';

import React, { useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { ThemedPinnedCard } from '@/components/cards';

import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { t } from '@/i18n';
import { ThemedText } from '@/components/ThemedText';

export default function DetailScreen() {
    const { record } = useLocalSearchParams();
    useEffect(() => {
        (async () => {
        const permissions = await Brightness.getPermissionsAsync();
         if (permissions.status == 'granted') {
          await Brightness.setSystemBrightnessAsync(0.5);
        } else {
          return;
        }
        })();
      }, []);

      useFocusEffect(
        useCallback(() => {
          const restoreBrightness = async () => {
            const permissions = await Brightness.getPermissionsAsync();
            if (permissions.status == 'granted') {
                await Brightness.setSystemBrightnessModeAsync(Brightness.BrightnessMode.AUTOMATIC);
            } else {
              return;
            }
          };
          return () => {
            restoreBrightness();
          };
        }, [])
      );

    // Deserialize the record
    const item: QRRecord = Array.isArray(record) ? null : record ? JSON.parse(decodeURIComponent(record)) : null;
    const colorScheme = useColorScheme();
    const router = useRouter();
    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            style={[{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }]}
        >
            <ThemedView style={styles.container}>
                <View style={styles.headerContainer}>
                    <ThemedButton
                        onPress={router.back}
                        iconName="chevron-back-outline"
                    />
                    <ThemedButton
                        onPress={router.back}
                        iconName="ellipsis-vertical"
                    />
                </View>
                <ThemedPinnedCard style={{ marginTop: 40 }} metadata_type={item.metadata_type} code={item.code} type={item.type} metadata={item.metadata} accountName={item.account_name} accountNumber={item.account_number} />
                <View style={styles.footerContainer}>
                    {item.type === "store" ? (
                        <>
                            <View style={{
                                paddingVertical: 10,
                                paddingHorizontal: 15,
                                borderRadius: 10,
                                backgroundColor: colorScheme === 'light' ? Colors.light.inputBackground : Colors.dark.inputBackground
                            }}>
                                <View style={{ flexDirection: 'column' }}>
                                    <ThemedText style={{ fontSize: 16 }} type='defaultSemiBold'>Member ID</ThemedText>
                                    <ThemedText>{item.metadata}</ThemedText>
                                </View>
                            </View>
                        </>
                    ) : null}

                </View>
            </ThemedView>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexGrow: 1,
        paddingHorizontal: 15,
    },
    headerContainer: {
        paddingTop: STATUSBAR_HEIGHT+ 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    footerContainer: {
        flex: 1,
        marginTop: 50,
        gap: 15,
    }
});
