import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import * as Linking from "expo-linking";
import { useDispatch, useSelector } from "react-redux";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { throttle } from "lodash";
import { MMKV } from "react-native-mmkv";
import * as Clipboard from "expo-clipboard";

// Local imports
import { RootState } from "@/store/rootReducer";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { t } from "@/i18n";
// Components
import { ThemedView } from "@/components/ThemedView";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { ThemedPinnedCard } from "@/components/cards";
import { ThemedText } from "@/components/ThemedText";
import { ThemedStatusToast } from "@/components/toast/ThemedStatusToast";
import { ThemedModal } from "@/components/modals/ThemedIconModal";
import ThemedReuseableSheet from "@/components/bottomsheet/ThemedReusableSheet";

// Utilities
import { returnItemData } from "@/utils/returnItemData";
import { getVietQRData } from "@/utils/vietQR";
import { getIconPath } from "@/utils/returnIcon";
import { returnItemsByType } from "@/utils/returnItemData";
import { deleteQrCode, updateQrIndexes } from "@/services/localDB/qrDB";
import QRRecord from "@/types/qrType";

import { setQrData } from "@/store/reducers/qrSlice";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { ThemedTopToast } from "@/components/toast/ThemedTopToast";
import SettingSheetContent from "@/components/bottomsheet/SettingSheetContent";
import { useGlassStyle } from "@/hooks/useGlassStyle";

// Constants
const DEFAULT_AMOUNT_SUGGESTIONS = [
  "10,000",
  "20,000",
  "50,000",
  "100,000",
  "500,000",
  "1,000,000",
  "5,000,000",
  "10,000,000",
];
const SUGGESTION_MULTIPLIERS = [1000, 10000, 100000, 1000000];
const MAX_SUGGESTION_AMOUNT = 100_000_000_000; // 100 Billion VND cap for suggestions
const LAST_USED_BANK_KEY = "lastUsedBank";
const BANK_LOAD_DELAY = 300;
const EDIT_NAVIGATION_DELAY = 10;
const THROTTLE_WAIT = 500;
const INITIAL_BANK_COUNT = 6;
const BANK_BATCH_SIZE = 6;
const GUEST_USER_ID_STRING = "guest";

// Types
interface ItemData {
  id: string;
  code: string;
  type: "bank" | "store" | "ewallet";
  metadata: string;
  metadata_type: "qr" | "barcode";
  account_name?: string;
  account_number?: string;
  style?: object;
  qr_index?: number;
}

interface BankItem {
  code: string;
  name: string;
}

const storage = new MMKV();

