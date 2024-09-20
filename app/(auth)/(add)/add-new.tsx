import { StyleSheet, View, Platform } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { router } from 'expo-router';
import { t } from '@/i18n';

import { ScrollView } from 'react-native-gesture-handler';

export default function AddScreen() {
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const navigateToEmptyScreen = () => {
    router.push('/empty');
  }
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={[Platform.OS == 'android' ? { marginTop: 110 } : { marginTop: 40 }]}>Add to Wallet</ThemedText>
      </ThemedView>
      <ScrollView>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 20,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  titleButton: {
  },
});
