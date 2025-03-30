import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  InteractionManager, // <-- Import InteractionManager
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { throttle } from 'lodash';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

// Types, constants, services, hooks, and components
import QRRecord from '@/types/qrType';
import ServerRecord from '@/types/serverDataTypes';
import { height } from '@/constants/Constants';
import { RootState } from '@/store/rootReducer';
import { setQrData } from '@/store/reducers/qrSlice';
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData,
  getUnsyncedQrCodes,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  filterQrCodesByType,
  hasLocalData,
} from '@/services/localDB/qrDB';
import { useThemeColor } from '@/hooks/useThemeColor';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useGalleryPicker } from '@/hooks/useGalleryPicker';
import SheetType from '@/types/sheetType';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ThemedFAB } from '@/components/buttons';
import { ThemedButton } from '@/components/buttons';
import ThemedReuseableSheet from '@/components/bottomsheet/ThemedReusableSheet';
import ThemedCardItem from '@/components/cards/ThemedCardItem';
import {
  ThemedFilterSkeleton,
  ThemedCardSkeleton,
} from '@/components/skeletons';
import { ThemedStatusToast } from '@/components/toast/ThemedStatusToast';
import ThemedBottomToast from '@/components/toast/ThemedBottomToast';
import { ThemedTopToast } from '@/components/toast/ThemedTopToast';
import { ThemedModal } from '@/components/modals/ThemedIconModal';
import ThemedFilter from '@/components/ThemedFilter';
import EmptyListItem from '@/components/lists/EmptyListItem';
import LinkingSheetContent from '@/components/bottomsheet/LinkingSheetContent';
import SettingSheetContent from '@/components/bottomsheet/SettingSheetContent';
import WifiSheetContent from '@/components/bottomsheet/WifiSheetContent';
import {
  getResponsiveHeight,
  getResponsiveWidth,
  getResponsiveFontSize,
} from '@/utils/responsive';
import { t } from '@/i18n';

// --- Memoized Components (Moved Up for Clarity) ---

const HeaderComponent = React.memo(
  ({
    titleContainerStyle,
    syncStatus,
    isLoading, // Keep isLoading prop for disabling buttons
    onSync,
    onScan,
    onSettings,
  }: {
    titleContainerStyle: any;
    syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    isLoading: boolean;
    onSync: () => void;
    onScan: () => void;
    onSettings: () => void;
  }) => (
    <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
      <View style={styles.headerContainer}>
        <ThemedText style={styles.titleText} type="title">
          {t('homeScreen.title')}
        </ThemedText>
        <View style={styles.titleButtonContainer}>
          <ThemedButton
            iconName="cloud-sync"
            syncStatus={syncStatus}
            style={styles.titleButton}
            onPress={onSync}
            disabled={syncStatus === 'syncing' || isLoading} // Disable during initial load too
          />
          <ThemedButton
            iconName="camera"
            style={styles.titleButton}
            onPress={onScan}
            disabled={isLoading}
          />
          <ThemedButton
            iconName="cog"
            style={styles.titleButton}
            onPress={onSettings}
            disabled={isLoading}
          />
        </View>
      </View>
    </Animated.View>
  )
);

const LoadingComponent = React.memo(() => (
  <View style={styles.loadingContainer}>
    <View style={{ marginBottom: 20 }}>
      <ThemedFilterSkeleton show={true} />
    </View>
    {Array.from({ length: 3 }).map((_, index) => (
      <ThemedCardSkeleton key={index} index={index} />
    ))}
  </View>
));

const ListHeaderComponent = React.memo(
  ({
    listHeaderStyle,
    filter,
    onFilterChange,
  }: {
    listHeaderStyle: any;
    filter: string;
    onFilterChange: (filter: string) => void;
  }) => (
    <Animated.View
      style={[listHeaderStyle, { marginBottom: getResponsiveHeight(3.6) }]}
    >
      <ThemedFilter selectedFilter={filter} onFilterChange={onFilterChange} />
    </Animated.View>
  )
);

const EmptyItemComponent = React.memo(({ color }: { color: string }) => (
  <View style={styles.emptyItem}>
    <MaterialIcons color={color} name="search" size={50} />
    <ThemedText style={{ textAlign: 'center', lineHeight: 30 }}>
      {t('homeScreen.noItemFound')}
    </ThemedText>
  </View>
));

