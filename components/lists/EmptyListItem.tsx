import React from 'react';
import Animated from 'react-native-reanimated';
// import { styles } from './styles'; // Assuming you have a stylesheet
import { ThemedEmptyCard } from '@/components/cards';
import { t } from '@/i18n';
import { AnimatedStyle } from 'react-native-reanimated';
import { STATUSBAR_HEIGHT } from '@/constants/Statusbar';
import { NativeScrollEvent, NativeSyntheticEvent, StyleSheet } from 'react-native';

interface EmptyListItemProps {
    scrollHandler: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    emptyCardStyle: AnimatedStyle;
    onNavigateToEmptyScreen: () => void;
    onNavigateToScanScreen: () => void;
  }

const EmptyListItem: React.FC<EmptyListItemProps> = ({
  scrollHandler,
  emptyCardStyle,
  onNavigateToEmptyScreen,
  onNavigateToScanScreen,
}) => {
  return (
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
  );
};

const styles = StyleSheet.create({
    scrollContainer: {
        paddingTop: STATUSBAR_HEIGHT + 105,
        flex: 1,
      },
      emptyCard: {
        marginHorizontal: 15,
      },
})
export default EmptyListItem;