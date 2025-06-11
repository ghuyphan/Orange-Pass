import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUnmountBrightness } from '@reeq/react-native-device-brightness';
import { ThemedView } from '@/components/ThemedView';
import { ThemedButton } from '@/components/buttons/ThemedButton';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import QRRecord from '@/types/qrType'; // Ensure this type matches the structure of 'item'
import { ThemedText } from '@/components/ThemedText';
import { ThemedVietQRCard } from '@/components/cards/ThemedVietQR';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';

export default function CreateQRScreen() {
  // Destructure with new names to avoid confusion before processing
  const {
    metadata: rawMetadata,
    amount: rawAmount,
    originalItem: encodedItem,
  } = useLocalSearchParams();
  const router = useRouter();

  useUnmountBrightness(0.8, true);

  const item: QRRecord | null = useMemo(() => {
    if (!encodedItem || typeof encodedItem !== 'string') {
      if (encodedItem) {
        console.error(
          'Failed to parse item: encodedItem is not a string.',
          encodedItem,
        );
      }
      return null;
    }
    try {
      return JSON.parse(decodeURIComponent(encodedItem));
    } catch (error) {
      console.error('Failed to parse item:', error);
      return null;
    }
  }, [encodedItem]);

  // Process metadata to ensure it's a string
  const metadataString: string = useMemo(() => {
    if (Array.isArray(rawMetadata)) {
      return rawMetadata.length > 0 ? rawMetadata[0] : ''; // Use first or default
    }
    return rawMetadata || ''; // Use value or default if undefined/null
  }, [rawMetadata]);

  // Process amount to ensure it's string | undefined
  const amountString: string | undefined = useMemo(() => {
    if (Array.isArray(rawAmount)) {
      return rawAmount.length > 0 ? rawAmount[0] : undefined; // Use first or undefined
    }
    return rawAmount || undefined; // Use value or undefined if null/empty string
  }, [rawAmount]);

  if (!item) {
    return (
      <ThemedView style={styles.loadingWrapper}>
        <ThemedText>QR data is not available or invalid.</ThemedText>
        <ThemedButton
          onPress={router.back}
          style={{ marginTop: getResponsiveHeight(2) }}
        />
      </ThemedView>
    );
  }

  // ThemedVietQRCard expects 'type' to be 'bank' | 'store' | 'ewallet' | 'vietqr'
  // Ensure item.type conforms to this. If QRRecord['type'] is broader, you might need casting or validation.
  const cardType = item.type as 'bank' | 'store' | 'ewallet' | 'vietqr';

  return (
    <ThemedView style={styles.mainContainer}>
      <View style={styles.headerWrapper}>
        <ThemedButton onPress={router.back} iconName="chevron-left" />
      </View>
      <ThemedVietQRCard
        style={styles.pinnedCardWrapper}
        code={item.code}
        type={cardType} // Use the validated/cast type
        metadata={metadataString} // Pass the processed string
        accountName={item.account_name}
        accountNumber={item.account_number}
        amount={amountString} // Pass the processed string or undefined
      />
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingHorizontal: getResponsiveWidth(3.6),
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveWidth(4.8),
  },
  headerWrapper: {
    paddingTop: STATUSBAR_HEIGHT + getResponsiveHeight(4.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveHeight(3.6),
  },
  pinnedCardWrapper: {
    marginTop: getResponsiveHeight(0.3),
    marginBottom: getResponsiveHeight(3.6),
  },
  cardWrapper: { // This style seems unused in the provided component logic
    marginTop: getResponsiveHeight(2.4),
    padding: getResponsiveWidth(4.8),
    borderRadius: getResponsiveWidth(2.8),
    marginBottom: getResponsiveHeight(1.2),
  },
});