// --- Main Component ---

function HomeScreen() {
  // Redux and Context
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');

  // Theme and Appearance
  const color = useThemeColor({ light: '#3A2E24', dark: '#FFF5E1' }, 'text');

  // Loading and Syncing
  // isLoading now primarily reflects the *initial local fetch* if needed
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Tracks background sync process
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [syncStatus, setSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');

  // UI State
  const [isActive, setIsActive] = useState(false); // Drag active state
  const [toastMessage, setToastMessage] = useState(''); // For status toast (delete)
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState(''); // For general info toast
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false); // For network status
  const [bottomToastColor, setBottomToastColor] = useState('');
  const [bottomToastIcon, setBottomToastIcon] = useState('');
  const [bottomToastMessage, setBottomToastMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false); // Delete confirmation
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [wifiIsWep, setWifiIsWep] = useState(false);
  const [wifiIsHidden, setWifiIsHidden] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Refs
  const flatListRef = useRef<FlatList<QRRecord> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Shared Values (Reanimated)
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const scrollY = useSharedValue(0);

  // --- Callbacks ---

  // Toast handler (memoized)
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);

  // Sync with server (memoized)
  const syncWithServer = useCallback(
    async (userIdToSync: string) => {
      if (isOffline || isSyncing) {
        console.log(
          `Sync skipped: isOffline=${isOffline}, isSyncing=${isSyncing}`
        );
        return;
      }
      console.log('Starting sync...');
      setIsSyncing(true);
      setSyncStatus('syncing');

      try {
        await syncQrCodes(userIdToSync);
        const serverData: ServerRecord[] = await fetchServerData(userIdToSync);
        if (serverData.length > 0) {
          await insertOrUpdateQrCodes(serverData);
        }
        const finalLocalData = await getQrCodesByUserId(userIdToSync);
        dispatch(setQrData(finalLocalData)); // Update Redux with merged data
        setSyncStatus('synced');
        showToast(t('homeScreen.syncSuccess'));
        console.log('Sync successful');
        const timer = setTimeout(() => setSyncStatus('idle'), 3000);
        // No cleanup needed here for this specific timer
      } catch (error) {
        console.error('Error during sync process:', error);
        setSyncStatus('error');
        showToast(t('homeScreen.syncError'));
      } finally {
        setIsSyncing(false);
        console.log('Sync process finished.');
      }
    },
    [dispatch, isOffline, isSyncing, showToast] // Dependencies for syncWithServer
  );

  // --- Effects ---

  // Effect for Initial Data Load and Background Sync Check (Optimized)
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let loadingTimer: NodeJS.Timeout | null = null;

    const initializeData = async () => {
      setSyncStatus('idle'); // Reset sync status on new load/user change

      // 1. Check if data is already in Redux (likely pre-fetched)
      if (qrData.length === 0) {
        // Data not pre-fetched, show loading and fetch locally
        console.log('Initial data not found in Redux, fetching locally...');
        setIsLoading(true);
        try {
          const currentLocalData = await getQrCodesByUserId(userId);
          if (isMounted) {
            dispatch(setQrData(currentLocalData));
            console.log('Local data fetched and dispatched.');
          }
        } catch (error) {
          console.error('Error fetching initial local data:', error);
          if (isMounted) {
            showToast(t('homeScreen.loadError'));
            setSyncStatus('error'); // Indicate error state
          }
        } finally {
          // Ensure loading stops even if fetch fails or component unmounts quickly
          if (isMounted) {
            setIsLoading(false);
            console.log('Initial local fetch finished.');
          }
        }
      } else {
        // Data likely pre-fetched, no need for local fetch or loading indicator
        console.log('Initial data found in Redux.');
        setIsLoading(false); // Ensure loading is off
      }

      // 2. Defer Sync Check until after interactions
      const interactionHandle = InteractionManager.runAfterInteractions(() => {
        if (!isMounted) return; // Check mount status again inside callback

        console.log('Running deferred sync check...');
        const checkAndSync = async () => {
          if (isOffline) {
            console.log('Sync check skipped: Offline.');
            if (isMounted) setSyncStatus('idle');
            return;
          }

          try {
            const unsyncedCodes = await getUnsyncedQrCodes(userId);
            const localDbExists = await hasLocalData(userId);
            const needsSync = !localDbExists || unsyncedCodes.length > 0;

            if (needsSync && !isSyncing) {
              console.log('Sync needed, initiating...');
              // Call the stable sync function
              await syncWithServer(userId); // syncWithServer handles its own status updates
            } else if (!needsSync) {
              console.log('No sync needed or already syncing.');
              // Already synced or no need to sync
              if (isMounted && syncStatus !== 'syncing') {
                // Avoid overriding 'syncing' status if sync started elsewhere
                setSyncStatus('synced'); // Indicate it's up-to-date
                loadingTimer = setTimeout(() => {
                  if (isMounted) setSyncStatus('idle');
                }, 3000);
              }
            }
          } catch (error) {
            console.error('Error during deferred sync check:', error);
            if (isMounted) {
              setSyncStatus('error');
              showToast(t('homeScreen.syncError')); // Show error from check phase
            }
          }
        };

        checkAndSync();
      });

      // Cleanup function
      return () => {
        console.log('Cleaning up init effect for userId:', userId);
        isMounted = false;
        if (loadingTimer) clearTimeout(loadingTimer);
        interactionHandle.cancel(); // Cancel InteractionManager task if unmounted
      };
    };

    initializeData();

    // Dependencies: Re-run if user changes, network status changes,
    // or the sync function/state changes.
  }, [userId, isOffline, syncWithServer, isSyncing, dispatch, qrData.length]); // Added qrData.length to re-evaluate if it becomes 0

  // Network status toasts
  const prevIsOffline = useRef(isOffline);
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isOffline) {
      setBottomToastIcon('wifi-off');
      setBottomToastMessage(t('homeScreen.offline'));
      setBottomToastColor('#f2726f');
      setIsBottomToastVisible(true);
    } else {
      if (prevIsOffline.current) {
        // Was offline, now online
        setBottomToastIcon('wifi');
        setBottomToastMessage(t('homeScreen.online'));
        setBottomToastColor('#4caf50');
        setIsBottomToastVisible(true);
        timer = setTimeout(() => setIsBottomToastVisible(false), 2000);
      } else {
        // Was already online, ensure toast is hidden
        setIsBottomToastVisible(false);
      }
    }
    prevIsOffline.current = isOffline; // Update ref for next render

    return () => {
      if (timer) clearTimeout(timer); // Cleanup timer
    };
  }, [isOffline, t]); // Assuming t is stable

  // Animate empty card based on isEmpty state
  useEffect(() => {
    isEmptyShared.value = withTiming(isEmpty ? 1 : 0); // Use timing for smoother transition if needed
    if (isEmpty) {
      // Only animate entry when it becomes empty
      emptyCardOffset.value = 350; // Reset position off-screen
      emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
    } else {
      // Optionally animate out, or just let it disappear
      emptyCardOffset.value = 0; // Ensure it's reset if list becomes non-empty
    }
  }, [isEmpty, isEmptyShared, emptyCardOffset]);

  // --- Animated Styles ---

  const titleContainerStyle = useAnimatedStyle(() => {
    const SCROLL_THRESHOLD = 120;
    const ANIMATION_RANGE = 90;
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD, SCROLL_THRESHOLD + ANIMATION_RANGE],
      [1, 0],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, -35],
      Extrapolation.CLAMP
    );
    const shouldReduceZIndex = scrollY.value > 120 || isActive || isSheetOpen;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, [isActive, isSheetOpen]); // scrollY is implicitly a dependency

  const listHeaderStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
      { duration: 200, easing: Easing.out(Easing.ease) }
    );
    const scale = withTiming(
      interpolate(scrollY.value, [0, 50], [1, 0.95], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );
    const translateY = withTiming(
      interpolate(scrollY.value, [0, 50], [0, -5], Extrapolation.CLAMP),
      { duration: 150, easing: Easing.out(Easing.ease) }
    );
    return { opacity, transform: [{ scale }, { translateY }] };
  }, []); // scrollY is implicitly a dependency

  const fabStyle = useAnimatedStyle(() => {
    // Adjust based on which toasts are potentially visible
    let bottomOffset = getResponsiveHeight(2); // Default FAB bottom
    if (isBottomToastVisible) {
      bottomOffset = 50; // Adjust if bottom network toast is visible
    } else if (isToastVisible) {
      bottomOffset = 80; // Adjust if status toast is visible (higher priority?)
    }
    const marginBottom = withTiming(bottomOffset, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    return { marginBottom };
  }, [isBottomToastVisible, isToastVisible]); // React to toast visibility

  const emptyCardStyle = useAnimatedStyle(() => ({
    // Style for the EmptyListItem container
    opacity: isEmptyShared.value,
    transform: [{ translateY: emptyCardOffset.value }],
  }));

  // --- Navigation Handlers (Memoized) ---
  const onNavigateToEmptyScreen = useCallback(() => router.push('/empty'), []);
  const onNavigateToDetailScreen = useCallback(
    throttle(
      (item: QRRecord) => {
        router.push({
          pathname: `/detail`,
          params: {
            id: item.id,
            item: encodeURIComponent(JSON.stringify(item)),
            user_id: userId,
          },
        });
      },
      300,
      { leading: true, trailing: false }
    ), // Throttle navigation
    [userId]
  );
  const onNavigateToScanScreen = useCallback(
    () => router.push('/(scan)/scan-main'),
    []
  );
  const onNavigateToSettingsScreen = useCallback(
    () => router.push('/settings'),
    []
  );
  const onNavigateToAddScreen = useCallback(
    throttle(
      (
        codeFormat?: number,
        codeValue?: string,
        bin?: string,
        codeType?: string,
        codeProvider?: string
      ) => {
        router.push({
          pathname: `/(auth)/(add)/add-new`,
          params: {
            codeFormat,
            codeValue,
            codeBin: bin,
            codeType,
            codeProvider,
          },
        });
      },
      300,
      { leading: true, trailing: false }
    ),
    []
  );
  const onNavigateToEditScreen = useCallback(
    throttle(
      () => {
        if (!selectedItemId) return;
        bottomSheetRef.current?.close();
        // Delay navigation slightly to allow sheet to close smoothly
        setTimeout(
          () =>
            router.push({
              pathname: `/(edit)/edit`,
              params: { id: selectedItemId },
            }),
          200
        );
      },
      300,
      { leading: true, trailing: false }
    ),
    [selectedItemId]
  );

  // --- UI Handlers (Memoized) ---

  const onOpenSheet = useCallback(
    (
      type: SheetType,
      id?: string,
      url?: string,
      ssid?: string,
      password?: string,
      isWep?: boolean,
      isHidden?: boolean
    ) => {
      setSheetType(type);
      setIsSheetOpen(true); // Used for titleContainer zIndex animation
      setSelectedItemId(id || null);

      // Reset specific sheet states before setting new ones
      setLinkingUrl(null);
      setWifiSsid(null);
      setWifiPassword(null);

      switch (type) {
        case 'wifi':
          if (ssid && password) {
            setWifiSsid(ssid);
            setWifiPassword(password);
            setWifiIsWep(isWep ?? false);
            setWifiIsHidden(isHidden ?? false);
          }
          break;
        case 'linking':
          if (url) setLinkingUrl(url);
          break;
        default:
          break;
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    [] // No dependencies needed as it only sets state
  );

  // Hook for gallery picker logic
  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  // Scroll handler
  const scrollHandler = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
        // Logic to auto-close FAB removed for simplicity, manage manually if needed
      },
    },
    [] // No external dependencies
  );

  // Callback for DraggableFlatList's onScrollOffsetChange
  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollY.value = offset;
    },
    [scrollY] // Depends only on the shared value ref
  );

  // Drag handlers
  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true); // Used for item scaling and title zIndex
  }, []);

  const onDragEnd = useCallback(
    async ({ data }: { data: QRRecord[] }) => {
      setIsActive(false); // Deactivate drag state immediately
      triggerHapticFeedback(); // Haptic on drop

      // Check if order actually changed
      const hasOrderChanged = data.some(
        (item, index) => item.qr_index !== index
      );
      if (!hasOrderChanged) {
        return; // No change, no need to update
      }

      console.log('Order changed, updating indexes...');
      const updatedData = data.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(), // Mark as updated for sync
      }));

      try {
        dispatch(setQrData(updatedData)); // Update UI immediately
        await updateQrIndexes(updatedData); // Persist changes to local DB
        console.log('Indexes updated successfully.');
        // Optionally trigger a background sync if needed after reordering
        // syncWithServer(userId); // Consider if this is desired behavior
      } catch (error) {
        console.error('Error updating QR indexes:', error);
        showToast(t('homeScreen.reorderError')); // Inform user of error
        // Optionally revert Redux state to previous order if DB update fails
      }
    },
    [dispatch, userId, showToast] // Added userId and showToast
  );

  // Filter handler
  const handleFilterChange = useCallback(
    async (newFilter: string) => {
      setFilter(newFilter);
      // Note: Filtering logic might be complex. Consider if filtering should
      // happen purely on the client (using useMemo) or involve DB refetch.
      // This example assumes client-side filtering via `filteredData` useMemo.
      // If DB filtering is preferred:
      // try {
      //   setIsLoading(true); // Indicate loading during filter fetch
      //   const filteredDbData = await filterQrCodesByType(userId, newFilter);
      //   dispatch(setQrData(filteredDbData));
      // } catch (error) {
      //   console.error("Error filtering data:", error);
      //   showToast(t('homeScreen.filterError'));
      // } finally {
      //   setIsLoading(false);
      // }
    },
    [userId, dispatch, showToast] // Dependencies if using DB filtering
    // [setFilter] // Dependency if only using client-side filtering
  );

  // Sync button handler
  const handleSync = useCallback(() => {
    if (!isOffline && !isSyncing) {
      syncWithServer(userId);
    }
  }, [syncWithServer, userId, isOffline, isSyncing]);

  // Delete handlers
  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    // Delay modal display slightly for smoother transition
    setTimeout(() => setIsModalVisible(true), 150);
  }, []);

  const onDeletePress = useCallback(async () => {
    if (!selectedItemId) return;

    setIsModalVisible(false); // Close modal immediately
    setIsToastVisible(true); // Show status toast
    setToastMessage(t('homeScreen.deleting'));
    setIsSyncing(true); // Use isSyncing to indicate ongoing operation

    try {
      await deleteQrCode(selectedItemId); // Delete from local DB

      // Update Redux state optimistically
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      // Re-index remaining items
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(), // Mark potentially affected items for sync
      }));

      dispatch(setQrData(reindexedData));

      // Persist re-indexing (important!)
      if (reindexedData.length > 0) {
        await updateQrIndexes(reindexedData);
      }

      setIsToastVisible(false); // Hide status toast on success
      showToast(t('homeScreen.deleteSuccess')); // Show success confirmation

      // Optionally trigger sync after delete
      // syncWithServer(userId);
    } catch (error) {
      console.error('Error deleting QR code:', error);
      setToastMessage(t('homeScreen.deleteError')); // Update toast message on error
      setIsToastVisible(true); // Ensure toast remains visible on error
      // Consider reverting Redux state if delete fails critically
    } finally {
      setSelectedItemId(null);
      // Delay resetting isSyncing slightly to allow toast to show
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, [selectedItemId, qrData, dispatch, userId, showToast]); // Added userId, showToast

  const handleCopySuccess = useCallback(
    () => showToast(t('homeScreen.copied')),
    [showToast]
  );

  // --- Memoized Values ---

  // Filtered data for the list (client-side filtering)
  const filteredData = useMemo(() => {
    if (filter === 'all') return qrData;
    return qrData.filter((item) => item.type === filter);
  }, [qrData, filter]);

  // Dynamic padding for the bottom of the list
  const listContainerPadding = useMemo(() => {
    const len = filteredData.length; // Base padding on filtered data length
    if (len === 0) return 0;
    if (len === 1) return height * 0.7;
    if (len === 2) return height * 0.45;
    if (len === 3) return height * 0.2;
    return 100; // Default padding
  }, [filteredData.length, height]); // Use filteredData.length

  // --- Render Functions ---

  // Optimized renderItem for FlatList (memoized)
  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive: isItemActive,
    }: {
      item: QRRecord;
      drag: () => void;
      isActive: boolean;
    }) => (
      <ScaleDecorator activeScale={0.95}>
        {' '}
        {/* Slightly less aggressive scale */}
        <ThemedCardItem
          // Pass necessary props
          // item={item} // <-- FIX 1: REMOVED THIS LINE
          isActive={isItemActive}
          onItemPress={() => onNavigateToDetailScreen(item)}
          onMoreButtonPress={() =>
            onOpenSheet(
              'setting',
              item.id
              // Pass other necessary details if needed by sheet types directly
            )
          }
          onDrag={drag}
          // Explicitly pass props used by ThemedCardItem
          code={item.code}
          type={item.type}
          metadata={item.metadata}
          metadata_type={item.metadata_type}
          accountName={item.account_name}
          accountNumber={item.account_number}
        />
      </ScaleDecorator>
    ),
    [onNavigateToDetailScreen, onOpenSheet] // Dependencies for renderItem
  );

  // Sheet content renderer
  const renderSheetContent = () => {
    switch (sheetType) {
      case 'wifi':
        return (
          <WifiSheetContent
            ssid={wifiSsid || ''}
            password={wifiPassword || ''}
            isWep={wifiIsWep}
            isHidden={wifiIsHidden}
          />
        );
      case 'linking':
        return (
          <LinkingSheetContent
            url={linkingUrl}
            onCopySuccess={handleCopySuccess}
          />
        );
      case 'setting':
        return (
          <SettingSheetContent
            onEdit={onNavigateToEditScreen}
            onDelete={onDeleteSheetPress}
          />
        );
      default:
        return null; // Or a placeholder View
    }
  };

  // --- JSX ---

  return (
    <ThemedView style={styles.container}>
      <HeaderComponent
        titleContainerStyle={titleContainerStyle}
        syncStatus={syncStatus}
        isLoading={isLoading || isSyncing} // Disable buttons during initial load OR sync
        onSync={handleSync}
        onScan={onNavigateToScanScreen}
        onSettings={onNavigateToSettingsScreen}
      />

      {/* Conditional Rendering: Loading -> Empty -> List */}
      {isLoading ? (
        <LoadingComponent />
      ) : isEmpty ? (
        // Use Animated.View for the empty state container to apply animations
        <Animated.View style={[styles.emptyContainer, emptyCardStyle]}>
          <EmptyListItem
            // Pass necessary props to EmptyListItem
            onNavigateToEmptyScreen={onNavigateToEmptyScreen} // If needed inside EmptyListItem
            onNavigateToScanScreen={onNavigateToScanScreen}
            scrollHandler={scrollHandler} // <-- FIX 2: ADDED THIS PROP
            emptyCardStyle={emptyCardStyle} // <-- FIX 2: ADDED THIS PROP
            dropdownOptions={[
              {
                label: t('homeScreen.fab.add'),
                onPress: onNavigateToAddScreen,
              },
              {
                label: t('homeScreen.fab.scan'),
                onPress: onNavigateToScanScreen,
              },
              {
                label: t('homeScreen.fab.gallery'),
                onPress: onOpenGallery,
              },
            ]}
          />
        </Animated.View>
      ) : (
        // Use Animated.View for the list container if needed for entry animation
        <Animated.View style={{ flex: 1 }}>
          <DraggableFlatList
            ref={flatListRef}
            data={filteredData} // Use memoized filtered data
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            ListHeaderComponent={
              <ListHeaderComponent
                listHeaderStyle={listHeaderStyle}
                filter={filter}
                onFilterChange={handleFilterChange}
              />
            }
            ListEmptyComponent={<EmptyItemComponent color={color} />} // Shown if filteredData is empty but qrData is not
            containerStyle={styles.listFlex} // Use flex: 1 for container
            contentContainerStyle={[
              styles.listContainer,
              { paddingBottom: listContainerPadding }, // Apply dynamic padding
            ]}
            // Performance props
            initialNumToRender={10} // Adjust based on testing
            maxToRenderPerBatch={5}
            windowSize={11} // Standard recommendation: 21 (10 above, 10 below, 1 visible) - adjust based on item height
            removeClippedSubviews={true} // Can improve performance but use with caution
            // Scroll and Drag props
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onScrollOffsetChange={onScrollOffsetChange} // Use optimized callback
            onDragBegin={onDragBegin}
            onDragEnd={onDragEnd}
            dragItemOverflow={false} // Keep items clipped
            decelerationRate={'fast'}
            // scrollEnabled={!isActive} // Allow scroll only when not dragging
            bounces={true}
          />
        </Animated.View>
      )}

      {/* FAB: Show only if not loading and list is not empty */}
      {!isLoading && !isEmpty && (
        <ThemedFAB
          actions={[
            {
              text: t('homeScreen.fab.add'),
              iconName: 'plus-circle',
              onPress: onNavigateToAddScreen,
            },
            {
              text: t('homeScreen.fab.scan'),
              iconName: 'camera',
              onPress: onNavigateToScanScreen,
            },
            {
              text: t('homeScreen.fab.gallery'),
              iconName: 'image',
              onPress: onOpenGallery,
            },
          ]}
          style={styles.fab}
          animatedStyle={fabStyle} // Apply animated style for positioning
        />
      )}

      {/* Toasts and Modals */}
      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
        isSyncing={isSyncing} // Pass syncing state to toast if it needs it
      />
      <ThemedTopToast
        message={topToastMessage}
        isVisible={isTopToastVisible}
        onVisibilityToggle={setIsTopToastVisible} // Let the component manage its visibility timer
        duration={2000} // Standard duration
      />
      <ThemedBottomToast
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName={bottomToastIcon as keyof typeof MaterialCommunityIcons.glyphMap}
        style={styles.bottomToastContainer}
        backgroundColor={bottomToastColor}
      />
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={
          sheetType === 'setting'
            ? t('homeScreen.manage')
            : sheetType === 'wifi'
              ? t('homeScreen.wifi')
              : sheetType === 'linking'
                ? t('homeScreen.linking')
                : '' // Default empty title
        }
        onClose={() => setTimeout(() => setIsSheetOpen(false), 50)} // Reset sheet open state
        snapPoints={useMemo(
          () =>
            sheetType === 'setting'
              ? ['25%']
              : sheetType === 'wifi'
                ? ['38%']
                : sheetType === 'linking'
                  ? ['35%']
                  : ['25%'], // Default snap points
          [sheetType]
        )} // Memoize snap points based on type
        styles={{
          // Pass styles if needed
          customContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          },
        }}
        customContent={<View>{renderSheetContent()}</View>} // Render dynamic content
      />
      <ThemedModal
        isVisible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)}
        primaryActionText={t('homeScreen.move')} // Assuming 'move' means delete here
        onPrimaryAction={onDeletePress}
        secondaryActionText={t('homeScreen.cancel')}
        onSecondaryAction={() => setIsModalVisible(false)}
        title={t('homeScreen.confirmDeleteTitle')}
        message={t('homeScreen.confirmDeleteMessage')}
        iconName="delete-outline"
        dismissable={true}
      />
    </ThemedView>
  );
}

