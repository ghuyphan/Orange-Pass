
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Keyboard, InteractionManager, StyleSheet, Platform } from 'react-native';
import { Colors } from '@/constants/Colors';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/rootReducer';
import { router } from 'expo-router';
import { t } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { ThemedInput } from '@/components/Inputs';


export default function AddScreen() {
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const { codeType, codeValue } = useLocalSearchParams();
  const {currentTheme: colorScheme} = useTheme();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  console.log(codeType, codeValue);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
        setKeyboardVisible(true);
      });
      const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardVisible(false);
      });

      return () => {
        keyboardDidHideListener.remove();
        keyboardDidShowListener.remove();
      };
    })
  }, [isKeyboardVisible]);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollViewContent}
      enableOnAndroid={true}
      extraScrollHeight={50}
      showsVerticalScrollIndicator={false}
      scrollEnabled={isKeyboardVisible}
      style={{ backgroundColor: colorScheme === 'light' ? Colors.light.background : Colors.dark.background }}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={[Platform.OS == 'android' ? { paddingTop: 110 } : { paddingTop: 40 }]}>Add to Wallet</ThemedText>
        </ThemedView>
        <ThemedInput
          placeholder={t('addScreen.placeholder')}
          label={t('addScreen.label')}
          value={codeValue}
        />
      </ThemedView>
    </KeyboardAwareScrollView>
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
