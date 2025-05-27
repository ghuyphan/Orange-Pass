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
  getUnsyncedQrCodes,
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

const SYNC_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes for sync check throttling

function HomeScreen() {
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const qrData = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? "");

  const color = useThemeColor({ light: "#3A2E24", dark: "#FFF5E1" }, "text");

  // --- Core States ---
  const [isLoading, setIsLoading] = useState(true); // True when actively fetching initial data for a user
  const [isSyncing, setIsSyncing] = useState(false); // True during a full syncWithServer operation or other data-mutating ops
  const [initialAnimationsDone, setInitialAnimationsDone] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");

  // --- Efficiency States ---
  const [initialLoadAttemptedForUser, setInitialLoadAttemptedForUser] =
    useState<string | null>(null);
  const lastSyncCheckTimestampRef = useRef<number>(0);

  // --- UI States ---
  const isEmpty = useMemo(() => qrData.length === 0, [qrData]);
  const [isActive, setIsActive] = useState(false); // For drag
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [isBottomToastVisible, setIsBottomToastVisible] = useState(false);
  const [bottomToastColor, setBottomToastColor] = useState("");
  const [bottomToastIcon, setBottomToastIcon] = useState("");
  const [bottomToastMessage, setBottomToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
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
  const timeoutRefs = useRef<{ [key: string]: NodeJS.Timeout | null }>({
    sync: null,
    idle: null,
    edit: null,
    delete: null,
    sheet: null,
    toast: null,
    network: null,
  });
  const syncStatusRef = useRef(syncStatus); // For checking syncStatus in timeouts
  const prevIsOffline = useRef(isOffline); // For network toast logic

  // --- Shared Values (Reanimated) ---
  const isEmptyShared = useSharedValue(qrData.length === 0 ? 1 : 0);
  const emptyCardOffset = useSharedValue(350);
  const listOpacity = useSharedValue(0);
  const scrollY = useSharedValue(0);

  // Update syncStatusRef whenever syncStatus changes
  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // --- Core Logic Functions ---
  const syncWithServer = useCallback(
    async (userIdToSync: string) => {
      if (isOffline || isSyncing) return;

      console.log(
        `HomeScreen: Initiating syncWithServer for user ${userIdToSync}`
      );
      setIsSyncing(true);
      setSyncStatus("syncing");
      setTopToastMessage(t("homeScreen.syncStarted"));
      setIsTopToastVisible(true);

      InteractionManager.runAfterInteractions(async () => {
        try {
          await syncQrCodes(userIdToSync);
          const rawDataFromServer = await fetchServerData(userIdToSync);
          if (rawDataFromServer && rawDataFromServer.length > 0) {
            const serverData: ServerRecord[] = rawDataFromServer.map(
              (item: any) => ({
                ...item,
                // Ensure collectionId and collectionName have fallbacks
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
          lastSyncCheckTimestampRef.current = Date.now(); // Update timestamp

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
          setIsSyncing(false); // Ensure this is always called
        }
      });
    },
    [dispatch, isOffline, isSyncing, t]
  );

  // --- EFFECT 1: Initial Data Load ---
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
      lastSyncCheckTimestampRef.current = 0;
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

    InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const currentLocalData = await getQrCodesByUserId(userId);
          if (!isMounted) return;
          dispatch(setQrData(currentLocalData));
          setInitialLoadAttemptedForUser(userId);
          console.log(
            `HomeScreen: Initial data loaded successfully for user: ${userId}`
          );
        } catch (error) {
          if (isMounted) {
            console.error("Error loading local QR codes:", error);
            setSyncStatus("error");
            setTopToastMessage(t("homeScreen.loadError"));
            setIsTopToastVisible(true);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setInitialAnimationsDone(true);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [isFocused, userId, initialLoadAttemptedForUser, dispatch, t]);

  // --- EFFECT 2: Sync Trigger (Checks for unsynced data) ---
  useEffect(() => {
    if (
      !isFocused ||
      !initialAnimationsDone ||
      !userId ||
      isLoading ||
      isOffline ||
      isSyncing ||
      syncStatus === "error"
    ) {
      return;
    }

    const now = Date.now();
    const canCheck =
      syncStatus === "idle" ||
      now - lastSyncCheckTimestampRef.current >= SYNC_CHECK_INTERVAL;

    if (!canCheck) {
      return;
    }

    let isMounted = true;
    console.log(`HomeScreen: Checking for unsynced data for user: ${userId}`);

    InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const unsyncedCodes = await getUnsyncedQrCodes(userId);
          const localDbExists = await hasLocalData(userId);
          const needsFullSync = !localDbExists || unsyncedCodes.length > 0;

          lastSyncCheckTimestampRef.current = now; // Update timestamp after check

          if (needsFullSync && isMounted) {
            console.log(
              "HomeScreen: Unsynced data found or local DB empty, initiating full sync."
            );
            await syncWithServer(userId);
          } else if (
            isMounted &&
            syncStatus !== "synced" &&
            syncStatus !== "syncing"
          ) {
            console.log(
              "HomeScreen: No sync needed, setting status to synced then idle."
            );
            setSyncStatus("synced");
            if (timeoutRefs.current.idle)
              clearTimeout(timeoutRefs.current.idle);
            timeoutRefs.current.idle = setTimeout(() => {
              if (isMounted && syncStatusRef.current === "synced") {
                setSyncStatus("idle");
              }
            }, 3000);
          }
        } catch (error) {
          if (isMounted) {
            console.error("Error checking for unsynced data:", error);
            setSyncStatus("error");
            setTopToastMessage(t("homeScreen.syncCheckError"));
            setIsTopToastVisible(true);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
      if (timeoutRefs.current.idle) clearTimeout(timeoutRefs.current.idle);
    };
  }, [
    isEmpty,
    initialAnimationsDone,
    isFocused,
    listOpacity,
    emptyCardOffset,
    isEmptyShared,
  ]);

  // --- EFFECT 3: Network Status Toasts ---
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
  }, [isOffline, t, isFocused, bottomToastMessage, isBottomToastVisible]);

  // --- EFFECT 4: Animations ---
  const animateEmptyCard = useCallback(() => {
    emptyCardOffset.value = withSpring(0, { damping: 30, stiffness: 150 });
  }, [emptyCardOffset]);

  useEffect(() => {
    if (!isFocused || !initialAnimationsDone) {
      if (!isFocused) {
        listOpacity.value = 0; // Reset list opacity if screen loses focus
      }
      return;
    }

    isEmptyShared.value = isEmpty ? 1 : 0;

    if (isEmpty) {
      listOpacity.value = 0;
      emptyCardOffset.value = 350; // Reset for animation
      animateEmptyCard();
    } else {
      emptyCardOffset.value = 350; // Ensure empty card is off-screen
      listOpacity.value = withTiming(1, { duration: 300 }); // Fade in list
    }
  }, [
    isEmpty,
    initialAnimationsDone,
    animateEmptyCard,
    listOpacity,
    emptyCardOffset,
    isEmptyShared,
  ]);

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
      scrollY.value > SCROLL_THRESHOLD || isActive || isSheetOpen;
    return {
      opacity,
      transform: [{ translateY }],
      zIndex: shouldReduceZIndex ? 0 : 1,
    };
  }, [isActive, isSheetOpen, scrollY]);

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
  }, [scrollY]);

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
    [emptyCardOffset]
  );
  const listContainerAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: listOpacity.value,
      flex: 1,
    }),
    [listOpacity]
  );

  // --- Navigation and Action Handlers ---
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
    () => router.push("/(scan)/scan-main"),
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
            pathname: `/(edit)/edit`,
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
      setIsSheetOpen(true);
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

  const onOpenGallery = useGalleryPicker({
    onOpenSheet,
    onNavigateToAddScreen,
  });

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
    if (event.contentOffset.y > 50 && fabOpen) {
      setFabOpen(false);
    } else if (
      event.contentOffset.y <= 50 &&
      !fabOpen &&
      !isLoading &&
      initialAnimationsDone
    ) {
      setFabOpen(true);
    }
  });
  const onScrollOffsetChange = useCallback(
    (offset: number) => {
      scrollY.value = offset;
    },
    [scrollY]
  );
  const onDragBegin = useCallback(() => {
    triggerHapticFeedback();
    setIsActive(true);
  }, []);

  const filteredData = useMemo(() => {
    if (filter === "all") return qrData;
    return qrData.filter((item) => item.type === filter);
  }, [qrData, filter]);

  const handleSync = useCallback(() => {
    if (userId && !isOffline && !isSyncing) {
      console.log("HomeScreen: Manual sync initiated by user.");
      lastSyncCheckTimestampRef.current = 0; // Reset throttle timer
      setSyncStatus("idle"); // Allow sync effect to run
    } else if (isOffline) {
      setTopToastMessage(t("homeScreen.offlineNoSync"));
      setIsTopToastVisible(true);
    } else if (isSyncing) {
      setTopToastMessage(t("homeScreen.syncInProgress"));
      setIsTopToastVisible(true);
    }
  }, [userId, isOffline, isSyncing, t]);

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
        />
      </ScaleDecorator>
    ),
    [onNavigateToDetailScreen, onOpenSheet]
  );

  const onDragEnd = useCallback(
    ({ data: reorderedData }: { data: QRRecord[] }) => {
      triggerHapticFeedback();
      setIsActive(false);
      if (!userId) return;
      console.log("HomeScreen: Drag ended, reordering items.");

      InteractionManager.runAfterInteractions(() => {
        let finalDataToDispatch: QRRecord[];

        if (filter === "all") {
          // If filter is 'all', reorderedData is the full list in its new order
          finalDataToDispatch = reorderedData.map((item, index) => ({
            ...item,
            qr_index: index,
            updated: new Date().toISOString(),
          }));
        } else {
          // If a filter is active, reorderedData contains only the filtered items in their new order.
          // We need to reconstruct the full list, placing the reordered filtered items
          // correctly among the non-filtered items, then re-index everything.
          const newOrderedFullList: QRRecord[] = [];
          let reorderedDataIndex = 0; // Pointer for the reorderedData (filtered items)

          // Iterate through the original full list (qrData from Redux)
          qrData.forEach((originalItem) => {
            if (originalItem.type === filter) {
              // This item was part of the filtered set.
              // Place the corresponding item from the reordered (filtered) list.
              if (reorderedData[reorderedDataIndex]) {
                newOrderedFullList.push(reorderedData[reorderedDataIndex]);
                reorderedDataIndex++;
              } else {
                // This case should ideally not be reached if reorderedData
                // correctly represents all original filtered items.
                // Log a warning and push the original item as a fallback.
                console.warn(
                  "Mismatch in reorderedData length during filtered drag. Using original item."
                );
                newOrderedFullList.push(originalItem);
              }
            } else {
              // This item was not part of the filter, keep it in its relative place.
              newOrderedFullList.push(originalItem);
            }
          });

          // Ensure all items from reorderedData were used (sanity check)
          if (reorderedDataIndex < reorderedData.length) {
            console.warn(
              "Not all items from reorderedData were placed. This might indicate an issue."
            );
            // Potentially append remaining items, though this signals a logic flaw earlier.
            // For now, we assume the loop above correctly places them.
          }

          // Re-index the entire newly constructed list
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
    [dispatch, qrData, filter, userId]
  );

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
      console.log("HomeScreen: Deleting QR code:", selectedItemId);

      await deleteQrCode(selectedItemId, userId);
      const updatedData = qrData.filter((item) => item.id !== selectedItemId);
      const reindexedData = updatedData.map((item, index) => ({
        ...item,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData));
      await updateQrIndexes(reindexedData, userId); // Update indexes

      setIsToastVisible(false);
      setTopToastMessage(t("homeScreen.deleteSuccess"));
      setIsTopToastVisible(true);
      console.log("HomeScreen: QR code deleted successfully.");
    } catch (error) {
      console.error("Error deleting QR code:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true); // Keep error toast
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
    // Determine padding based on the number of items to ensure last item is scrollable
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
        return 100; // Default padding for 4+ items
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

  // --- Memoized Components ---
  const HeaderComponent = React.memo(
    ({
      titleContainerStyle: localTitleContainerStyle,
      syncStatus: currentSyncStatus,
      isLoading: currentIsLoading,
      isSyncing: currentIsSyncingOp,
      onSync,
      onScan,
      onSettings,
    }: {
      titleContainerStyle: any;
      syncStatus: "idle" | "syncing" | "synced" | "error";
      isLoading: boolean;
      isSyncing: boolean;
      onSync: () => void;
      onScan: () => void;
      onSettings: () => void;
    }) => (
      <Animated.View style={[styles.titleContainer, localTitleContainerStyle]}>
        <View style={styles.headerContainer}>
          <ThemedText style={styles.titleText} type="title">
            {t("homeScreen.title")}
          </ThemedText>
          <View style={styles.titleButtonContainer}>
            <ThemedButton
              iconName="cloud-sync"
              syncStatus={currentSyncStatus}
              style={styles.titleButton}
              onPress={onSync}
              disabled={currentIsSyncingOp || currentIsLoading || isOffline}
            />
            <ThemedButton
              iconName="camera"
              style={styles.titleButton}
              onPress={onScan}
              disabled={currentIsLoading}
            />
            <ThemedButton
              iconName="cog"
              style={styles.titleButton}
              onPress={onSettings}
              disabled={currentIsLoading}
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
      <HeaderComponent
        titleContainerStyle={titleContainerStyle}
        syncStatus={syncStatus}
        isLoading={isLoading}
        isSyncing={isSyncing}
        onSync={handleSync}
        onScan={onNavigateToScanScreen}
        onSettings={onNavigateToSettingsScreen}
      />

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
            data={[...filteredData]} // Ensure a new array reference if filteredData identity might not change
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
        onClose={() => {
          if (timeoutRefs.current.sheet)
            clearTimeout(timeoutRefs.current.sheet);
          timeoutRefs.current.sheet = setTimeout(
            () => setIsSheetOpen(false),
            50
          );
        }}
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
        iconName="delete-outline"
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
    paddingTop: getResponsiveHeight(18.1), // Initial top padding for header
    flexGrow: 1, // Important for FlatList to fill space and scroll
  },
  emptyItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: getResponsiveHeight(1.5),
    opacity: 0.7,
    paddingHorizontal: getResponsiveWidth(5),
    minHeight: getResponsiveHeight(30), // Ensure it takes some space
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
    bottom: getResponsiveHeight(2),
    right: getResponsiveWidth(3.6),
    zIndex: 3, // Ensure FAB is above list but below toasts/modals
  },
  loadingContainer: {
    paddingTop: getResponsiveHeight(18), // Match list's top padding
    paddingHorizontal: getResponsiveWidth(3.6),
    flex: 1,
    justifyContent: "flex-start",
  },
});
