import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { t } from "@/i18n";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedButton } from "@/components/buttons/ThemedButton";
import { getIconPath } from "@/utils/returnIcon";
import { returnItemsByType } from "@/utils/returnItemData";
import {
  getResponsiveFontSize,
  getResponsiveWidth,
  getResponsiveHeight,
} from "@/utils/responsive";
import { MMKV } from "react-native-mmkv";
import { ThemedInput } from "@/components/Inputs";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface BankItem {
  code: string;
  name: string;
}

const storage = new MMKV();
const LAST_USED_BANK_KEY = "lastUsedBank";
const BATCH_SIZE = 20; // Load banks in batches

const BankSelectScreen = () => {
  const { currentTheme } = useTheme();
  const router = useRouter();
  const { banks: encodedBanks, selectedBankCode: initialSelectedBankCode } =
    useLocalSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [allBanks, setAllBanks] = useState<BankItem[]>([]);
  const [displayedBanks, setDisplayedBanks] = useState<BankItem[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(
    String(initialSelectedBankCode) || null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [currentBatch, setCurrentBatch] = useState(1);

  // --- Glass Style & Themed Colors ---
  const borderColor = useMemo(
    () =>
      currentTheme === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(200, 200, 200, 0.5)",
    [currentTheme]
  );

  const cardBackgroundColor = useMemo(
    () =>
      currentTheme === "light"
        ? Colors.light.cardBackground
        : Colors.dark.cardBackground,
    [currentTheme]
  );

  const iconColor = useMemo(
    () => (currentTheme === "light" ? Colors.light.icon : Colors.dark.icon),
    [currentTheme]
  );

  const bankNameStyle = useMemo(
    () => [
      styles.bankName,
      { color: currentTheme === "light" ? Colors.light.text : Colors.dark.text },
    ],
    [currentTheme]
  );

  // Initial load of banks data
  useEffect(() => {
    let banksData: BankItem[] = [];

    try {
      if (encodedBanks) {
        banksData = JSON.parse(String(encodedBanks)) as BankItem[];
      } else {
        banksData = returnItemsByType("vietqr");
      }
    } catch (e) {
      console.error("Error processing banks:", e);
      banksData = returnItemsByType("vietqr");
    }

    setAllBanks(banksData);
    setIsLoading(false);
  }, [encodedBanks]);

  // Handle batch display of banks
  useEffect(() => {
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = allBanks.filter(
        (bank) =>
          bank.name.toLowerCase().includes(lowerQuery) ||
          bank.code.toLowerCase().includes(lowerQuery)
      );
      setDisplayedBanks(filtered);
    } else {
      const endIndex = currentBatch * BATCH_SIZE;
      setDisplayedBanks(allBanks.slice(0, endIndex));
    }
  }, [allBanks, searchQuery, currentBatch]);

  const handleLoadMore = useCallback(() => {
    if (searchQuery === "" && displayedBanks.length < allBanks.length) {
      setCurrentBatch((prev) => prev + 1);
    }
  }, [searchQuery, displayedBanks.length, allBanks.length]);

  const handleBankSelect = useCallback(
    async (bankCode: string) => {
      setSelectedBankCode(bankCode);
      storage.set(LAST_USED_BANK_KEY, bankCode);

      let lowerCaseCode = bankCode.toLowerCase();
      if (lowerCaseCode === "vib") {
        lowerCaseCode = "vib-2";
      } else if (lowerCaseCode === "acb") {
        lowerCaseCode = "acb-biz";
      }
      const url = `https://dl.vietqr.io/pay?app=${lowerCaseCode}`;

      try {
        await Linking.openURL(url);
        router.back();
      } catch (err) {
        console.error("Failed to open URL:", err);
        router.back();
      }
    },
    [router]
  );

  const renderBankItem = useCallback(
    ({ item }: { item: BankItem }) => (
      <Pressable
        style={styles.bankItem}
        onPress={() => handleBankSelect(item.code)}
      >
        <View style={styles.bankIconContainer}>
          <Image
            source={getIconPath(item.code)}
            style={styles.bankIcon}
            resizeMode="contain"
          />
        </View>
        <ThemedText style={bankNameStyle}>{item.name}</ThemedText>
        <MaterialCommunityIcons
          name="chevron-right"
          size={getResponsiveFontSize(16)}
          color={iconColor}
        />
      </Pressable>
    ),
    [handleBankSelect, bankNameStyle, iconColor]
  );

  const renderFooter = useCallback(() => {
    if (isLoading && displayedBanks.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      );
    }
    return null;
  }, [isLoading, displayedBanks.length, iconColor]);

  const renderEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        {searchQuery ? (
          <ThemedText>{t("detailsScreen.noBanksFound")}</ThemedText>
        ) : isLoading ? (
          <ActivityIndicator
            size={getResponsiveFontSize(25)}
            color={iconColor}
          />
        ) : (
          <ThemedText>{t("detailsScreen.noBanksAvailable")}</ThemedText>
        )}
      </View>
    ),
    [searchQuery, isLoading, iconColor]
  );

  const keyExtractor = useCallback((item: BankItem) => item.code, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerWrapper}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
      </View>

      <View style={[styles.listWrapper, { borderColor: borderColor }]}>
        <View
          style={[
            styles.listBackgroundOverlay,
            { backgroundColor: cardBackgroundColor },
          ]}
        />
        <FlatList
          style={styles.listStyle}
          data={displayedBanks}
          renderItem={renderBankItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      </View>

      <View style={styles.bottomSearchWrapper}>
        <ThemedInput
          iconName="magnify"
          placeholder={t("detailsScreen.searchBank")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    position: "absolute",
    top: getResponsiveHeight(8.5),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  listWrapper: {
    flex: 1,
    marginTop: getResponsiveHeight(18), // Reduced margin
    marginHorizontal: getResponsiveWidth(3.6),
    borderRadius: getResponsiveWidth(4),
    borderWidth: 1,
    overflow: "hidden",
  },
  listBackgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  listStyle: {
    backgroundColor: "transparent",
  },
  listContent: {
    borderRadius: getResponsiveWidth(4),
    paddingVertical: getResponsiveHeight(1),
    paddingBottom: getResponsiveHeight(12), // Added padding for search bar
  },
  bottomSearchWrapper: {
    position: "absolute",
    bottom: getResponsiveHeight(3),
    left: getResponsiveWidth(3.6),
    right: getResponsiveWidth(3.6),
    zIndex: 10,
  },
  searchInput: {
    borderRadius: getResponsiveWidth(16),
    paddingVertical: getResponsiveHeight(1),
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveWidth(2.5),
    paddingVertical: getResponsiveHeight(1.8),
    paddingHorizontal: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(4),
    marginBottom: getResponsiveHeight(1.2),
  },
  bankIconContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(12),
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  bankIcon: {
    width: "60%",
    height: "60%",
  },
  bankName: {
    fontSize: getResponsiveFontSize(14),
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: getResponsiveHeight(3.6),
    minHeight: getResponsiveHeight(20),
  },
  footerLoader: {
    paddingVertical: getResponsiveHeight(2),
    alignItems: "center",
  },
});

export default BankSelectScreen;