const formatAmount = (numStr: string): string =>
  numStr.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const DetailScreen = () => {
  const { currentTheme } = useTheme();
  const dispatch = useDispatch();
  const { item: encodedItem, id } = useLocalSearchParams();
  const qrDataFromStore = useSelector((state: RootState) => state.qr.qrData);
  const isOffline = useSelector((state: RootState) => state.network.isOffline);
  const currentUserId = useSelector((state: RootState) => state.auth?.user?.id);
  const router = useRouter();

  const bottomSheetRef = useRef<BottomSheet>(null);
  const editNavigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [toastKey, setToastKey] = useState(0);
  const [amount, setAmount] = useState("");
  const [isSyncing, setIsSyncing] = useState(false); // Used for transfer button loading
  const [isDeleteSyncing, setIsDeleteSyncing] = useState(false); // Separate state for delete operation
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTopToastVisible, setIsTopToastVisible] = useState(false);
  const [topToastMessage, setTopToastMessage] = useState("");

  const [vietQRBanks, setVietQRBanks] = useState<BankItem[]>([]);
  const [allBanks, setAllBanks] = useState<BankItem[]>([]);
  const [isLoadingMoreBanks, setIsLoadingMoreBanks] = useState(false);
  const [isBanksInitiallyLoading, setIsBanksInitiallyLoading] = useState(true);
  const { overlayColor, borderColor: glassBorderColor } = useGlassStyle();

  const item = useMemo<ItemData | null>(() => {
    if (!encodedItem) return null;
    try {
      return JSON.parse(decodeURIComponent(String(encodedItem)));
    } catch (error) {
      console.error("Failed to parse item:", error);
      return null;
    }
  }, [encodedItem]);

  const cardColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
    [currentTheme],
  );
  const iconColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.icon : Colors.dark.icon),
    [currentTheme],
  );
  const textColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.text : Colors.dark.text),
    [currentTheme],
  );
  const placeholderColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.placeHolder
        : Colors.dark.placeHolder,
    [currentTheme],
  );
  const currencyBorderColor = useMemo(
    () =>
      currentTheme === "light"
        ? "rgba(0, 0, 0, 0.2)"
        : "rgba(255, 255, 255, 0.2)",
    [currentTheme],
  );
  const currencyTextColor = useMemo(
    () =>
      currentTheme === "light"
        ? "rgba(0, 0, 0, 0.2)"
        : "rgba(255, 255, 255, 0.2)",
    [currentTheme],
  );

  const dynamicSuggestions = useMemo(() => {
    const numericString = amount.replace(/,/g, "");

    if (!numericString || numericString === "0") {
      return DEFAULT_AMOUNT_SUGGESTIONS;
    }

    try {
      const numericPrefix = parseInt(numericString, 10);
      if (isNaN(numericPrefix) || numericPrefix <= 0) {
        return DEFAULT_AMOUNT_SUGGESTIONS;
      }

      if (numericPrefix >= MAX_SUGGESTION_AMOUNT) {
        return DEFAULT_AMOUNT_SUGGESTIONS.filter((sugg) => {
          const suggVal = parseInt(sugg.replace(/,/g, ""), 10);
          return (
            suggVal > numericPrefix && suggVal <= MAX_SUGGESTION_AMOUNT
          );
        });
      }

      const generated = SUGGESTION_MULTIPLIERS.map((multiplier) => {
        if (
          multiplier > 0 &&
          numericPrefix > Number.MAX_SAFE_INTEGER / multiplier
        ) {
          return null;
        }
        const result = numericPrefix * multiplier;
        if (
          result > MAX_SUGGESTION_AMOUNT ||
          !Number.isSafeInteger(result) ||
          result <= numericPrefix
        ) {
          return null;
        }
        return formatAmount(String(result));
      }).filter((s) => s !== null) as string[];

      if (generated.length === 0) {
        return DEFAULT_AMOUNT_SUGGESTIONS.filter((sugg) => {
          const suggVal = parseInt(sugg.replace(/,/g, ""), 10);
          return (
            suggVal > numericPrefix && suggVal <= MAX_SUGGESTION_AMOUNT
          );
        });
      }
      return generated;
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return DEFAULT_AMOUNT_SUGGESTIONS;
    }
  }, [amount]);

  useEffect(() => {
    const loadInitialBanks = async () => {
      if (item?.type !== "store") return;
      setIsBanksInitiallyLoading(true);
      const timerId = setTimeout(() => {
        let banks = returnItemsByType("vietqr");
        const lastUsedBankCode = storage.getString(LAST_USED_BANK_KEY);
        setAllBanks(banks);
        if (lastUsedBankCode) {
          const lastUsedBankIndex = banks.findIndex(
            (bank) => bank.code === lastUsedBankCode,
          );
          if (lastUsedBankIndex > -1) {
            const lastUsedBank = banks.splice(lastUsedBankIndex, 1)[0];
            banks.unshift(lastUsedBank);
          }
        }
        setVietQRBanks(banks.slice(0, INITIAL_BANK_COUNT));
        setIsBanksInitiallyLoading(false);
      }, BANK_LOAD_DELAY);
      return () => clearTimeout(timerId);
    };
    loadInitialBanks();
  }, [item?.type]);

  useEffect(() => {
    return () => {
      if (editNavigationTimeoutRef.current) {
        clearTimeout(editNavigationTimeoutRef.current);
      }
    };
  }, []);

  const handleExpandPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const onEditPress = useCallback(
    throttle(() => {
      bottomSheetRef.current?.close();
      if (editNavigationTimeoutRef.current) {
        clearTimeout(editNavigationTimeoutRef.current);
      }
      const editId = Array.isArray(id) ? id[0] : id;
      if (!editId) return;

      editNavigationTimeoutRef.current = setTimeout(() => {
        router.push({
          pathname: `/(auth)/(edit)/edit`,
          params: { id: editId },
        });
      }, EDIT_NAVIGATION_DELAY);
    }, THROTTLE_WAIT),
    [id, router],
  );

  const onDeletePress = useCallback(() => {
    bottomSheetRef.current?.close();
    setIsModalVisible(true);
  }, []);

  const handleLoadMoreBanks = useCallback(() => {
    if (vietQRBanks.length >= allBanks.length || isLoadingMoreBanks) return;
    setIsLoadingMoreBanks(true);
    setTimeout(() => {
      const nextBatch = allBanks.slice(
        vietQRBanks.length,
        vietQRBanks.length + BANK_BATCH_SIZE,
      );
      setVietQRBanks((current) => [...current, ...nextBatch]);
      setIsLoadingMoreBanks(false);
    }, 100);
  }, [vietQRBanks.length, allBanks, isLoadingMoreBanks]);

  const onDeleteItem = useCallback(async () => {
    const itemId = Array.isArray(id) ? id[0] : id;
    if (!itemId) return;

    const userIdToUse =
      typeof currentUserId === "string" && currentUserId
        ? currentUserId
        : GUEST_USER_ID_STRING;

    setIsDeleteSyncing(true);
    setIsToastVisible(true);
    setToastMessage(t("homeScreen.deleting"));

    try {
      await deleteQrCode(itemId, userIdToUse);
      const updatedData = qrDataFromStore.filter(
        (qrItem) => qrItem.id !== itemId,
      );
      const reindexedData: QRRecord[] = updatedData.map((qrItem, index) => ({
        ...qrItem,
        id: qrItem.id,
        qr_index: index,
        updated: new Date().toISOString(),
      }));
      dispatch(setQrData(reindexedData as any));
      await updateQrIndexes(reindexedData, userIdToUse);

      setIsModalVisible(false);
      setIsToastVisible(false);
      router.replace("/home");
    } catch (error) {
      console.error("Error deleting QR code:", error);
      setToastMessage(t("homeScreen.deleteError"));
      setIsToastVisible(true);
      setIsModalVisible(false);
    } finally {
      setIsDeleteSyncing(false);
    }
  }, [id, qrDataFromStore, dispatch, router, currentUserId]);

  const handleOpenMap = useCallback(() => {
    if (!item) return;
    const itemName = returnItemData(item.code, item.type);
    if (!itemName?.name) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      itemName.name,
    )}`;
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open Google Maps:", err);
      setIsToastVisible(true);
      setToastMessage(t("detailsScreen.failedToOpenGoogleMaps"));
    });
  }, [item]);

  const handleOpenBank = useCallback(
    async (code: string) => {
      let lowerCaseCode = code.toLowerCase();
      if (lowerCaseCode === "vib") lowerCaseCode = "vib-2";
      else if (lowerCaseCode === "acb") lowerCaseCode = "acb-biz";
      const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          storage.set(LAST_USED_BANK_KEY, code);
          if (item?.type === "store") {
            setVietQRBanks((currentBanks) => {
              const updatedBanks = [...currentBanks];
              const bankIndex = updatedBanks.findIndex((b) => b.code === code);
              if (bankIndex > 0) {
                const [selectedBank] = updatedBanks.splice(bankIndex, 1);
                updatedBanks.unshift(selectedBank);
              }
              return updatedBanks;
            });
            setAllBanks((currentBanks) => {
              const updatedBanks = [...currentBanks];
              const bankIndex = updatedBanks.findIndex((b) => b.code === code);
              if (bankIndex > 0) {
                const [selectedBank] = updatedBanks.splice(bankIndex, 1);
                updatedBanks.unshift(selectedBank);
              }
              return updatedBanks;
            });
          }
        } else {
          setIsToastVisible(true);
          setToastMessage(t("detailsScreen.cannotOpenBankApp"));
          await Linking.openURL("https://vietqr.io");
        }
      } catch (err) {
        setIsToastVisible(true);
        setToastMessage(t("detailsScreen.failedToOpenBankApp"));
      }
    },
    [item?.type],
  );

  const showTopToast = useCallback((message: string) => {
    setTopToastMessage(message);
    setIsTopToastVisible(true);
    setToastKey((prevKey) => prevKey + 1);
  }, []);

  const onVisibilityToggle = useCallback((isVisible: boolean) => {
    setIsTopToastVisible(isVisible);
  }, []);

  const onNavigateToSelectScreen = useCallback(() => {
    router.push({
      pathname: "/(auth)/(detail)/bank-select",
      params: {
        banks: JSON.stringify(allBanks),
        selectedBankCode: storage.getString(LAST_USED_BANK_KEY) || "",
      },
    });
  }, [router, allBanks]);

  const handleTransferAmount = useCallback(
    throttle(async () => {
      if (!item || !amount) return;
      if (isOffline) {
        showTopToast(t("detailsScreen.offlineMessage"));
        return;
      }

      setIsSyncing(true);

      try {
        const itemName = returnItemData(item.code, item.type);
        const message = `${t("detailsScreen.transferMessage")} ${item.account_name
          }`;
        const numericAmount = parseInt(amount.replace(/,/g, ""), 10);
        if (isNaN(numericAmount)) throw new Error("Invalid amount format");

        const response = await getVietQRData(
          item.account_number ?? "",
          item.account_name ?? "",
          itemName?.bin || "",
          numericAmount,
          message,
        );
        const qrCode = response?.data?.qrCode;
        if (!qrCode) throw new Error("Failed to retrieve QR code");

        router.replace({
          pathname: "/qr-screen",
          params: {
            metadata: qrCode,
            amount: amount,
            originalItem: encodeURIComponent(JSON.stringify(item)),
          },
        });
      } catch (error) {
        console.error("Error generating QR code:", error);
        setToastMessage(t("detailsScreen.generateError"));
        setIsToastVisible(true);
      } finally {
        setIsSyncing(false);
      }
    }, THROTTLE_WAIT),
    [item, amount, router, showTopToast, isOffline],
  );

  const onCopyAccountNumber = useCallback(() => {
    if (item?.account_number) {
      Clipboard.setStringAsync(item.account_number);
      showTopToast(t("detailsScreen.copiedToClipboard"));
    }
  }, [item?.account_number, showTopToast]);

  const renderSuggestionItem = useCallback(
    ({ item: suggestionItem }: { item: string }) => (
      <ThemedButton
        onPress={() => setAmount(suggestionItem)}
        label={suggestionItem}
        style={styles.suggestionItem}
        textStyle={styles.suggestionText}
      />
    ),
    [],
  );

  const renderPaymentMethodItem = useCallback(
    ({ item: bankItem }: { item: BankItem }) => (
      <ThemedButton
        style={styles.bankItemPressable}
        onPress={() => handleOpenBank(bankItem.code)}
      >
        <View style={styles.bankIconContainer}>
          <Image
            source={getIconPath(bankItem.code)}
            style={styles.bankIcon}
            resizeMode="contain"
          />
        </View>
        <ThemedText numberOfLines={1} style={styles.bankItemText}>
          {bankItem.name}
        </ThemedText>
      </ThemedButton>
    ),
    [handleOpenBank],
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.loadingSkeleton}>
        <ActivityIndicator
          size={getResponsiveFontSize(25)}
          color={iconColor}
        />
      </View>
    ),
    [iconColor],
  );

  const renderBankListFooter = useCallback(() => {
    if (isLoadingMoreBanks) {
      return (
        <View style={styles.bankListFooter}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      );
    }
    if (vietQRBanks.length < allBanks.length) {
      return (
        <ThemedButton
          style={styles.bankItemPressable}
          onPress={handleLoadMoreBanks}
        >
          <View
            style={[
              styles.bankIconContainer,
              { backgroundColor: "transparent" },
            ]}
          >
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={getResponsiveFontSize(24)}
              color={iconColor}
            />
          </View>
          <ThemedText numberOfLines={1} style={styles.bankItemText}>
            {t("detailsScreen.loadMore")}
          </ThemedText>
        </ThemedButton>
      );
    }
    return null;
  }, [
    isLoadingMoreBanks,
    vietQRBanks.length,
    allBanks.length,
    iconColor,
    handleLoadMoreBanks,
  ]);

  if (!item) {
    return (
      <ThemedView style={styles.loadingWrapper}>
        <ThemedText>{t("detailsScreen.noItemFound")}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={[
        styles.container,
        {
          backgroundColor:
            currentTheme === "light"
              ? Colors.light.background
              : Colors.dark.background,
        },
      ]}
      bottomOffset={50}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerWrapper}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
        <ThemedButton onPress={handleExpandPress} iconName="dots-vertical" />
      </View>

      <ThemedPinnedCard
        style={styles.pinnedCardWrapper}
        metadata_type={item.metadata_type}
        code={item.code}
        type={item.type}
        metadata={item.metadata}
        accountName={item.account_name}
        accountNumber={item.account_number}
        onAccountNumberPress={onCopyAccountNumber}
        enableGlassmorphism={true}
      />

      {(item.type === "bank" || item.type === "store") && (
        <View
          style={[
            styles.infoWrapper,
            { backgroundColor: cardColor, borderColor: glassBorderColor },
          ]}
        >
          <View
            style={[styles.defaultOverlay, { backgroundColor: overlayColor }]}
          />
          <Pressable onPress={handleOpenMap} style={styles.actionButton}>
            <View style={styles.actionHeader}>
              <MaterialCommunityIcons
                name="map-marker"
                size={getResponsiveFontSize(16)}
                color={iconColor}
              />
              <ThemedText style={styles.labelText}>
                {t("detailsScreen.nearbyLocation")}
              </ThemedText>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={getResponsiveFontSize(16)}
              color={iconColor}
            />
          </Pressable>

          {item.type === "bank" && (
            <View style={styles.transferContainer}>
              <View style={styles.transferHeader}>
                <MaterialCommunityIcons
                  name="qrcode"
                  size={getResponsiveFontSize(16)}
                  color={iconColor}
                />
                <ThemedText style={styles.labelText}>
                  {t("detailsScreen.createQrCode")}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.transferSection,
                  dynamicSuggestions.length === 0 && {
                    paddingBottom: 0,
                    gap: 0,
                  },
                ]}
              >
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.inputField, { color: textColor }]}
                    placeholder={t("detailsScreen.receivePlaceholder")}
                    keyboardType="numeric"
                    value={amount}
                    placeholderTextColor={placeholderColor}
                    onChangeText={(text) => setAmount(formatAmount(text))}
                    cursorColor={textColor}
                  />
                  {amount ? (
                    <Pressable
                      hitSlop={styles.hitSlop}
                      onPress={() => setAmount("")}
                      style={styles.clearButton}
                    >
                      <MaterialCommunityIcons
                        name={"close-circle"}
                        size={getResponsiveFontSize(16)}
                        color={iconColor}
                      />
                    </Pressable>
                  ) : null}
                  <View
                    style={[
                      styles.currencyContainer,
                      { borderColor: currencyBorderColor },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.currencyText,
                        { color: currencyTextColor },
                      ]}
                    >
                      đ
                    </ThemedText>
                  </View>
                  <Pressable
                    hitSlop={styles.hitSlop}
                    onPress={handleTransferAmount}
                    style={[
                      styles.transferButton,
                      { opacity: amount && !isSyncing ? 1 : 0.5 },
                    ]}
                    disabled={!amount || isSyncing}
                  >
                    {isSyncing ? (
                      <ActivityIndicator
                        size={getResponsiveFontSize(16)}
                        color={iconColor}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name={"chevron-right"}
                        size={getResponsiveFontSize(16)}
                        color={iconColor}
                      />
                    )}
                  </Pressable>
                </View>
                <FlatList
                  key={amount}
                  data={dynamicSuggestions}
                  horizontal
                  style={styles.suggestionList}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(suggItem, index) =>
                    `suggestion-${suggItem}-${index}`
                  }
                  contentContainerStyle={styles.suggestionListContent}
                  renderItem={renderSuggestionItem}
                  initialNumToRender={4}
                  maxToRenderPerBatch={4}
                  windowSize={5}
                />
              </View>
            </View>
          )}

          {item.type === "store" && (
            <View style={styles.bottomContainer}>
              <Pressable
                onPress={onNavigateToSelectScreen}
                style={styles.bottomTitle}
              >
                <View style={styles.bankTransferHeader}>
                  <MaterialCommunityIcons
                    name="bank"
                    size={getResponsiveFontSize(18)}
                    color={iconColor}
                  />
                  <ThemedText>{t("detailsScreen.bankTransfer")}</ThemedText>
                  <Image
                    source={require("@/assets/images/vietqr.png")}
                    style={styles.vietQRLogo}
                    resizeMode="contain"
                  />
                </View>
                <MaterialCommunityIcons
                  name="magnify"
                  size={getResponsiveFontSize(18)}
                  color={iconColor}
                />
              </Pressable>
              <FlatList
                data={vietQRBanks}
                horizontal
                style={styles.bankList}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(bankItem) => bankItem.code}
                contentContainerStyle={styles.bankListContent}
                renderItem={renderPaymentMethodItem}
                ListEmptyComponent={
                  isBanksInitiallyLoading ? renderEmptyComponent : null
                }
                ListFooterComponent={renderBankListFooter}
                onEndReached={handleLoadMoreBanks}
                onEndReachedThreshold={0.3}
                initialNumToRender={INITIAL_BANK_COUNT}
                maxToRenderPerBatch={BANK_BATCH_SIZE}
                windowSize={3}
              />
            </View>
          )}
        </View>
      )}

      <ThemedReuseableSheet
        ref={bottomSheetRef}
        title={t("homeScreen.manage")}
        snapPoints={["30%"]}
        customContent={
          <SettingSheetContent onEdit={onEditPress} onDelete={onDeletePress} />
        }
      />

      <ThemedModal
        primaryActionText={t("homeScreen.move")}
        onPrimaryAction={onDeleteItem}
        onDismiss={() => setIsModalVisible(false)}
        dismissable={true}
        onSecondaryAction={() => setIsModalVisible(false)}
        secondaryActionText={t("homeScreen.cancel")}
        title={t("homeScreen.confirmDeleteTitle")}
        message={t("homeScreen.confirmDeleteMessage")}
        isVisible={isModalVisible}
        iconName="delete"
      />
      <ThemedTopToast
        key={toastKey}
        isVisible={isTopToastVisible}
        message={topToastMessage}
        onVisibilityToggle={onVisibilityToggle}
      />
      <ThemedStatusToast
        isSyncing={isDeleteSyncing}
        isVisible={isToastVisible}
        message={toastMessage}
        onDismiss={() => setIsToastVisible(false)}
        style={styles.toastContainer}
      />
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingBottom: getResponsiveHeight(5),
    paddingHorizontal: getResponsiveWidth(3.6),
    flexGrow: 1,
  },
  headerWrapper: {
    paddingTop: getResponsiveHeight(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: getResponsiveHeight(3.6),
  },
  pinnedCardWrapper: {},
  infoWrapper: {
    borderRadius: getResponsiveWidth(4),
    overflow: "hidden",
    marginVertical: getResponsiveHeight(3.6),
    borderWidth: 1,
  },
  defaultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(1.8),
    zIndex: 1,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  labelText: {
    fontSize: getResponsiveFontSize(16),
  },
  transferContainer: {
    zIndex: 1,
  },
  transferHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(1.8),
    paddingBottom: getResponsiveHeight(0.6),
    gap: getResponsiveWidth(2.4),
  },
  transferSection: {
    gap: getResponsiveHeight(1.2),
    paddingBottom: getResponsiveHeight(1.8),
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  inputField: {
    paddingVertical: getResponsiveHeight(1.2),
    fontSize: getResponsiveFontSize(16),
    flexGrow: 1,
    flexShrink: 1,
  },
  clearButton: {
    padding: getResponsiveWidth(1.2),
    marginLeft: getResponsiveWidth(1.2),
  },
  transferButton: {
    padding: getResponsiveWidth(1.2),
    marginLeft: getResponsiveWidth(1.2),
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    justifyContent: "center",
    alignItems: "center",
  },
  hitSlop: {
    bottom: getResponsiveHeight(1.2),
    left: getResponsiveWidth(2.4),
    right: getResponsiveWidth(2.4),
    top: getResponsiveHeight(1.2),
  },
  loadingSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: getResponsiveHeight(9.6),
    width: "100%",
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  bankListFooter: {
    paddingHorizontal: getResponsiveWidth(2),
    justifyContent: "center",
    alignItems: "center",
    height: getResponsiveHeight(9.6),
    width: getResponsiveWidth(16.8),
  },
  bankListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingBottom: getResponsiveHeight(1.8),
  },
  bankItemPressable: {
    height: getResponsiveHeight(9.6),
    width: getResponsiveWidth(16.8),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    gap: getResponsiveHeight(0.36),
    padding: getResponsiveWidth(1),
  },
  bankIcon: {
    width: "55%",
    height: "55%",
  },
  bankIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: getResponsiveWidth(8.4),
    height: getResponsiveWidth(8.4),
    backgroundColor: "white",
    borderRadius: getResponsiveWidth(4.2),
    overflow: "hidden",
    zIndex: 1,
  },
  bankItemText: {
    fontSize: getResponsiveFontSize(12),
    maxWidth: "90%",
    textAlign: "center",
    zIndex: 1,
  },
  vietQRLogo: {
    height: getResponsiveHeight(3.6),
    width: getResponsiveWidth(16.8),
  },
  currencyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: getResponsiveWidth(6),
    height: getResponsiveWidth(6),
    borderRadius: getResponsiveWidth(3),
    overflow: "hidden",
    marginHorizontal: getResponsiveWidth(2.4),
    borderWidth: 1,
  },
  currencyText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: "500",
    textAlign: "center",
  },
  suggestionList: {},
  suggestionListContent: {
    gap: getResponsiveWidth(2.4),
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingVertical: getResponsiveHeight(0.6),
  },
  suggestionItem: {
    paddingHorizontal: getResponsiveWidth(3.6),
    paddingVertical: getResponsiveHeight(0.9),
  },
  suggestionText: {
    fontSize: getResponsiveFontSize(14),
  },
  bankList: {},
  toastContainer: {
    position: "absolute",
    bottom: getResponsiveHeight(2),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10,
  },
  bottomContainer: {
    flexDirection: "column",
    zIndex: 1,
  },
  bankTransferHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.4),
  },
  bottomTitle: {
    flexDirection: "row",
    gap: getResponsiveWidth(2.4),
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveWidth(4.8),
    paddingTop: getResponsiveHeight(1.8),
    paddingBottom: getResponsiveHeight(1.2),
  },
});

export default DetailScreen;