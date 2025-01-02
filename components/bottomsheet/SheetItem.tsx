import React from 'react';
import { StyleSheet, View, Pressable, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Components
import { ThemedText } from '@/components/ThemedText';

// Utilities
import { getIconPath } from '@/utils/returnIcon';
import { getResponsiveFontSize, getResponsiveWidth, getResponsiveHeight } from '@/utils/responsive';

interface CategoryItem {
  display: string;
  value: 'store' | 'bank' | 'ewallet';
}

interface BrandItem {
  code: string;
  name: string;
  full_name: string;
  type: 'store' | 'bank' | 'ewallet';
}

interface MetadataTypeItem {
  display: string;
  value: 'qr' | 'barcode';
}

interface SheetItemProps {
  item: CategoryItem | BrandItem | MetadataTypeItem;
  isSelected: boolean;
  onPress: () => void;
  iconColors: string;
  textColors: string;
}

export const CategorySheetItem: React.FC<SheetItemProps> = ({ 
  item, 
  isSelected, 
  onPress, 
  iconColors,
  textColors 
}) => {
  const categoryItem = item as CategoryItem;
  return (
    <Pressable
      key={categoryItem.value}
      onPress={onPress}
      style={[styles.sheetItem, isSelected && styles.selectedItem]}
    >
      <MaterialCommunityIcons
        color={iconColors}
        size={getResponsiveFontSize(18)}
        name={
          categoryItem.value === 'store'
            ? 'store-outline'
            : categoryItem.value === 'bank'
              ? 'bank-outline'
              : 'wallet-outline'
        }
      />
      <ThemedText style={styles.sheetItemText}>{categoryItem.display}</ThemedText>
      {isSelected && (
        <MaterialCommunityIcons
          name="check"
          size={getResponsiveFontSize(20)}
          color={textColors}
          style={styles.checkIcon}
        />
      )}
    </Pressable>
  );
};

export const BrandSheetItem: React.FC<SheetItemProps> = ({ 
  item, 
  isSelected, 
  onPress,
  textColors 
}) => {
  const brandItem = item as BrandItem;
  return (
    <Pressable
      key={brandItem.code}
      onPress={onPress}
      style={[styles.sheetItem, isSelected && styles.selectedItem]}
    >
      <View style={styles.brandIconContainer}>
        <Image source={getIconPath(brandItem.code)} style={styles.brandIcon} />
      </View>
      <View style={styles.brandContentContainer}>
        <ThemedText type="defaultSemiBold" style={styles.brandText}>
          {brandItem.name}
        </ThemedText>
        <ThemedText numberOfLines={1} style={styles.brandFullName}>
          {brandItem.full_name}
        </ThemedText>
      </View>
      {isSelected && (
        <MaterialCommunityIcons
          name="check"
          size={getResponsiveFontSize(20)}
          color={textColors}
          style={styles.checkIcon}
        />
      )}
    </Pressable>
  );
};

export const MetadataTypeSheetItem: React.FC<SheetItemProps> = ({ 
  item, 
  isSelected, 
  onPress, 
  iconColors,
  textColors 
}) => {
  const metadataTypeItem = item as MetadataTypeItem;
  return (
    <Pressable
      key={metadataTypeItem.value}
      onPress={onPress}
      style={[styles.sheetItem, isSelected && styles.selectedItem]}
    >
      <MaterialCommunityIcons
        color={iconColors}
        size={getResponsiveFontSize(18)}
        name={metadataTypeItem.value === 'qr' ? 'qrcode-scan' : 'barcode-scan'}
      />
      <ThemedText style={styles.sheetItemText}>{metadataTypeItem.display}</ThemedText>
      {isSelected && (
        <MaterialCommunityIcons
          name="check"
          size={getResponsiveFontSize(20)}
          color={textColors}
          style={styles.checkIcon}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveWidth(3.6),
    // paddingVertical: getResponsiveHeight(1.2),
    // paddingHorizontal: getResponsiveWidth(2.4),
    borderRadius: getResponsiveWidth(4),
    overflow: 'hidden',
  },
  selectedItem: {
    // backgroundColor is handled by theme context
  },
  brandIconContainer: {
    width: getResponsiveWidth(9.6),
    height: getResponsiveWidth(9.6),
    borderRadius: getResponsiveWidth(12),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  brandContentContainer: {
    flexDirection: 'column',
    flexShrink: 1,
  },
  brandIcon: {
    width: '60%',
    height: '60%',
    resizeMode: 'contain',
  },
  brandText: {
    fontSize: getResponsiveFontSize(14),
  },
  brandFullName: {
    fontSize: getResponsiveFontSize(12),
    opacity: 0.6,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  sheetItemText: {
    fontSize: getResponsiveFontSize(16),
  },
});