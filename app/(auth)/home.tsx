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
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { debounce } from 'lodash';

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

function HomeScreen() {
  const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
  const [isEmpty, setIsEmpty] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [filter, setFilter] = useState('all');

  const isEmptyShared = useSharedValue(isEmpty ? 1 : 0);
  const isActiveShared = useSharedValue(isActive ? 1 : 0);

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
      setToastMessage(t('homeScreen.syncing'));
      setIsToastVisible(true);
  
      // Sync local changes (new, updated, deleted) to the server
      await syncQrCodes(userId);
    } catch (error) {
      console.error('Error syncing QR codes:', error);
      setToastMessage(t('homeScreen.syncError'));
      setIsToastVisible(true);
    } finally {
      setIsSyncing(false);
      setIsToastVisible(false);
    }
  }, []); // Removed isOffline from dependencies
  
  const fetchData = useCallback(async () => {
    if (!userId) return;
  
    setIsLoading(true);
  
    try {
      // Step 1: Fetch and display local data immediately
      const localData = await getQrCodesByUserId(userId);
      setQrData(localData);
  
      // Set empty state based on local data
      const isLocalDataEmpty = localData.length === 0;
      setIsEmpty(isLocalDataEmpty);
  
      // Animate empty card if necessary
      if (isLocalDataEmpty) {
        animateEmptyCard();
      }
  
      // If offline, we can't proceed with server sync
      if (isOffline) {
        console.log('Offline mode: cannot sync with server');
        return;
      }
  
      // Step 2: Sync local changes with the server
      await syncWithServer(userId);
  
      // Step 3: Fetch server data after successful sync
      const [serverData, locallyDeletedData] = await Promise.all([
        fetchQrData(userId, 1, 30),
        getLocallyDeletedQrCodes(userId),
      ]);
  
      // Step 4: Filter out server items that are deleted locally
      const filteredServerData = serverData.items.filter(
        item => !locallyDeletedData.some(deletedItem => deletedItem.id === item.id)
      );
  
      // Step 5: Merge new server data into local storage
      if (filteredServerData.length > 0) {
        await insertOrUpdateQrCodes(filteredServerData);
  
        // Step 6: Update local data displayed to the user
        const updatedLocalData = await getQrCodesByUserId(userId);
        setQrData(updatedLocalData);
        setIsEmpty(updatedLocalData.length === 0);
        animateEmptyCard();
      }
  
    } catch (error) {
      console.error('Error in fetchData:', error);
      setToastMessage(t('homeScreen.fetchError'));
      setIsToastVisible(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]); // Removed isOffline and syncWithServer from dependencies
  
  // Animate empty card when isEmpty changes
  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
    if (isEmpty) {
      animateEmptyCard();
    }
  }, [isEmpty]);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await createTable();
        fetchData();
      } catch (error) {
        console.error('Error creating table:', error);
      }
    };

    setupDatabase();
  }, [fetchData]);

  useEffect(() => {
    setToastMessage(isOffline ? t('homeScreen.offline') : '');
    setIsToastVisible(isOffline);
  }, [isOffline]);

  useEffect(() => {
    isActiveShared.value = isActive ? 1 : 0;
  }, [isActive]);

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

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  const titleContainerStyle = useAnimatedStyle(() => {
    const threshold = 40;
    const shouldSnap = scrollY.value > threshold;

    const translateY = withTiming(shouldSnap ? -30 : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    const opacity = withTiming(shouldSnap ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    const zIndex = scrollY.value > threshold || isActiveShared.value ? 0 : 20;

    return {
      opacity,
      transform: [{ translateY }],
      zIndex,
    };
  });

  const scrollContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollY.value > 200 ? withTiming(1) : withTiming(0),
    };
  });

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
  }));

  const onNavigateToEmptyScreen = useCallback(() => {
    router.push('/empty');
  }, []);

  const onNavigateToDetailScreen = useCallback((item: QRRecord) => {
    const serializedItem = JSON.stringify(item);
    router.push(`/detail?record=${encodeURIComponent(serializedItem)}`);
  }, []);

  const onNavigateToScanScreen = useCallback(() => {
    router.push('/(scan)/scan-main');
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
      triggerHapticFeedback();
      setIsActive(false);
    }
  }, [qrData]);
  
  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleExpandPress = useCallback((id: string) => {
    setSelectedItemId(id);
    bottomSheetRef.current?.expand();
  }, []);

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
      setIsSyncing(false);
    }
  }, [selectedItemId, userId]);

  const renderItem = useCallback(
    ({ item, drag }: { item: QRRecord; drag: () => void }) => (
      <ScaleDecorator activeScale={1.05}>
        <Animated.View style={emptyCardStyle}>
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
        </Animated.View>
      </ScaleDecorator>
    ),
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
          <ThemedText type="title">{t('homeScreen.title')}</ThemedText>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="scan"
              style={styles.titleButton}
              onPress={onNavigateToScanScreen}
            />
            <ThemedButton iconName="settings" style={styles.titleButton} onPress={() => { }} />
          </View>
        </View>
        {!isEmpty && (
          <>
            <ThemedIconInput
              placeholder={t('homeScreen.searchPlaceholder')}
              iconName="search"
              value={searchQuery}
              onChangeText={setSearchQuery}
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
          contentContainerStyle={styles.listContainer}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          onDragBegin={onDragBegin}
          onDragEnd={onDragEnd}
          dragItemOverflow={false}
          activationDistance={20}
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
        isSyncing={isSyncing}
        isVisible={isToastVisible}
        message={toastMessage}
        iconName="cloud-offline"
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
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
        iconName="trash-outline"
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
    gap: 20,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  titleButton: {
    zIndex: 11,
  },
  scrollContainer: {
    paddingTop: STATUSBAR_HEIGHT + 105,
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: 15,
  },
  listContainer: {
    paddingTop: STATUSBAR_HEIGHT + 235,
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
    bottom: 40,
    left: 15,
    right: 15,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUSBAR_HEIGHT,
    zIndex: 10,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 40,
    right: 15,
  },
  loadingContainer: {
    paddingTop: STATUSBAR_HEIGHT + 235,
    paddingHorizontal: 15,
    flex: 1,
  },
});
