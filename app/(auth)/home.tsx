import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Platform, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedScrollHandler,
  Easing,
  useDerivedValue,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { debounce, throttle } from 'lodash';

import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { useThemeColor } from '@/hooks/useThemeColor';
import ThemedFilter from '@/components/ThemedFilter';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedIconInput } from '@/components/Inputs';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedBottomSheet from '@/components/bottomsheet/ThemedBottomSheet';
import { ThemedEmptyCard, ThemedCardItem } from '@/components/cards';
import ThemedFilterSkeleton from '@/components/skeletons/ThemedFilterSkeleton';
import ThemedCardSkeleton from '@/components/skeletons/ThemedCardSkeleton';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import { fetchQrData } from '@/services/auth/fetchQrData';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useLocale } from '@/context/LocaleContext';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/utils/storage';
import {
  createTable,
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  getLocallyDeletedQrCodes,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  filterQrCodes,
} from '@/services/localDB/qrDB';
import { Colors } from '@/constants/Colors';
import { ThemedBottomToast } from '@/components/toast/ThemedBottomToast';

function HomeScreen() {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale', storage);
  const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
  const [isEmpty, setIsEmpty] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastMessage, setBottomToastMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [filter, setFilter] = useState('all');

  const isEmptyShared = useSharedValue(isEmpty ? 1 : 0);
  // const isActiveShared = useSharedValue(isActive ? 1 : 0);

  const [qrData, setQrData] = useState<QRRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const flatListRef = useRef<FlatList>(null);

  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  const emptyCardOffset = useSharedValue(300);
  const scrollY = useSharedValue(0);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const syncWithServer = useCallback(async (userId: string) => {
    if (isOffline) {
      console.log('Cannot sync while offline');
      return;
    }

    try {
      setIsSyncing(true);
      setBottomToastMessage(t('homeScreen.syncing'));
      setIsBottomToastVisible(true);

      // Sync local changes (new, updated, deleted) to the server
      await syncQrCodes(userId);
    } catch (error) {
      console.error('Error syncing QR codes:', error);
      // setToastMessage(t('homeScreen.syncError'));
      setIsToastVisible(true);
    } finally {
      setIsBottomToastVisible(false);
      setTimeout(() => {
        setIsSyncing(false);
      }, 300);
    }
  }, []); // Removed isOffline from dependencies

  const fetchServerData = async (userId: string) => {
    try {
      const [serverData, locallyDeletedData] = await Promise.all([
        fetchQrData(userId, 1, 30),
        getLocallyDeletedQrCodes(userId),
      ]);

      // Lọc dữ liệu từ server dựa trên danh sách đã xóa cục bộ
      return serverData.items.filter(
        item => !locallyDeletedData.some(deletedItem => deletedItem.id === item.id)
      );
    } catch (error) {
      console.error('Error fetching server data:', error);
      throw error;
    }
  };

  const fetchLocalData = async (userId: string) => {
    const localData = await getQrCodesByUserId(userId);
    setQrData(localData);
    setIsEmpty(localData.length === 0);
  };
  const fetchData = useCallback(
    throttle(async () => {
      if (!userId) return;

      setIsLoading(true);

      try {
        // Bước 1: Fetch dữ liệu local
        await fetchLocalData(userId);

        // Bước 2: Chỉ đồng bộ và fetch dữ liệu từ server nếu đang online
        if (!isOffline) {
          await syncWithServer(userId);
          const serverData = await fetchServerData(userId);

          // Bước 3: Cập nhật dữ liệu vào local database nếu có thay đổi
          if (serverData.length > 0) {
            await insertOrUpdateQrCodes(serverData);
            await fetchLocalData(userId);
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        setToastMessage(t('homeScreen.fetchError'));
        setIsToastVisible(true);
      } finally {
        setIsLoading(false);
      }
    }, 1000),
    [userId, isOffline]
  );

  // Fetch dữ liệu local khi ứng dụng khởi động
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        await createTable();
        await fetchLocalData(userId);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading local data:', error);
        setToastMessage(t('homeScreen.loadError'));
        setIsToastVisible(true);
      }
    };
    loadLocalData();
  }, [userId]);

  // Đồng bộ dữ liệu với server sau khi local data đã tải xong
  useEffect(() => {
    if (isOffline || !userId) return;

    const syncAndFetchServerData = async () => {
      try {
        setIsSyncing(true);
        await syncWithServer(userId);
        const serverData = await fetchServerData(userId);

        // Cập nhật local database nếu có dữ liệu mới từ server
        if (serverData.length > 0) {
          await insertOrUpdateQrCodes(serverData);
          await fetchLocalData(userId);
        }
      } catch (error) {
        console.error('Error syncing with server:', error);
        setToastMessage(t('homeScreen.syncError'));
        setIsToastVisible(true);
      } finally {
        setIsSyncing(false);
      }
    };

    // Chỉ đồng bộ khi ứng dụng khởi động xong và đã tải dữ liệu local
    const syncTimeout = setTimeout(syncAndFetchServerData, 2000); // Đợi 2 giây trước khi đồng bộ
    return () => clearTimeout(syncTimeout);
  }, [isOffline, userId]);


  useEffect(() => {
    setBottomToastMessage(t('homeScreen.offline'));
    setIsBottomToastVisible(isOffline);
  }, [isOffline, locale]);

  const debouncedSetSearchQuery = useCallback(
    debounce((query) => {
      setDebouncedSearchQuery(query);
    }, 300),
    []
  );

  // Update debounced search query whenever searchQuery changes
  useEffect(() => {
    debouncedSetSearchQuery(searchQuery);

    // Clean up on unmount to prevent memory leaks
    return () => {
      debouncedSetSearchQuery.cancel();
    };
  }, [searchQuery, debouncedSetSearchQuery]);

  // Fetch filtered data from the database
  useEffect(() => {
    if (userId) {
      filterQrCodes(userId, debouncedSearchQuery, filter).then(setQrData);
    }
  }, [userId, debouncedSearchQuery, filter]);
  
  // Animate empty card when isEmpty changes
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (isEmpty) {
      animateEmptyCard();
    }
  }, [isEmpty]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  // Combine animations for opacity and translateY based on scrollY in useDerivedValue
  const headerAnimation = useDerivedValue(() => {
    const opacity = scrollY.value > 50 ? 0 : 1;
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -25],
      Extrapolation.CLAMP
    );
    const zIndex = scrollY.value > 50 || isActive ? 0 : 1;
    return { opacity, translateY, zIndex };
  }, [scrollY, isActive]);

  // Apply animation style in useAnimatedStyle
  const titleContainerStyle = useAnimatedStyle(() => {
    const { opacity, translateY, zIndex } = headerAnimation.value;
    return {
      opacity: withTiming(opacity, { duration: 180, easing: Easing.out(Easing.ease) }),
      transform: [{ translateY }],
      zIndex,
    };
  }, [headerAnimation]); // Track changes to derived value


  const scrollContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollY.value > 50 ? withTiming(1) : withTiming(0),
      pointerEvents: scrollY.value > 50 ? 'auto' : 'none',
    };
  });

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
  }));

  const onNavigateToEmptyScreen = useCallback(() => {
    router.push('/empty');
  }, []);

  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item))
        },
      });
    }, 1000),
    [] // Empty dependencies if item structure is stable; adjust if props change frequently
  );

  const onNavigateToScanScreen = useCallback(() => {
    router.push('/(scan)/scan-main');
  }, []);

  const onNavigateToSettingsScreen = useCallback(() => {
    router.push('/settings');
  }, []);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true);
  }, []);

  const onDragEnd = useCallback(async ({ data }: { data: QRRecord[] }) => {

    try {
      // Check if the order has changed
      triggerHapticFeedback();
      const isOrderChanged =
        data.length !== qrData.length ||
        data.some((item, index) => item.id !== qrData[index].id);

      // Proceed only if the order has changed
      if (isOrderChanged) {
        // Update the component state with the new order
        setQrData(data);

        // Update qr_index values and timestamps
        const updatedData = data.map((item, index) => ({
          ...item,
          qr_index: index,
          updated: new Date().toISOString(),
        }));

        // Update the indexes and timestamps in the local database
        await updateQrIndexes(updatedData);
        // console.log('QR indexes and timestamps updated in the database');
      } else {
        // console.log('Order has not changed; no update needed.');
      }
    } catch (error) {
      console.error('Error updating QR indexes and timestamps:', error);
    } finally {
      setIsActive(false);
    }
  }, [qrData]);

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [flatListRef]);

  const handleExpandPress = useCallback((id: string) => {
    setSelectedItemId(id);
    bottomSheetRef.current?.expand();
  }, [setSelectedItemId, bottomSheetRef]);

  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  const onDeletePress = useCallback(async () => {
    if (!selectedItemId) return;

    try {
      setIsSyncing(true);
      setIsToastVisible(true);
      setToastMessage(t('homeScreen.deleting'));

      // Mark the QR code as deleted in the local database
      await deleteQrCode(selectedItemId);

      // Fetch updated data from the local database
      const updatedLocalData = await getQrCodesByUserId(userId);

      // Reindex the remaining items
      const reindexedData = updatedLocalData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));

      // Update the indexes and timestamps in the local database
      await updateQrIndexes(reindexedData);

      // Update state with the new data
      setQrData(reindexedData);
      setIsEmpty(reindexedData.length === 0);

      // Deletion successful, hide modal and toast
      setIsModalVisible(false);
      setIsToastVisible(false);
    } catch (error) {
      console.error('Error deleting QR code:', error);
      setToastMessage(t('homeScreen.deleteError'));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);
    }
  }, [selectedItemId, userId]);

  const renderItem = useCallback(
    ({ item, drag }: { item: QRRecord; drag: () => void }) => {

      return (
        <ScaleDecorator activeScale={1.04}>
          <ThemedCardItem
            onItemPress={() => onNavigateToDetailScreen(item)}
            code={item.code}
            type={item.type}
            metadata={item.metadata}
            metadata_type={item.metadata_type}
            onMoreButtonPress={() => handleExpandPress(item.id)}
            accountName={item.account_name}
            accountNumber={item.account_number}
            onDrag={drag}
          />
        </ScaleDecorator>
      );
    },
    [onNavigateToDetailScreen, handleExpandPress]
  );

  return (
    <ThemedView style={styles.container}>
      {Platform.OS === 'android' ? (
        <ThemedView style={styles.blurContainer} />
      ) : (
        <BlurView intensity={10} style={styles.blurContainer} />
      )}
      <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="auto">
        <View style={styles.headerContainer}>
          <ThemedText style={styles.titleText} type="title">{t('homeScreen.title')}</ThemedText>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="scan"
              style={styles.titleButton}
              onPress={onNavigateToScanScreen}
            />
            <ThemedButton
              iconName="settings"
              style={styles.titleButton}
              onPress={onNavigateToSettingsScreen} />
          </View>
        </View>
        {(!isEmpty || isLoading) && (
          <>
            <ThemedIconInput
              placeholder={t('homeScreen.searchPlaceholder')}
              iconName="search"
              value={searchQuery}
              onChangeText={setSearchQuery}
              // pointerEvents={isLoading && qrData.length > 0 ? 'none' : 'auto'}
              style={{ marginHorizontal: 15 }}
            />
            {isLoading ? (
              <ThemedFilterSkeleton show={true} />
            ) : (
              <ThemedFilter
                selectedFilter={filter}
                onFilterChange={setFilter}
                style={{ paddingHorizontal: 15 }}
              />
            )}
          </>
        )}

      </Animated.View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 3 }).map((_, index) => (
            <ThemedCardSkeleton key={index} index={index} />
          ))}
        </View>
      ) : isEmpty ? (
        <Animated.ScrollView
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContainer}
        >
          <Animated.View style={[styles.emptyCard, emptyCardStyle]}>
            <ThemedEmptyCard
              headerLabel={t('homeScreen.emptyCard.header')}
              footerLabel={t('homeScreen.emptyCard.footer')}
              footButtonLabel={t('homeScreen.emptyCard.footerButton')}
              cardOnPress={onNavigateToEmptyScreen}
              buttonOnPress={onNavigateToScanScreen}
            />
          </Animated.View>
        </Animated.ScrollView>
      ) : (
        <DraggableFlatList
          ref={flatListRef}
          ListEmptyComponent={
            <View style={styles.emptyItem}>
              <Ionicons color={color} name="search" size={40} />
              <ThemedText style={{ textAlign: 'center' }}>
                {t('homeScreen.noItemFound')}
              </ThemedText>
            </View>
          }
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          data={qrData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={[styles.listContainer]}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          onDragBegin={onDragBegin}
          onDragEnd={onDragEnd}
          dragItemOverflow={false}
          activationDistance={10}
          onScrollOffsetChange={(offset) => {
            scrollY.value = offset;
          }}
          decelerationRate={'fast'}
        />
      )}
      <Animated.View style={scrollContainerStyle}>
        <ThemedButton iconName="chevron-up" style={styles.scrollButton} onPress={scrollToTop} />
      </Animated.View>
      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
        isSyncing={isSyncing}
      />
      <ThemedBottomToast
        isSyncing={isSyncing}
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName="cloud-offline"
        style={styles.bottomToastContainer}
      />
      <ThemedBottomSheet
        ref={bottomSheetRef}
        onDeletePress={onDeleteSheetPress}
        onEditPress={() => { }}
        editText={t('homeScreen.edit')}
        deleteText={t('homeScreen.delete')}
      />
      <ThemedModal
        primaryActionText={t('homeScreen.moveToTrash')}
        onPrimaryAction={onDeletePress}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t('homeScreen.cancel')}
        title={t('homeScreen.confirmDeleteTitle')}
        message={t('homeScreen.confirmDeleteMessage')}
        isVisible={isModalVisible}
        iconName="trash"
      />
    </ThemedView>
  );
}

export default React.memo(HomeScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 25,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    pointerEvents: 'box-none',
  },
  titleText: {
    fontSize: 28,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'box-none',
  },
  titleButton: {
  },
  scrollContainer: {
    paddingTop: STATUSBAR_HEIGHT + 95,
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: 15,
  },
  listContainer: {
    paddingTop: STATUSBAR_HEIGHT + 215,
    paddingHorizontal: 15,
    flexGrow: 1,
    paddingBottom: 20,
  },
  emptyItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    right: 15,
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  blurContainer: {
    position: 'absolute',
    opacity: 0.8,
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 60,
    right: 15,
  },
  loadingContainer: {
    paddingTop: STATUSBAR_HEIGHT + 215,
    paddingHorizontal: 15,
    flex: 1,
  },
});
