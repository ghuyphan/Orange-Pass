import React from 'react';
import Animated from 'react-native-reanimated';
import { ThemedEmptyCard } from '@/components/cards';
import { AnimatedStyle } from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet } from 'react-native';
import { getResponsiveHeight, getResponsiveWidth } from '@/utils/responsive';
import { useLocale } from '@/context/LocaleContext';
import { t } from '@/i18n';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/utils/storage';

interface EmptyListItemProps {
  scrollHandler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  emptyCardStyle: AnimatedStyle;
  onNavigateToEmptyScreen: () => void;
  onNavigateToScanScreen: () => void;
  dropdownOptions: { label: string; onPress: () => void }[];
}

const EmptyListItem: React.FC<EmptyListItemProps> = ({
  scrollHandler,
  emptyCardStyle,
  onNavigateToEmptyScreen,
  onNavigateToScanScreen,
  dropdownOptions,
}) => {
  const { updateLocale } = useLocale();
  const [locale, setLocale] = useMMKVString('locale', storage);

  return (
    <Animated.ScrollView
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={styles.scrollContainer}
    >
      <Animated.View style={[styles.emptyCard, emptyCardStyle]}>
        <ThemedEmptyCard
          headerLabel="homeScreen.emptyCard.header"
          footerLabel="homeScreen.emptyCard.footer"
          footButtonLabel="homeScreen.emptyCard.footerButton"
          // headerLabel={headerLabel}
          // footerLabel={footerLabel}
          // footButtonLabel={footButtonLabel}
          cardOnPress={onNavigateToEmptyScreen}
          buttonOnPress={onNavigateToScanScreen}
          dropdownOptions={dropdownOptions}
        />
      </Animated.View>
    </Animated.ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    paddingTop: getResponsiveHeight(18),
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: getResponsiveWidth(3.6),
  },
});

export default EmptyListItem;