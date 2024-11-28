import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { StyleSheet, View, Keyboard } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { t } from '@/i18n';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { useLocale } from '@/context/LocaleContext';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useMMKVString } from 'react-native-mmkv';
import { useTheme } from '@/context/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { ThemedInput } from '@/components/Inputs';

const AnimatedKeyboardAwareScrollView = Animated.createAnimatedComponent(KeyboardAwareScrollView);
const AddScreen: React.FC = () => {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale');
  const scrollY = useSharedValue(0);
  const { codeType, codeValue } = useLocalSearchParams();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [editedCodeType, setEditedCodeType] = useState(codeType?.toString() || '');
  const [editedCodeValue, setEditedCodeValue] = useState(codeValue?.toString() || '');

  useEffect(() => {
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
  }, []);

  const { currentTheme: theme } = useTheme();
  const colors = useMemo(() => (theme === 'light' ? Colors.light.text : Colors.dark.text), [theme]);
  const sectionsColors = useMemo(() => (
    theme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground
  ), [theme]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 140], [0, -35], Extrapolation.CLAMP);
    const opacity = withTiming(scrollY.value > 70 ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 50 ? 0 : 20,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const handleSave = useCallback(() => {
    // Implement save logic here
    console.log('Saving:', { editedCodeType, editedCodeValue });
  }, [editedCodeType, editedCodeValue]);

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />
      <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
        <View style={styles.headerContainer}>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="chevron-left"
              style={styles.titleButton}
              onPress={onNavigateBack}
            />
          </View>
          <ThemedText style={styles.title} type="title">{t('addScreen.title')}</ThemedText>
        </View>
      </Animated.View>
      <AnimatedKeyboardAwareScrollView
        contentContainerStyle={[styles.scrollViewContent, {backgroundColor: theme === 'light' ? Colors.light.background : Colors.dark.background }]}
        enableOnAndroid={true}
        extraScrollHeight={50}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={{ }}
        onScroll={scrollHandler}
      >
        <ThemedInput
          placeholder={t('languageScreen.placeholder')}
          label='Mã vạch'
          value={editedCodeValue}
          onChangeText={setEditedCodeValue}
        />
        <ThemedInput
          placeholder={t('languageScreen.placeholder')}
          label='Code Type'
          value={editedCodeType}
          onChangeText={setEditedCodeType}
        />
        <ThemedButton
          label='save'
          onPress={handleSave}
          style={styles.saveButton}
        />
        {/* </Animated.ScrollView> */}
      </AnimatedKeyboardAwareScrollView>
    </ThemedView>
  );
}

export default React.memo(AddScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
  },
  scrollViewContent: {
    flexGrow: 1,
    // flex: 1,
    paddingHorizontal: 15,
    backgroundColor: 'red',
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  titleContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 45,
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 15,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  title: {
    fontSize: 28,
  },
  titleButton: {
    zIndex: 11,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  saveButton: {
    marginTop: 20,
  },
});