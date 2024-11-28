import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, TextInput, FlatList, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedScrollHandler,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { debounce, throttle } from 'lodash';

import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { useThemeColor } from '@/hooks/useThemeColor';
import ThemedFilter from '@/components/ThemedFilter';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedIconInput } from '@/components/Inputs';
import { ThemedFAB, ThemedButton } from '@/components/buttons';
import ThemedBottomSheet from '@/components/bottomsheet/ThemedBottomSheet';
import { ThemedEmptyCard, ThemedCardItem } from '@/components/cards';
import { ThemedFilterSkeleton, ThemedCardSkeleton } from '@/components/skeletons';;
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import { fetchQrData } from '@/services/auth/fetchQrData';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import BottomSheet from '@gorhom/bottom-sheet';
// import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialIcons } from '@expo/vector-icons';
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
import { ThemedBottomToast } from '@/components/toast/ThemedBottomToast';

const screenHeight = Dimensions.get('window').height;

function HomeScreen() {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale', storage);
  const color = useThemeColor({ light: '#3A2E24', dark: '#FFF5E1' }, 'text');
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
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

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

  const [fabOpen, setFabOpen] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const syncWithServer = useCallback(async (userId: string) => {
    if (isOffline || isSyncing) {
      console.log('Cannot sync while offline or another sync is in progress');
      return;
    }

    try {
      setIsSyncing(true);
      setBottomToastMessage(t('homeScreen.syncing'));
      setIsBottomToastVisible(true);

      await syncQrCodes(userId);
      const serverData = await fetchServerData(userId);

      if (serverData.length > 0) {
        await insertOrUpdateQrCodes(serverData);

        // Update the UI with new data without triggering a full reload
        const updatedLocalData = await getQrCodesByUserId(userId);
        setQrData(updatedLocalData);
        setIsEmpty(updatedLocalData.length === 0);
      }
    } catch (error) {
      console.error('Error syncing QR codes:', error);
      setToastMessage(t('homeScreen.syncError'));
      setIsToastVisible(true);
    } finally {
      setIsBottomToastVisible(false);
      // setIsSyncing(false);
    }
  }, [isOffline, isSyncing, userId]);

  const fetchServerData = async (userId: string) => {
    try {
      const [serverData, locallyDeletedData] = await Promise.all([
        fetchQrData(userId, 1, 30),
        getLocallyDeletedQrCodes(userId),
      ]);

      return serverData.items.filter(
        item => !locallyDeletedData.some(deletedItem => deletedItem.id === item.id)
      );
    } catch (error) {
      console.error('Error fetching server data:', error);
      throw error;
    }
  };

  const fetchLocalData = useCallback(async (userId: string) => {
    try {
      const localData = await getQrCodesByUserId(userId);
      setQrData(localData);
      setIsEmpty(localData.length === 0);
    } catch (error) {
      console.error('Error fetching local data:', error);
      setToastMessage(t('homeScreen.loadError'));
      setIsToastVisible(true);
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        setIsLoading(true); // Set loading to true here
        await createTable();
        await fetchLocalData(userId);
      } catch (error) {
        console.error('Error loading local data:', error);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      }
    };

    if (userId) {
      loadLocalData();
    }
  }, [userId, fetchLocalData]);

  useEffect(() => {
    if (isOffline || !userId) return;

    const syncTimeout = setTimeout(() => {
      syncWithServer(userId);
    }, 2000);

    return () => clearTimeout(syncTimeout);
  }, [isOffline, userId]); // syncWithServer is a dependency

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

  useEffect(() => {
    if (isSearching) {
      // Use a small timeout to ensure the input is rendered
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 250); // Small delay to allow rendering

      // Clean up the timeout
      return () => clearTimeout(focusTimeout);
    }
  }, [isSearching]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  const searchContainerStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: 15,
      height: isSearching ? withTiming(40, { duration: 250, easing: Easing.out(Easing.ease) }) : withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }),
      opacity: withTiming(isSearching ? 1 : 0, { duration: 250, easing: Easing.out(Easing.ease) }),
      transform: [{ translateY: withTiming(isSearching ? 0 : -20, { duration: 250, easing: Easing.out(Easing.quad) }) }],
      overflow: 'hidden',
      pointerEvents: isSearching ? 'auto' : 'none',
      marginBottom: isSearching ? withTiming(15, { duration: 250, easing: Easing.out(Easing.ease) }) : withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) }),
    };
  }, [isSearching]);

  const titleContainerStyle = useAnimatedStyle(() => {
    const scrollThreshold = isSearching === true ? 140 + 40 : 120;

    const opacity = interpolate(
      scrollY.value,
      [scrollThreshold, scrollThreshold + 30],
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
      zIndex: scrollY.value > 100 || isActive ? 0 : 1,
    };
  });

  const listHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
    pointerEvents: scrollY.value > 40 ? 'none' : 'auto',
  }));

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = interpolate(
      isBottomToastVisible ? 1 : 0,
      [-0.5, 1.5],
      [20, 60], // 40 is the original margin, 60 is the toast height (adjust if needed)
      Extrapolation.CLAMP
    );
    return {
      marginBottom,
      zIndex: isActive ? 10 : 0, 
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
  const onNavigateToAddScreen = useCallback(() => {
    router.push('/(add)/add-new');
  }, [])

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (event.contentOffset.y > 50 && fabOpen) {
      setFabOpen(false);
    } else if (event.contentOffset.y <= 50 && !fabOpen) {
      setFabOpen(true);
    }
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
        setQrData(data); // This will re-render DraggableFlatList
  
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
  }, [qrData]); // Include qrData in the dependency array

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

  const paddingValues = [0, screenHeight * 0.73, screenHeight * 0.43, screenHeight * 0.23];

  const listContainerPadding = useMemo(() => {
    return paddingValues[qrData.length] || 0; // Default to 0 if length is beyond the array
  }, [qrData.length, screenHeight]);
  
  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.blurContainer} />
      <Animated.View style={[styles.titleContainer, titleContainerStyle]} pointerEvents="box-none">
        <View style={styles.headerContainer} pointerEvents='box-none'>
          <ThemedText style={styles.titleText} type="title">{t('homeScreen.title')}</ThemedText>
          <View style={styles.titleButtonContainer}>
            {!isEmpty && (
              <ThemedButton
                iconName="magnify"
                style={styles.titleButton}
                onPress={() => {
                  if (isLoading) return;
                  setIsSearching(!isSearching);
                  scrollToTop();

                }}
              />
            )}

            <ThemedButton
              iconName="qrcode-scan"
              style={styles.titleButton}
              onPress={onNavigateToScanScreen}
            />
            <ThemedButton
              iconName="cog"
              style={styles.titleButton}
              onPress={onNavigateToSettingsScreen} />
          </View>
        </View>
      </Animated.View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={{ marginBottom: 25 }}>
            <ThemedFilterSkeleton show={true} />
          </View>
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
          ListHeaderComponent={
            <Animated.View
              style={[listHeaderStyle, { marginBottom: 25 }]}
            >
              <Animated.View
                style={[searchContainerStyle]}

              >
                <ThemedIconInput
                  style={styles.searchInput}
                  placeholder={t('homeScreen.searchPlaceholder')}
                  iconName="search"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  ref={inputRef}
                />
              </Animated.View>
              <ThemedFilter
                selectedFilter={filter}
                onFilterChange={setFilter}
              />
            </Animated.View>
          }
          ListEmptyComponent={
            <View style={styles.emptyItem}>
              <MaterialIcons color={color} name="search" size={50} />
              <ThemedText style={{ textAlign: 'center', lineHeight: 30 }}>
                {t('homeScreen.noItemFound')}
              </ThemedText>
            </View>
          }
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          data={[...qrData]}
          renderItem={renderItem}
          keyExtractor={(item, index) => `draggable-item-${item.id}`}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={[styles.listContainer, qrData.length > 0 && { paddingBottom: listContainerPadding }]}
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
      {!isLoading &&
        <ThemedFAB
          open={fabOpen}
          setOpen={setFabOpen}
          animatedStyle={[fabStyle, styles.fab]}
          onPress1={onNavigateToScanScreen}
          onPress2={onNavigateToAddScreen} 
          text1='Add'
          text2='Scan'
          />
      }
      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
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
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t('homeScreen.cancel')}
        title={t('homeScreen.confirmDeleteTitle')}
        message={t('homeScreen.confirmDeleteMessage')}
        isVisible={isModalVisible}
        iconName="delete-outline"

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
    top: STATUSBAR_HEIGHT + 45,
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    pointerEvents: 'box-none',
  },
  titleText: {
    fontSize: 28,
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    pointerEvents: 'box-none',
  },
  titleButton: {
  },
  scrollContainer: {
    paddingTop: STATUSBAR_HEIGHT + 105,
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: 15,
  },
  searchInput: {
    borderRadius: 15,
    paddingVertical: 0,
  },
  listContainer: {
    paddingTop: STATUSBAR_HEIGHT + 105,
    // paddingHorizontal: 15,
    flexGrow: 1,
    // paddingBottom: screenHeight / 5,
  },
  emptyItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    opacity: 0.7,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 15,
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
  fab: {
    bottom: 20,
    right: 15,
    position: 'absolute',
  },
  loadingContainer: {
    paddingTop: STATUSBAR_HEIGHT + 105,
    paddingHorizontal: 15,
    flex: 1,
  },
});
