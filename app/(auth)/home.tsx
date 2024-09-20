import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Platform, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedScrollHandler,
  Easing
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedFilter } from '@/components/ThemedFilter';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedIconInput } from '@/components/Inputs';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import ThemedBottomSheet from '@/components/bottomsheet/ThemedBottomSheet';
import { ThemedEmptyCard, ThemedCardItem } from '@/components/cards';
import ThemedFilterSkeleton from '@/components/skeletons/ThemedFilterSkeleton';
import ThemedCardSkeleton from '@/components/skeletons/ThemedCardSkeleton';
import { ThemedStatusToast } from '@/components/toast/ThemedOfflineToast';
import { fetchQrData } from '@/services/auth/fetchData/fetchQrData';
import { RootState } from '@/store/rootReducer';
import { t } from '@/i18n';
import BottomSheet from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triggerHapticFeedback } from '@/utils/haptic';

import {
  createTable,
  getQrCodesByUserId,
  insertQrCodesBulk,
  syncQrCodes,
  deleteQrCode,
} from '@/services/localDB/qrDB';

function HomeScreen() {
  const color = useThemeColor({ light: '#5A4639', dark: '#FFF5E1' }, 'text');
  const [isEmpty, setIsEmpty] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
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

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const syncWithServer = useCallback(async (userId: string) => {
  
    try {
      // Fetch server data and sync in parallel if possible
      const [serverData] = await Promise.all([
        fetchQrData(userId, 1, 30),
        syncQrCodes(userId), // Sync unsynced local data in parallel
      ]);
  
      // Only insert if there are new items
      if (serverData.totalItems > 0) {
        await insertQrCodesBulk(serverData.items);
      }
  
      console.log('Sync with server completed');
    } catch (error) {
      console.error('Error syncing QR codes:', error);
    } 
  }, [userId]);
  
  const fetchData = useCallback(async () => {
    if (!userId) return;
  
    setIsLoading(true);
  
    try {
      // Fetch local data first
      const localData = await getQrCodesByUserId(userId);
      setQrData(localData);
      setIsEmpty(localData.length === 0);
  
      // Only sync with server if online
      if (!isOffline) {
        await syncWithServer(userId);
  
        // Fetch updated local data only if sync occurred
        setIsSyncing(true);
        setIsToastVisible(true);
        const updatedLocalData = await getQrCodesByUserId(userId);
        setQrData(updatedLocalData);
        setIsEmpty(updatedLocalData.length === 0);
      }
    } catch (error) {
      console.error('Error fetching QR codes:', error);
    } finally {
      setIsLoading(false);
      setIsToastVisible(false);
    }
  }, [userId, isOffline, syncWithServer]);
  
  // Animate empty card when isEmpty changes to true
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    setIsToastVisible(isOffline);
  }, [isOffline]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    isEmptyShared.value = isEmpty ? 1 : 0;
  }, [isEmpty]);

  useEffect(() => {
    isActiveShared.value = isActive ? 1 : 0;
  }, [isActive]);

  const filteredData = useMemo(() => {
    try {
      let results = qrData;

      if (debouncedSearchQuery) {
        results = results.filter(
          (item) =>
            item.code.includes(debouncedSearchQuery) ||
            item.metadata.includes(debouncedSearchQuery) ||
            (item.account_name && item.account_name.includes(debouncedSearchQuery)) ||
            (item.account_number && item.account_number.includes(debouncedSearchQuery))
        );
      }

      return filter === 'all' ? results : results.filter((item) => item.type === filter);
    } catch (error) {
      console.error('Error filtering QR codes:', error);
      return [];
    }
  }, [debouncedSearchQuery, filter, qrData]);

  const animateEmptyCard = () => {
    emptyCardOffset.value = withSpring(0, {
      damping: 30,
      stiffness: 150,
    });
  };

  const titleContainerStyle = useAnimatedStyle(() => {
    const threshold = 40; // Adjust this threshold as needed
    const shouldSnap = scrollY.value > threshold;

    // Using withTiming with Easing for a smooth transition
    const translateY = withTiming(shouldSnap ? -30 : 0, {
      duration: 300,
      easing: Easing.out(Easing.ease), // Easing effect to smooth the transition
    });

    const opacity = withTiming(shouldSnap ? 0 : 1, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    const zIndex = scrollY.value > 40 || isActiveShared.value ? 0 : 20;

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
  const onDragEnd = useCallback(({ data }: { data: QRRecord[] }) => {
    setQrData(data);
    triggerHapticFeedback();
    setIsActive(false);
  }, []);

  const scrollToTop = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleExpandPress = useCallback((id: string) => {
    setSelectedItemId(id);
    bottomSheetRef.current?.expand();
  }, []);

  const onDeletePress = async () => {
    if (selectedItemId) {
      try {
        setIsSyncing(true);
        setIsToastVisible(true);
        await deleteQrCode(selectedItemId);
        const updatedLocalData = await getQrCodesByUserId(userId);
        setQrData(updatedLocalData);
        setIsEmpty(updatedLocalData.length === 0);
        bottomSheetRef.current?.close();
      }
      catch (error) {
        console.error('Error deleting QR code:', error);
      } finally {
        setIsToastVisible(false);
        setSelectedItemId(null);
        setIsSyncing(false);

      }
    }
  };

  const renderItem = useCallback(
    ({ item, drag }: { item: QRRecord; drag: () => void }) => (
      <ScaleDecorator activeScale={1.05}>
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
            <ThemedButton iconName="person" style={styles.titleButton} onPress={() => { }} />
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
            <ThemedCardSkeleton key={index} />
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
              <ThemedText style={{ textAlign: 'center' }}>{t('homeScreen.noItemFound')}</ThemedText>
            </View>
          }
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={styles.listContainer}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          onDragBegin={onDragBegin}
          onDragEnd={onDragEnd}
          dragItemOverflow={false}
          onScrollOffsetChange={(offset) => {
            scrollY.value = offset;
          }}
        />
      )}
      <Animated.View style={scrollContainerStyle}>
        <ThemedButton iconName="chevron-up" style={styles.scrollButton} onPress={scrollToTop} />
      </Animated.View>
      <ThemedStatusToast
        isSyncing={isSyncing}
        isVisible={isToastVisible}
        message={isSyncing ? t('homeScreen.syncing') : t('homeScreen.offline')}
        iconName="cloud-offline"
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />
      <ThemedBottomSheet
        ref={bottomSheetRef}
        onDeletePress={onDeletePress}
        onEditPress={() => { }}
        editText={t('homeScreen.edit')}
        deleteText={t('homeScreen.delete')}
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
