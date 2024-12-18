import React, { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { router } from 'expo-router';

import { RootState } from '@/store/rootReducer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import Avatar from '@zamplyy/react-native-nice-avatar';
import { ThemedSettingsCardItem } from '@/components/cards/ThemedSettingsCard';
import { ThemedModal } from '@/components/modals/ThemedIconModal';

import { t } from '@/i18n';
import { storage } from '@/utils/storage';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { clearAuthData } from '@/store/reducers/authSlice';
import pb from '@/services/pocketBase';
import { useMMKVString } from 'react-native-mmkv';
import { useLocale } from '@/context/LocaleContext';
import { ActivityIndicator } from 'react-native-paper';
import { clearErrorMessage } from '@/store/reducers/errorSlice';
import { removeAllQrData } from '@/store/reducers/qrSlice';
import { useTheme } from '@/context/ThemeContext';

import { MaterialIcons } from '@expo/vector-icons';

// Define the type for your settings card items
interface SettingsCardItem {
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  settingsTitle: string;
  onPress?: () => void;
}

// Component for rendering a single settings card item
const SettingsCardItemComponent = ({ leftIcon, settingsTitle, onPress }: SettingsCardItem) => (
  <ThemedSettingsCardItem
    leftIcon={leftIcon}
    settingsTitle={settingsTitle}
    onPress={onPress ? onPress : () => { }}
  />
);

function SettingsScreen() {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale', storage);
  const avatarConfig = useSelector((state: RootState) => state.auth.avatarConfig);
  
  const { currentTheme } = useTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const dispatch = useDispatch();

  const scrollY = useSharedValue(0);
  const email = useSelector((state: RootState) => state.auth.user?.email ?? '-');
  const name = useSelector((state: RootState) => state.auth.user?.name ?? '-');

  const sectionsColors = currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [40, 70],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 150],
      [0, -35],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 40 ? 0 : 1,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const logout = async () => {
    try {
      setIsModalVisible(false);
      setIsLoading(true);
      await SecureStore.deleteItemAsync('authToken');
      pb.authStore.clear();
    } catch (error) {
      console.log(error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        dispatch(clearAuthData());
        dispatch(clearErrorMessage()); // Clear error on logout
        dispatch(removeAllQrData());
        router.replace('/login');
      }, 300);
    }
  };

  const onLogout = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const settingsData: SettingsCardItem[][] = [
    [
      { leftIcon: 'person-outline', settingsTitle: t('settingsScreen.editProfile') },
      { leftIcon: 'lock-outline', settingsTitle: t('settingsScreen.changePassword') },
      { leftIcon: 'mail-outline', settingsTitle: t('settingsScreen.changeEmail') },
    ],
    [
      { leftIcon: 'info-outline', settingsTitle: t('settingsScreen.about') },
      {
        leftIcon: 'translate',
        settingsTitle: t('settingsScreen.language'),
        onPress: () => router.push('/language')
      },
      {
        leftIcon: 'contrast',
        settingsTitle: t('settingsScreen.appTheme'),
        onPress: () => router.push('/theme')
      },
    ],
  ];

  const renderItem = useCallback(({ item, index }: { item: SettingsCardItem[], index: number }) => (
    <View key={index} style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}>
      {item.map((subItem, subIndex) => (
        <SettingsCardItemComponent key={subIndex} {...subItem} />
      ))}
    </View>
  ), [sectionsColors]);

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
          <ThemedText style={styles.title} type="title">{t('settingsScreen.title')}</ThemedText>
        </View>
      </Animated.View>

      <Animated.FlatList
        contentContainerStyle={styles.scrollContainer}
        onScroll={scrollHandler}
        data={settingsData}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={
          <View style={[styles.avatarContainer, { backgroundColor: sectionsColors }]}>
            <LinearGradient
              colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {avatarConfig ? (
                <Avatar size={45} {...avatarConfig} />
              ) : (
                <View style={styles.avatarLoadContainer}>
                  <ActivityIndicator size={10} color="white" />
                </View>
              )}
            </LinearGradient>
            <View style={styles.userContainer}>
              <ThemedText numberOfLines={1} style={styles.userEmail}>{name ? name : '-'}</ThemedText>
              <ThemedText numberOfLines={1} style={styles.userName}>{email ? email : '-'}</ThemedText>
            </View>
          </View>
        }
        ListFooterComponent={
          <ThemedButton
            iconName="logout"
            label={t('settingsScreen.logout')}
            loadingLabel={t('settingsScreen.logingOut')}
            loading={isLoading}
            onPress={onLogout}
            style={{ marginTop: 10 }}
          />
        }
        scrollEventThrottle={16}
      />

      <ThemedModal
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        primaryActionText={t('settingsScreen.logout')}
        onPrimaryAction={logout}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t('settingsScreen.cancel')}
        title={t('settingsScreen.confirmLogoutTitle')}
        message={t('settingsScreen.confirmLogoutMessage')}
        isVisible={isModalVisible}
        iconName="logout"
      />
    </ThemedView>
  );
}

export default React.memo(SettingsScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  titleButton: {
    zIndex: 11,
  },
  title: {
    fontSize: 28,
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
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingTop: STATUSBAR_HEIGHT + 105,
  },
  gradient: {
    borderRadius: 50, // Make it circular
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5, // Optional: Add padding if needed
  },
  avatarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 30,
    borderRadius: 16,
    gap: 0,
  },
  avatarLoadContainer: {
    width: 45,
    aspectRatio: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userContainer: {
    justifyContent: 'center',
    flexDirection: 'column',
    paddingHorizontal: 15,
    borderRadius: 16,
    maxWidth: '80%',
    overflow: 'hidden',
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userName: {
    opacity: 0.7,
    fontSize: 14,
    width: '100%',
  },
  sectionContainer: {
    borderRadius: 16,
    backgroundColor: 'white',
    marginBottom: 20,
    // gap: 5,
    overflow: 'hidden',
  },
  settingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    paddingVertical: 15,
  },
  settingsText: {
    fontSize: 16,
    opacity: 0.7,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
