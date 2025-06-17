import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View, FlatList, InteractionManager } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import DraggableFlatList, {
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { throttle } from "lodash";
import BottomSheet from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

// Types, constants, services, hooks, and components
import QRRecord from "@/types/qrType";
import ServerRecord from "@/types/serverDataTypes";
import { height } from "@/constants/Constants";
import { RootState } from "@/store/rootReducer";
import { setQrData } from "@/store/reducers/qrSlice";
import { resetJustLoggedInFlag } from "@/store/reducers/authSlice";
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  hasLocalData,
  getLatestSyncedTimestamp,
} from "@/services/localDB/qrDB";
import { useThemeColor } from "@/hooks/useThemeColor";
import { triggerHapticFeedback } from "@/utils/haptic";
import { useGalleryPicker } from "@/hooks/useGalleryPicker";
import SheetType from "@/types/sheetType";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedFAB } from "@/components/buttons";
import { ThemedButton } from "@/components/buttons";
import { ThemedDualButton } from "@/components/buttons/ThemedDualButton";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";
import ThemedCardItem from "@/components/cards/ThemedCardItem";
import {
  ThemedFilterSkeleton,
  ThemedCardSkeleton,
} from "@/components/skeletons";
import { ThemedStatusToast } from "@/components/toast/ThemedStatusToast";
import ThemedBottomToast from "@/components/toast/ThemedBottomToast";
import { ThemedTopToast } from "@/components/toast/ThemedTopToast";
import { ThemedModal } from "@/components/modals/ThemedIconModal";
import ThemedFilter from "@/components/ThemedFilter";
import EmptyListItem from "@/components/lists/EmptyListItem";
import LinkingSheetContent from "@/components/bottomsheet/LinkingSheetContent";
import SettingSheetContent from "@/components/bottomsheet/SettingSheetContent";
import WifiSheetContent from "@/components/bottomsheet/WifiSheetContent";
import {
  getResponsiveHeight,
  getResponsiveWidth,
  getResponsiveFontSize,
} from "@/utils/responsive";
import { t } from "@/i18n";

