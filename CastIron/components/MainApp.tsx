import { useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { triggerSelectionHaptic } from '../lib/haptics';
import { Session } from '@supabase/supabase-js';
import type { Restaurant } from '../types';
import FeedScreen from './FeedScreen';
import ProfileScreen from './ProfileScreen';
import RestaurantDetailsScreen from './RestaurantDetailsScreen';

function getProfileInitial(user: { user_metadata?: { full_name?: string; name?: string }; email?: string }): string {
  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    '';
  return name.charAt(0).toUpperCase() || '?';
}

type Props = {
  session: Session;
  onSignOut: () => void;
};

export default function MainApp({ session, onSignOut }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currentPageRef = useRef(0);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / width);
    if (newPage !== currentPageRef.current) {
      currentPageRef.current = newPage;
      if (Platform.OS !== 'web') {
        triggerSelectionHaptic();
      }
    }
  };

  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScrollEndDrag={handleScrollEnd}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      >
        <View style={[styles.page, { width }]}>
          <FeedScreen
            onProfilePress={() => setProfileModalVisible(true)}
            onCurrentRestaurantChange={setCurrentRestaurant}
            profileInitial={getProfileInitial(session.user)}
          />
        </View>
        <View style={[styles.page, { width }]}>
          <RestaurantDetailsScreen restaurant={currentRestaurant} />
        </View>
      </ScrollView>
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={[styles.modalClose, { top: insets.top + 8 }]}
            onPress={() => setProfileModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>Done</Text>
          </Pressable>
          <ProfileScreen
            user={session.user}
            isVisible={profileModalVisible}
            onSignOut={() => {
              onSignOut();
              setProfileModalVisible(false);
            }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  pagerContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalClose: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  modalCloseText: {
    color: '#e8b923',
    fontSize: 16,
    fontWeight: '600',
  },
});
