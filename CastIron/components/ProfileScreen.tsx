import { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';
import { colors } from '../constants/theme';
import {
  getBookmarkedPlaces,
  getLikedPlaces,
  removeBookmark,
  type PlaceSummary,
} from '../lib/restaurants';

function getMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
}

type Props = {
  user: User;
  isVisible?: boolean;
  onSignOut: () => void;
};

type Tab = 'liked' | 'bookmarked';

function getDisplayName(user: User): string {
  return (
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'User'
  );
}

function PlaceItem({
  place,
  onRemove,
}: {
  place: PlaceSummary;
  onRemove?: (placeId: string) => void;
}) {
  return (
    <View style={styles.placeItem}>
      <TouchableOpacity
        style={styles.placeItemContent}
        onPress={() => Linking.openURL(getMapsUrl(place.id))}
        activeOpacity={0.7}
      >
        <Text style={styles.placeName} numberOfLines={1}>
          {place.name}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDim} />
      </TouchableOpacity>
      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(place.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="bookmark-off" size={22} color={colors.textDim} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ProfileScreen({ user, isVisible = true, onSignOut }: Props) {
  const displayName = getDisplayName(user);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('liked');
  const [liked, setLiked] = useState<PlaceSummary[]>([]);
  const [bookmarked, setBookmarked] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const [likedData, bookmarkedData] = await Promise.all([
        getLikedPlaces(),
        getBookmarkedPlaces(),
      ]);
      setLiked(likedData);
      setBookmarked(bookmarkedData);
    } catch {
      setLiked([]);
      setBookmarked([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) loadPlaces();
  }, [isVisible, loadPlaces]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlaces();
    setRefreshing(false);
  }, [loadPlaces]);

  const handleRemoveBookmark = useCallback(async (placeId: string) => {
    await removeBookmark(placeId);
    setBookmarked((prev) => prev.filter((p) => p.id !== placeId));
  }, []);

  const places = activeTab === 'liked' ? liked : bookmarked;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {user.email && <Text style={styles.email}>{user.email}</Text>}
        <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'liked' && styles.tabActive]}
          onPress={() => setActiveTab('liked')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="heart"
            size={18}
            color={activeTab === 'liked' ? '#e74c3c' : colors.textDim}
          />
          <Text style={[styles.tabText, activeTab === 'liked' && styles.tabTextActive]}>
            Liked {liked.length > 0 ? `(${liked.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bookmarked' && styles.tabActive]}
          onPress={() => setActiveTab('bookmarked')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="bookmark"
            size={18}
            color={activeTab === 'bookmarked' ? colors.accent : colors.textDim}
          />
          <Text style={[styles.tabText, activeTab === 'bookmarked' && styles.tabTextActive]}>
            Bookmarked {bookmarked.length > 0 ? `(${bookmarked.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContent}>
        {loading ? (
          <Text style={styles.sectionEmpty}>Loading...</Text>
        ) : places.length === 0 ? (
          <Text style={styles.sectionEmpty}>
            {activeTab === 'liked' ? 'No liked restaurants yet' : 'No bookmarked restaurants yet'}
          </Text>
        ) : (
          places.map((place) => (
            <PlaceItem
              key={place.id}
              place={place}
              onRemove={activeTab === 'bookmarked' ? handleRemoveBookmark : undefined}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: colors.textDim,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: colors.textDim,
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: colors.textDim,
    fontSize: 13,
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDim,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabContent: {
    minHeight: 120,
  },
  sectionEmpty: {
    fontSize: 15,
    color: colors.textDim,
    paddingVertical: 8,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  placeItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  placeName: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
});
