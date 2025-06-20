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
import {
  getQrCodesByUserId,
  deleteQrCode,
  syncQrCodes,
  fetchServerData,
  insertOrUpdateQrCodes,
  updateQrIndexes,
  hasLocalData,
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

  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // --- Core States ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");

  // --- Animation States ---
  const emptyAnimationPerformed = useRef(false);
  // const [emptyAnimationPerformed, setEmptyAnimationPerformed] = useState(false);

  // --- Efficiency States ---
  const [initialLoadAttemptedForUser, setInitialLoadAttemptedForUser] =
    useState<string | null>(null);

  // --- UI States ---
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState("");
  const [bottomToastIcon, setBottomToastIcon] = useState("");
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
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

  // --- Shared Values (Reanimated) ---
  const scrollY = useSharedValue(0);
  const isActive = useSharedValue(false); // <-- REFACTORED from useState
  const isSheetOpen = useSharedValue(false); // <-- REFACTORED from useState
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const listOpacity = useSharedValue(0);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // --- Core Logic Functions (Unchanged) ---
  const syncWithServer = useCallback(
    async (userIdToSync: string) => {
      console.log(`HomeScreen: Attempting to sync with server...`);
      if (isOffline || isSyncing) return;

      console.log(
        `HomeScreen: Initiating syncWithServer for user ${userIdToSync}`
      );
      setIsSyncing(true);
      setSyncStatus("syncing");
      setTopToastMessage(t("homeScreen.syncStarted"));
      setIsTopToastVisible(true);

      try {
        await syncQrCodes(userIdToSync);
        const rawDataFromServer = await fetchServerData(userIdToSync);
        if (rawDataFromServer && rawDataFromServer.length > 0) {
          const serverData: ServerRecord[] = rawDataFromServer.map(
            (item: any) => ({
              ...item,
              collectionId:
                item.collectionId || "YOUR_QR_COLLECTION_ID_PLACEHOLDER",
              collectionName:
                item.collectionName || "YOUR_QR_COLLECTION_NAME_PLACEHOLDER",
            })
          );
          await insertOrUpdateQrCodes(serverData);
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

  // --- EFFECT 1: Initial Data Load & First-Time Sync (Unchanged) ---
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
      console.log("HomeScreen: No userId, cleared data and reset states.");
      return;
    }

    if (initialLoadAttemptedForUser === userId) {
      if (isLoading) setIsLoading(false);
      if (!initialAnimationsDone) setInitialAnimationsDone(true);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    console.log(`HomeScreen: Starting initial data load for user: ${userId}`);

    const loadAndSyncOnce = async () => {
      try {
        const localDbExists = await hasLocalData(userId);
        if (!isMounted) return;

        if (localDbExists) {
          console.log(
            `HomeScreen: Local data found for user ${userId}. Loading from DB.`
          );
          const currentLocalData = await getQrCodesByUserId(userId);
          if (isMounted) {
            dispatch(setQrData(currentLocalData));
          }
        } else if (!isOffline) {
          console.log(
            `HomeScreen: No local data for user ${userId}. Triggering first-time sync.`
          );
          await syncWithServer(userId);
        } else {
          console.log(
            `HomeScreen: No local data and offline for user ${userId}.`
          );
          dispatch(setQrData([]));
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
        }
      }
    };

    InteractionManager.runAfterInteractions(loadAndSyncOnce);

    return () => {
      isMounted = false;
    };
  }, [
    isFocused,
    userId,
    initialLoadAttemptedForUser,
    dispatch,
    isOffline,
    syncWithServer,
    // isLoading,
    // initialAnimationsDone,
  ]);

  // --- EFFECT 2: Network Status Toasts (Unchanged) ---
  useEffect(() => {
    if (isOffline) {
      setBottomToastIcon("wifi-off");
      setBottomToastMessage(t("homeScreen.offline"));
      setBottomToastColor("#f2726f");
      setIsBottomToastVisible(true);
    } else {
      if (prevIsOffline.current && isFocused) {
        setBottomToastIcon("wifi");
        setBottomToastMessage(t("homeScreen.online"));
        setBottomToastColor("#4caf50");
        setIsBottomToastVisible(true);
        if (timeoutRefs.current.network)
          clearTimeout(timeoutRefs.current.network);
        timeoutRefs.current.network = setTimeout(
          () => setIsBottomToastVisible(false),
          2000
        );
      } else if (
        !isFocused &&
        isBottomToastVisible &&
        bottomToastMessage === t("homeScreen.online")
      ) {
        setIsBottomToastVisible(false);
      }
    }
    prevIsOffline.current = isOffline;

    return () => {
      if (timeoutRefs.current.network)
        clearTimeout(timeoutRefs.current.network);
    };
  }, [isOffline, isFocused]);

  // --- EFFECT 3: Animations (Unchanged) ---
  const animateEmptyCard = useCallback(() => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  }, [emptyCardOffset]);

  useEffect(() => {
    if (!initialAnimationsDone) return;

    isEmptyShared.value = isEmpty ? 1 : 0;
    if (isEmpty) {
      listOpacity.value = 0;
      if (!emptyAnimationPerformed.current) {
        emptyCardOffset.value = 350;
        animateEmptyCard();
        emptyAnimationPerformed.current = true;
      } else {
        emptyCardOffset.value = 0;
      }
    } else {
      emptyCardOffset.value = 350;
      listOpacity.value = withTiming(1, { duration: 300 });
      if (emptyAnimationPerformed) {
        emptyAnimationPerformed.current = false;
      }
    }
  }, [
    isEmpty,
    initialAnimationsDone,
    animateEmptyCard,
    listOpacity,
    emptyCardOffset,
    isEmptyShared,
    emptyAnimationPerformed,
  ]);

  useEffect(() => {
    if (!isFocused) {
      listOpacity.value = 0;
    } else if (isFocused && initialAnimationsDone && !isEmpty) {
      listOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isFocused, initialAnimationsDone, isEmpty, listOpacity]);

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
    // *** OPTIMIZED ***: Reads shared values directly on the UI thread
    const shouldReduceZIndex =
      scrollY.value > SCROLL_THRESHOLD || isActive.value || isSheetOpen.value;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, []); // *** OPTIMIZED ***: Removed JS state dependencies

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
  }, []); // scrollY is a shared value, no need for dependency array

  const fabStyle = useAnimatedStyle(() => {
    const marginBottom = withTiming(
      isBottomToastVisible ? 30 : isToastVisible ? 80 : 10,
      { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
    );
    return { marginBottom };
  }, [isBottomToastVisible, isToastVisible]);

  const emptyCardStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: emptyCardOffset.value }],
      flex: 1,
    }),
    []
  );

  const listContainerAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: listOpacity.value,
      flex: 1,
    }),
    []
  );

  // --- Navigation and Action Handlers (Unchanged logic, updated state setters) ---
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

  // *** OPTIMIZED ***: Update shared value instead of state
  const handleSheetChange = useCallback(
    (index: number) => {
      isSheetOpen.value = index > -1;
    },
    [isSheetOpen]
  );

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  // *** OPTIMIZED ***: Removed state setting from scroll handler
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollY.value = offset;
    },
    [scrollY]
  );

  // *** OPTIMIZED ***: Update shared value instead of state
  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    isActive.value = true;
  }, [isActive]);

  const filteredData = useMemo(() => {
    if (filter === "all") return qrData;
    return qrData.filter((item) => item.type === filter);
  }, [qrData, filter]);

  const handleSync = useCallback(() => {
    if (userId && !isOffline && !isSyncing) {
      console.log("HomeScreen: Manual sync initiated by user.");
      syncWithServer(userId);
    } else if (isOffline) {
      setTopToastMessage(t("homeScreen.offlineNoSync"));
      setIsTopToastVisible(true);
    } else if (isSyncing) {
      setTopToastMessage(t("homeScreen.syncInProgress"));
      setIsTopToastVisible(true);
    }
  }, [userId, isOffline, isSyncing, t, syncWithServer]);

  const handleFilterChange = useCallback(
    (newFilter: string) => setFilter(newFilter),
    []
  );

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
      // <ScaleDecorator activeScale={0.9}>
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
      // </ScaleDecorator>
    ),
    [onNavigateToDetailScreen, onOpenSheet]
  );

  // *** OPTIMIZED ***: Update shared value instead of state
  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      isActive.value = false;
      if (!userId) return;
      console.log("HomeScreen: Drag ended, reordering items.");

      InteractionManager.runAfterInteractions(() => {
        let finalDataToDispatch: QRRecord[];

        if (filter === "all") {
          finalDataToDispatch = reorderedData.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString(),
          }));
        } else {
          const newOrderedFullList: QRRecord[] = [];
          let reorderedDataIndex = 0;

          qrData.forEach((originalItem) => {
            if (originalItem.type === filter) {
              if (reorderedData[reorderedDataIndex]) {
                newOrderedFullList.push(reorderedData[reorderedDataIndex]);
                reorderedDataIndex++;
              } else {
                console.warn(
                  "Mismatch in reorderedData length during filtered drag. Using original item."
                );
                newOrderedFullList.push(originalItem);
              }
            } else {
              newOrderedFullList.push(originalItem);
            }
          });

          if (reorderedDataIndex < reorderedData.length) {
            console.warn(
              "Not all items from reorderedData were placed. This might indicate an issue."
            );
          }

          finalDataToDispatch = newOrderedFullList.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString(),
          }));
        }

        dispatch(setQrData(finalDataToDispatch));
        updateQrIndexes(finalDataToDispatch, userId)
          .then(() =>
            console.log(
              "HomeScreen: QR indexes updated successfully after drag."
            )
          )
          .catch((err) =>
            console.error("Error updating QR indexes after drag:", err)
          );
      });
    },
    [dispatch, qrData, filter, userId, isActive]
  );

  // --- Other handlers (Unchanged) ---
  const showToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
  }, []);
  const handleCopySuccess = useCallback(
    () => showToast(t("homeScreen.copied")),
    [showToast, t]
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
        if (timeoutRefs.current.delete)
          clearTimeout(timeoutRefs.current.delete);
        timeoutRefs.current.delete = setTimeout(() => setIsSyncing(false), 400);
      }
    }
  }, [selectedItemId, qrData, dispatch, t, userId, isSyncing]);
  const listContainerPadding = useMemo(() => {
    switch (qrData.length) {
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
  }, [qrData.length]);
  const renderSheetContent = () => {
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
  };

  // --- Memoized Components (Unchanged) ---
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

  // --- Render Logic ---
  const showActualLoadingScreen =
    isLoading && initialLoadAttemptedForUser !== userId;

  return (
    <ThemedView style={styles.container}>
      {/* *** OPTIMIZED ***: Animated.View wraps the memoized component */}
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

      {showActualLoadingScreen ? (
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
      ) : initialAnimationsDone && qrData.length > 0 ? (
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
            data={[...filteredData]}
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

      {isFocused && !isLoading && initialAnimationsDone && (
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
        onVisibilityToggle={(vis) => setIsTopToastVisible(vis)}
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
    paddingTop: getResponsiveHeight(18.4),
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