function HomeScreen() {
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? "");
  const justLoggedIn = useSelector(
    (state: RootState) => state.auth.justLoggedIn
  );

  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // --- FIX: Local state to control the UI instantly for DraggableFlatList ---
  const [localQrData, setLocalQrData] = useState<QRRecord[]>(qrData);

  // --- Core States ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");

  // --- Animation States ---
  const [emptyAnimationPerformed, setEmptyAnimationPerformed] = useState(false);

  // --- Efficiency States ---
  const [initialLoadAttemptedForUser, setInitialLoadAttemptedForUser] =
    useState<string | null>(null);

  // --- UI States ---
  const isEmpty = useMemo(() => localQrData.length === 0, [localQrData.length]);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState("");
  const [bottomToastIcon, setBottomToastIcon] = useState("");
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [linkingUrl, setLinkingUrl] = useState<string | null>(null);
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState<string | null>(null);
  const [wifiIsWep, setWifiIsWep] = useState(false);
  const [wifiIsHidden, setWifiIsHidden] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // --- Refs ---
  const flatListRef = useRef<FlatList<QRRecord> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const timeoutRefs = useRef<{
    [key: string]: ReturnType<typeof setTimeout> | null;
  }>({
    sync: null,
    idle: null,
    edit: null,
    delete: null,
    toast: null,
    network: null,
  });
  const syncStatusRef = useRef(syncStatus);
  const prevIsOffline = useRef(isOffline);
  const isSyncingRef = useRef(isSyncing);

  // --- Shared Values (Reanimated) ---
  const scrollY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const isSheetOpen = useSharedValue(false);
  const isEmptyShared = useSharedValue(localQrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const listOpacity = useSharedValue(0);

  // Update refs when values change
  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // --- FIX: Sync local state when Redux data changes from other sources (e.g., sync, delete) ---
  useEffect(() => {
    setLocalQrData(qrData);
  }, [qrData]);

  // --- FIX: Persist local data changes (from drag-and-drop) to Redux and DB ---
  useEffect(() => {
    // Don't run on initial mount or if data hasn't changed from Redux
    if (
      !userId ||
      !qrData.length ||
      JSON.stringify(localQrData) === JSON.stringify(qrData)
    ) {
      return;
    }

    const reindexedData = localQrData.map((item, index) => ({
      ...item,
      qr_index: index,
    }));

    // Only dispatch if the order of IDs has actually changed.
    const localOrder = JSON.stringify(reindexedData.map((i) => i.id));
    const reduxOrder = JSON.stringify(qrData.map((i) => i.id));

    if (localOrder === reduxOrder) {
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      const dataWithTimestamp = reindexedData.map((item) => ({
        ...item,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(dataWithTimestamp));
      updateQrIndexes(dataWithTimestamp, userId).catch((err) =>
        console.error("Error updating QR indexes after drag:", err)
      );
    });
  }, [localQrData, userId, dispatch, qrData]);

  // --- Stable callbacks (dependencies that don't change frequently) ---
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);

  const handleCopySuccess = useCallback(
    () => showToast(t("homeScreen.copied")),
    [showToast]
  );

  // --- Core Logic Functions ---
  const syncWithServer = useCallback(
    async (userIdToSync: string) => {
      if (isOffline || isSyncingRef.current) {
        if (isSyncingRef.current) {
          console.log("Sync already in progress.");
        }
        return;
      }

      setIsSyncing(true);
      setSyncStatus("syncing");
      setTopToastMessage(t("homeScreen.syncStarted"));
      setIsTopToastVisible(true);

      try {
        const lastSyncTimestamp = await getLatestSyncedTimestamp(userIdToSync);
        await syncQrCodes(userIdToSync);
        const rawDataFromServer = await fetchServerData(
          userIdToSync,
          lastSyncTimestamp
        );

        if (rawDataFromServer && rawDataFromServer.length > 0) {
          await insertOrUpdateQrCodes(rawDataFromServer);
        }
        const finalLocalData = await getQrCodesByUserId(userIdToSync);
        dispatch(setQrData(finalLocalData));

        setSyncStatus("synced");
        setTopToastMessage(t("homeScreen.syncSuccess"));
        setIsTopToastVisible(true);

        if (timeoutRefs.current.sync) clearTimeout(timeoutRefs.current.sync);
        timeoutRefs.current.sync = setTimeout(() => {
          if (syncStatusRef.current === "synced") setSyncStatus("idle");
        }, 3000);
      } catch (error) {
        console.error("Error during sync process:", error);
        setSyncStatus("error");
        setTopToastMessage(t("homeScreen.syncError"));
        setIsTopToastVisible(true);
      } finally {
        setIsSyncing(false);
      }
    },
    [dispatch, isOffline]
  );

  // --- EFFECT 1: Initial Data Load & Sync ---
  useEffect(() => {
    if (!isFocused) {
      if (userId && initialLoadAttemptedForUser !== userId && isLoading) {
        setInitialLoadAttemptedForUser(null);
      }
      return;
    }

    if (!userId) {
      setIsLoading(false);
      setInitialAnimationsDone(true);
      dispatch(setQrData([]));
      setSyncStatus("idle");
      setInitialLoadAttemptedForUser(null);
      return;
    }

    if (initialLoadAttemptedForUser === userId && !justLoggedIn) {
      if (isLoading) setIsLoading(false);
      if (!initialAnimationsDone) setInitialAnimationsDone(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const loadAndSync = async () => {
      try {
        if (justLoggedIn) {
          await syncWithServer(userId);
        } else {
          const localDbExists = await hasLocalData(userId);
          if (!isMounted) return;

          if (localDbExists) {
            const currentLocalData = await getQrCodesByUserId(userId);
            if (isMounted) dispatch(setQrData(currentLocalData));
          } else if (!isOffline) {
            await syncWithServer(userId);
          } else {
            dispatch(setQrData([]));
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error during initial data load/sync:", error);
        setSyncStatus("error");
        setTopToastMessage(t("homeScreen.loadError"));
        setIsTopToastVisible(true);
        dispatch(setQrData([]));
      } finally {
        if (isMounted) {
          setInitialLoadAttemptedForUser(userId);
          setIsLoading(false);
          setInitialAnimationsDone(true);
          if (justLoggedIn) {
            dispatch(resetJustLoggedInFlag());
          }
        }
      }
    };

    InteractionManager.runAfterInteractions(loadAndSync);

    return () => {
      isMounted = false;
    };
  }, [
    isFocused,
    userId,
    justLoggedIn,
    initialLoadAttemptedForUser,
    dispatch,
    isOffline,
    syncWithServer,
    isLoading,
    initialAnimationsDone,
  ]);

  // --- EFFECT 2: Network Status Toasts (Optimized) ---
  useEffect(() => {
    const wasOffline = prevIsOffline.current;
    prevIsOffline.current = isOffline;

    if (isOffline) {
      setBottomToastIcon("wifi-off");
      setBottomToastMessage(t("homeScreen.offline"));
      setBottomToastColor("#f2726f");
      setIsBottomToastVisible(true);
    } else if (wasOffline && isFocused) {
      setBottomToastIcon("wifi");
      setBottomToastMessage(t("homeScreen.online"));
      setBottomToastColor("#4caf50");
      setIsBottomToastVisible(true);

      if (timeoutRefs.current.network) {
        clearTimeout(timeoutRefs.current.network);
      }
      timeoutRefs.current.network = setTimeout(() => {
        setIsBottomToastVisible(false);
      }, 2000);
    } else if (!isFocused && isBottomToastVisible) {
      setIsBottomToastVisible(false);
    }

    return () => {
      if (timeoutRefs.current.network) {
        clearTimeout(timeoutRefs.current.network);
      }
    };
  }, [isOffline, isFocused]);

  // --- EFFECT 3: Animations (Optimized) ---
  const animateEmptyCard = useCallback(() => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  }, [emptyCardOffset]);

  useEffect(() => {
    if (!initialAnimationsDone) return;

    isEmptyShared.value = isEmpty ? 1 : 0;

    if (isEmpty) {
      listOpacity.value = 0;
      if (!emptyAnimationPerformed) {
        emptyCardOffset.value = 350;
        animateEmptyCard();
        setEmptyAnimationPerformed(true);
      } else {
        emptyCardOffset.value = 0;
      }
    } else {
      emptyCardOffset.value = 350;
      listOpacity.value = withTiming(1, { duration: 300 });
      if (emptyAnimationPerformed) {
        setEmptyAnimationPerformed(false);
      }
    }
  }, [
    isEmpty,
    initialAnimationsDone,
    emptyAnimationPerformed,
    animateEmptyCard,
  ]);

  useEffect(() => {
    if (!isFocused) {
      listOpacity.value = 0;
    } else if (isFocused && initialAnimationsDone && !isEmpty) {
      listOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isFocused, initialAnimationsDone, isEmpty]);

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
    const shouldReduceZIndex =
      scrollY.value > SCROLL_THRESHOLD || isActive.value || isSheetOpen.value;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  });

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
  });

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible ? 30 : isToastVisible ? 80 : 10,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    return { marginBottom };
  }, [isBottomToastVisible, isToastVisible]);

  const emptyCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: emptyCardOffset.value }],
    flex: 1,
  }));

  const listContainerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    flex: 1,
  }));

  // --- Navigation and Action Handlers (Optimized) ---
  const onNavigateToEmptyScreen = useCallback(() => router.push("/empty"), []);

  const onNavigateToDetailScreen = useCallback(
    throttle((item: QRRecord) => {
      router.push({
        pathname: `/detail`,
        params: {
          id: item.id,
          item: encodeURIComponent(JSON.stringify(item)),
          user_id: userId,
        },
      });
    }, 300),
    [userId]
  );

  const onNavigateToScanScreen = useCallback(
    () => router.push("/(auth)/(scan)/scan-main"),
    []
  );

  const onNavigateToSettingsScreen = useCallback(
    () => router.push("/settings"),
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
      300
    ),
    []
  );

  const onNavigateToEditScreen = useCallback(
    throttle(() => {
      if (!selectedItemId) return;
      bottomSheetRef.current?.close();
      if (timeoutRefs.current.edit) clearTimeout(timeoutRefs.current.edit);
      timeoutRefs.current.edit = setTimeout(
        () =>
          router.push({
            pathname: `/(auth)/(edit)/edit`,
            params: { id: selectedItemId },
          }),
        200
      );
    }, 300),
    [selectedItemId]
  );

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
      setSelectedItemId(id || null);
      if (type === "wifi" && ssid && password) {
        setWifiSsid(ssid);
        setWifiPassword(password);
        setWifiIsWep(isWep ?? false);
        setWifiIsHidden(isHidden ?? false);
      } else if (type === "linking" && url) {
        setLinkingUrl(url);
      }
      bottomSheetRef.current?.snapToIndex(0);
    },
    []
  );

  const handleSheetChange = useCallback((index: number) => {
    isSheetOpen.value = index > -1;
  }, []);

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onScrollOffsetChange = useCallback((offset: number) => {
    scrollY.value = offset;
  }, []);

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    isActive.value = true;
  }, []);

  // --- FIX: Use localQrData for UI rendering ---
  const filteredData = useMemo(() => {
    if (filter === "all") return localQrData;
    return localQrData.filter((item) => item.type === filter);
  }, [localQrData, filter]);

  const handleSync = useCallback(() => {
    if (userId && !isOffline && !isSyncing) {
      syncWithServer(userId);
    } else if (isOffline) {
      setTopToastMessage(t("homeScreen.offlineNoSync"));
      setIsTopToastVisible(true);
    } else if (isSyncing) {
      setTopToastMessage(t("homeScreen.syncInProgress"));
      setIsTopToastVisible(true);
    }
  }, [userId, isOffline, isSyncing, syncWithServer]);

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter);
  }, []);

  const renderItem = useCallback(
    ({
      item,
      drag,
      isActive: itemIsActive,
    }: {
      item: QRRecord;
      drag: () => void;
      isActive: boolean;
    }) => (
      <ScaleDecorator activeScale={0.9}>
        <ThemedCardItem
          isActive={itemIsActive}
          onItemPress={() => onNavigateToDetailScreen(item)}
          code={item.code}
          type={item.type}
          metadata={item.metadata}
          metadata_type={item.metadata_type}
          onMoreButtonPress={() => onOpenSheet("setting", item.id)}
          accountName={item.account_name}
          accountNumber={item.account_number}
          onDrag={drag}
          enableGlassmorphism
        />
      </ScaleDecorator>
    ),
    [onNavigateToDetailScreen, onOpenSheet]
  );

  // --- FIX: onDragEnd now only updates local state for a smooth UI. ---
  // A separate useEffect handles persisting the change to Redux/DB.
  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      isActive.value = false;

      let finalData;
      if (filter === "all") {
        finalData = reorderedData;
      } else {
        const newOrderedFullList: QRRecord[] = [];
        let reorderedDataIndex = 0;
        localQrData.forEach((originalItem) => {
          if (originalItem.type === filter) {
            if (reorderedData[reorderedDataIndex]) {
              newOrderedFullList.push(reorderedData[reorderedDataIndex]);
              reorderedDataIndex++;
            }
          } else {
            newOrderedFullList.push(originalItem);
          }
        });
        finalData = newOrderedFullList;
      }
      setLocalQrData(finalData);
    },
    [filter, localQrData]
  );

  const onDeleteSheetPress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  const onDeletePress = useCallback(async () => {
    if (!selectedItemId || !userId) return;
    setIsModalVisible(false);
    let operationCausedSyncing = false;

    try {
      if (!isSyncing) {
        setIsSyncing(true);
        operationCausedSyncing = true;
      }
      setIsToastVisible(true);
      setToastMessage(t("homeScreen.deleting"));

      await deleteQrCode(selectedItemId, userId);
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      await updateQrIndexes(reindexedData, userId);

      setIsToastVisible(false);
      setTopToastMessage(t("homeScreen.deleteSuccess"));
      setIsTopToastVisible(true);
    } catch (error) {
      console.error("Error deleting QR code:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true);
    } finally {
      setSelectedItemId(null);
      if (operationCausedSyncing) {
        if (timeoutRefs.current.delete) {
          clearTimeout(timeoutRefs.current.delete);
        }
        timeoutRefs.current.delete = setTimeout(() => setIsSyncing(false), 400);
      }
    }
  }, [selectedItemId, userId, isSyncing, dispatch, qrData]);

  // --- FIX: Use localQrData for UI calculations ---
  const listContainerPadding = useMemo(() => {
    switch (localQrData.length) {
      case 0:
        return 0;
      case 1:
        return height * 0.72;
      case 2:
        return height * 0.45;
      case 3:
        return height * 0.2;
      default:
        return 100;
    }
  }, [localQrData.length]);

  const renderSheetContent = useCallback(() => {
    switch (sheetType) {
      case "wifi":
        return (
          <WifiSheetContent
            ssid={wifiSsid || ""}
            password={wifiPassword || ""}
            isWep={wifiIsWep}
            isHidden={wifiIsHidden}
          />
        );
      case "linking":
        return (
          <LinkingSheetContent
            url={linkingUrl}
            onCopySuccess={handleCopySuccess}
          />
        );
      case "setting":
        return (
          <SettingSheetContent
            onEdit={onNavigateToEditScreen}
            onDelete={onDeleteSheetPress}
          />
        );
      default:
        return null;
    }
  }, [
    sheetType,
    wifiSsid,
    wifiPassword,
    wifiIsWep,
    wifiIsHidden,
    linkingUrl,
    handleCopySuccess,
    onNavigateToEditScreen,
    onDeleteSheetPress,
  ]);

  // --- Memoized Components ---
  const HeaderComponent = React.memo(
    ({
      syncStatus: currentSyncStatus,
      isLoading: currentIsLoading,
      isSyncing: currentIsSyncingOp,
      onSync,
      onScan,
      onSettings,
    }: {
      syncStatus: "idle" | "syncing" | "synced" | "error";
      isLoading: boolean;
      isSyncing: boolean;
      onSync: () => void;
      onScan: () => void;
      onSettings: () => void;
    }) => (
      <View style={styles.headerContainer}>
        <ThemedText style={styles.titleText} type="title">
          {t("homeScreen.title")}
        </ThemedText>
        <View style={styles.titleButtonContainer}>
          <ThemedDualButton
            style={styles.titleButton}
            leftButton={{
              iconName: "cloud-sync",
              onPress: onSync,
              disabled: currentIsSyncingOp || currentIsLoading || isOffline,
            }}
            rightButton={{
              iconName: "camera",
              onPress: onScan,
            }}
          />
          <ThemedButton
            iconName="cog"
            style={styles.titleButton}
            onPress={onSettings}
            disabled={currentIsLoading}
          />
        </View>
      </View>
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
      listHeaderStyle: localListHeaderStyle,
      filter: currentFilter,
      onFilterChange,
    }: {
      listHeaderStyle: any;
      filter: string;
      onFilterChange: (filter: string) => void;
    }) => (
      <Animated.View
        style={[
          localListHeaderStyle,
          { marginBottom: getResponsiveHeight(3.6) },
        ]}
      >
        <ThemedFilter
          selectedFilter={currentFilter}
          onFilterChange={onFilterChange}
        />
      </Animated.View>
    )
  );

  const EmptyItemComponent = React.memo(
    ({ color: itemColor }: { color: string }) => (
      <View style={styles.emptyItem}>
        <MaterialIcons color={itemColor} name="search" size={50} />
        <ThemedText style={{ textAlign: "center", lineHeight: 30 }}>
          {t("homeScreen.noItemFound")}
        </ThemedText>
      </View>
    )
  );

  // --- RENDER LOGIC ---
  const showLoadingState = isLoading;

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
        <HeaderComponent
          syncStatus={syncStatus}
          isLoading={isLoading}
          isSyncing={isSyncing}
          onSync={handleSync}
          onScan={onNavigateToScanScreen}
          onSettings={onNavigateToSettingsScreen}
        />
      </Animated.View>

      {showLoadingState ? (
        <LoadingComponent />
      ) : isEmpty && initialAnimationsDone ? (
        <EmptyListItem
          scrollHandler={scrollHandler}
          emptyCardStyle={emptyCardStyle}
          onNavigateToEmptyScreen={onNavigateToEmptyScreen}
          onNavigateToScanScreen={onNavigateToScanScreen}
          dropdownOptions={[
            { label: "homeScreen.fab.add", onPress: onNavigateToAddScreen },
            { label: "homeScreen.fab.scan", onPress: onNavigateToScanScreen },
            { label: "homeScreen.fab.gallery", onPress: onOpenGallery },
          ]}
        />
      ) : initialAnimationsDone && localQrData.length > 0 ? (
        <Animated.View style={listContainerAnimatedStyle}>
          <DraggableFlatList
            ref={flatListRef}
            bounces={true}
            ListHeaderComponent={
              <ListHeaderComponent
                listHeaderStyle={listHeaderStyle}
                filter={filter}
                onFilterChange={handleFilterChange}
              />
            }
            ListEmptyComponent={<EmptyItemComponent color={color} />}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={5}
            data={filteredData} // --- FIX: Use data derived from local state
            renderItem={renderItem}
            keyExtractor={(item) => `draggable-item-${item.id}`}
            containerStyle={{ flex: 1 }}
            contentContainerStyle={[
              styles.listContainer,
              filteredData.length > 0 && {
                paddingBottom: listContainerPadding,
              },
            ]}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onDragBegin={onDragBegin}
            onDragEnd={onDragEnd}
            dragItemOverflow={false}
            onScrollOffsetChange={onScrollOffsetChange}
            decelerationRate={"fast"}
          />
        </Animated.View>
      ) : null}

      {isFocused && !showLoadingState && initialAnimationsDone && (
        <ThemedFAB
          actions={[
            {
              text: "homeScreen.fab.add",
              iconName: "plus-circle",
              onPress: onNavigateToAddScreen,
            },
            {
              text: "homeScreen.fab.scan",
              iconName: "camera",
              onPress: onNavigateToScanScreen,
            },
            {
              text: "homeScreen.fab.gallery",
              iconName: "image",
              onPress: onOpenGallery,
            },
          ]}
          style={styles.fab}
          animatedStyle={fabStyle}
        />
      )}

      <ThemedStatusToast
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
        isSyncing={isSyncing}
      />
      <ThemedTopToast
        message={topToastMessage}
        isVisible={isTopToastVisible}
        onVisibilityToggle={setIsTopToastVisible}
        duration={2000}
      />
      <ThemedBottomToast
        isVisible={isBottomToastVisible}
        message={bottomToastMessage}
        iconName={
          bottomToastIcon as keyof typeof MaterialCommunityIcons.glyphMap
        }
        style={styles.bottomToastContainer}
        backgroundColor={bottomToastColor}
      />
      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={
          sheetType === "setting"
            ? t("homeScreen.manage")
            : sheetType === "wifi"
              ? t("homeScreen.wifi")
              : sheetType === "linking"
                ? t("homeScreen.linking")
                : t("homeScreen.settings")
        }
        onChange={handleSheetChange}
        snapPoints={
          sheetType === "setting"
            ? ["25%"]
            : sheetType === "wifi"
              ? ["38%"]
              : sheetType === "linking"
                ? ["35%"]
                : ["35%"]
        }
        styles={{
          customContent: {
            borderRadius: getResponsiveWidth(4),
            marginHorizontal: getResponsiveWidth(3.6),
          },
        }}
        customContent={<View>{renderSheetContent()}</View>}
      />
      <ThemedModal
        primaryActionText={t("homeScreen.move")}
        onPrimaryAction={onDeletePress}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t("homeScreen.cancel")}
        title={t("homeScreen.confirmDeleteTitle")}
        message={t("homeScreen.confirmDeleteMessage")}
        isVisible={isModalVisible}
        iconName="delete"
      />
    </ThemedView>
  );
}

export default React.memo(HomeScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleContainer: {
    position: "absolute",
    top: getResponsiveHeight(10),
    left: 0,
    right: 0,
    flexDirection: "column",
    gap: 15,
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  titleText: { fontSize: getResponsiveFontSize(28) },
  titleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.5),
  },
  titleButton: {},
  listContainer: {
    paddingTop: getResponsiveHeight(18.6),
    flexGrow: 1,
  },
  emptyItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: getResponsiveHeight(1.5),
    opacity: 0.7,
    paddingHorizontal: getResponsiveWidth(5),
    minHeight: getResponsiveHeight(30),
  },
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(2),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10,
  },
  bottomToastContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9,
  },
  fab: {
    position: "absolute",
    bottom: getResponsiveHeight(3),
    right: getResponsiveWidth(3.6),
    zIndex: 3,
  },
  loadingContainer: {
    paddingTop: getResponsiveHeight(18),
    paddingHorizontal: getResponsiveWidth(3.6),
    flex: 1,
    justifyContent: "flex-start",
  },
});