// Memoize the entire screen component
export default React.memo(HomeScreen);

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: // Set background via ThemedView props if needed
  },
  titleContainer: {
    position: 'absolute',
    top: getResponsiveHeight(10), // Adjust as needed for status bar/notch
    left: 0,
    right: 0,
    // backgroundColor: 'transparent', // Ensure no background blocks content below
    zIndex: 1, // Default zIndex
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingBottom: getResponsiveHeight(1), // Add some padding below title/buttons
  },
  titleText: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold', // Make title bolder
  },
  titleButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3), // Responsive gap
  },
  titleButton: {
    // Add specific styles for title buttons if needed
  },
  listFlex: {
    flex: 1, // Ensure FlatList container takes available space
  },
  listContainer: {
    paddingTop: getResponsiveHeight(18.1), // Space for absolute positioned header
    paddingHorizontal: getResponsiveWidth(3.6), // Horizontal padding for list items
    flexGrow: 1, // Ensure content can grow to enable scrolling
  },
  loadingContainer: {
    paddingTop: getResponsiveHeight(18), // Match list padding top
    paddingHorizontal: getResponsiveWidth(3.6),
    flex: 1,
    gap: getResponsiveHeight(2), // Space between skeleton items
  },
  emptyContainer: {
    // Style for the container holding EmptyListItem, used for animation
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(5),
  },
  emptyItem: {
    // Styles for the content *inside* ListEmptyComponent (if list has data but filter returns none)
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: getResponsiveHeight(10), // Add padding when shown within the list
    gap: 10,
    opacity: 0.7,
  },
  toastContainer: {
    position: 'absolute',
    bottom: getResponsiveHeight(10), // Position above FAB/BottomNav
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10, // High zIndex
  },
  bottomToastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9, // Below status toast but above content
  },
  fab: {
    position: 'absolute',
    // bottom: handled by animatedStyle
    right: getResponsiveWidth(3.6),
    zIndex: 5, // Above list, below toasts/sheets
  },
});
