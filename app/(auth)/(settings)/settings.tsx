import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
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
import { ThemedButton } from '@/components/buttons';
import { ThemedSettingsCardItem } from '@/components/cards/ThemedSettingsCard';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import Avatar from '@zamplyy/react-native-nice-avatar';
import { t } from '@/i18n';
import { storage } from '@/utils/storage';
import { Colors } from '@/constants/Colors';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { clearAuthData } from '@/store/reducers/authSlice';
import { removeAllQrData } from '@/store/reducers/qrSlice';
import { clearErrorMessage } from '@/store/reducers/errorSlice';
import pb from '@/services/pocketBase';
import { useMMKVString } from 'react-native-mmkv';
import { useLocale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';
import * as Application from 'expo-application';

// Define the type for your settings card items
interface SettingsCardItem {
  leftIcon: keyof typeof MaterialIcons.glyphMap;
  settingsTitle: string;
  onPress: () => void;
}

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
  const appVersion = Application.nativeApplicationVersion;

  const sectionsColors = useMemo(
    () =>
      currentTheme === 'light' ? Colors.light.cardBackground : Colors.dark.cardBackground,
    [currentTheme]
  );

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [40, 70], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 150], [0, -35], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
      zIndex: scrollY.value > 40 ? 0 : 1,
    };
  });

  const onNavigateBack = useCallback(() => {
    router.back();
  }, []);

  const onNavigateToEditScreen = useCallback(() => {
    router.push()
  }, [])

  const logout = useCallback(async () => {
    try {
      setIsModalVisible(false);
      setIsLoading(true);
      await SecureStore.deleteItemAsync('authToken');
      pb.authStore.clear();

      // Dispatch actions immediately *before* navigation.
      dispatch(clearErrorMessage());
      dispatch(removeAllQrData());  
      dispatch(clearAuthData());    

      router.replace('/login');

    } catch (error) {
      console.error('Logout error:', error);
      // Consider dispatching an error action here to show an error message.
    } finally {
      setIsLoading(false); // Set loading to false *after* everything is done.
    }
  }, [dispatch]);

  const onLogout = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const settingsData: SettingsCardItem[][] = [
    [
      {
        leftIcon: 'person-outline',
        settingsTitle: t('settingsScreen.editProfile'),
        onPress: () => router.push('/edit'),
      },
      {
        leftIcon: 'lock-outline',
        settingsTitle: t('settingsScreen.changePassword'),
        onPress: () => { },
      },
      {
        leftIcon: 'mail-outline',
        settingsTitle: t('settingsScreen.changeEmail'),
        onPress: () => { },
      },
    ],
    [
      {
        leftIcon: 'translate',
        settingsTitle: t('settingsScreen.language'),
        onPress: () => router.push('/language'),
      },
      {
        leftIcon: 'contrast',
        settingsTitle: t('settingsScreen.appTheme'),
        onPress: () => router.push('/theme'),
      },
    ],
  ];

  const renderItem = useCallback(
    ({ item, index }: { item: SettingsCardItem[]; index: number }) => (
      <View
        key={index}
        style={[styles.sectionContainer, { backgroundColor: sectionsColors }]}
      >
        {item.map((subItem) => (
          <ThemedSettingsCardItem key={subItem.settingsTitle} {...subItem} />
        ))}
      </View>
    ),
    [sectionsColors]
  );

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
          <ThemedText style={styles.title} type="title">
            {t('settingsScreen.title')}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.FlatList
        contentContainerStyle={styles.scrollContainer}
        onScroll={scrollHandler}
        data={settingsData}
        renderItem={renderItem}
        keyExtractor={(_, index) => index.toString()}
        ListHeaderComponent={
          <View style={[styles.avatarContainer, { backgroundColor: sectionsColors }]}>
            <LinearGradient
              colors={['#ff9a9e', '#fad0c4', '#fad0c4', '#fbc2eb', '#a18cd1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {avatarConfig ? (
                <Avatar size={getResponsiveWidth(11)} {...avatarConfig} />
              ) : (
                <View style={styles.avatarLoadContainer}>
                  <ActivityIndicator size={getResponsiveFontSize(10)} color="white" />
                </View>
              )}
            </LinearGradient>
            <View style={styles.userContainer}>
              <ThemedText numberOfLines={1} style={styles.userEmail}>
                {name}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.userName}>
                {email}
              </ThemedText>
            </View>
          </View>
        }
        ListFooterComponent={
          <>
            <ThemedButton
              iconName="logout"
              label={t('settingsScreen.logout')}
              loadingLabel={t('settingsScreen.logingOut')}
              loading={isLoading}
              onPress={onLogout}
              style={{ marginTop: getResponsiveHeight(1.8) }}
            />
            <ThemedText style={styles.versionText}>
              {t('settingsScreen.appVersion') + ' ' + appVersion}
            </ThemedText>
          </>
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
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(3.6),
    gap: getResponsiveWidth(3.6),
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
  },
  titleButton: {
    zIndex: 11,
  },
  title: {
    fontSize: getResponsiveFontSize(28),
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
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingTop: getResponsiveHeight(18),
  },
  gradient: {
    borderRadius: getResponsiveWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveWidth(1.2),
  },
  avatarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    marginBottom: getResponsiveHeight(3.6),
    borderRadius: getResponsiveWidth(4),
    gap: 0,
  },
  avatarLoadContainer: {
    width: getResponsiveWidth(11),
    aspectRatio: 1,
    borderRadius: getResponsiveWidth(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  userContainer: {
    justifyContent: 'center',
    flexDirection: 'column',
    paddingHorizontal: getResponsiveWidth(3.6),
    borderRadius: getResponsiveWidth(4),
    maxWidth: '80%',
    overflow: 'hidden',
  },
  userEmail: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
  },
  userName: {
    opacity: 0.7,
    fontSize: getResponsiveFontSize(14),
    width: '100%',
  },
  sectionContainer: {
    borderRadius: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(1.8),
    overflow: 'hidden',
  },
  versionText: {
    marginTop: getResponsiveHeight(0.9),
    fontSize: getResponsiveFontSize(12),
    opacity: 0.6,
    textAlign: 'center',
  },
});