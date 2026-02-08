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
        <View style={styles.placeInfo}>
          <Text style={styles.placeName} numberOfLines={1}>
            {place.name}
          </Text>
          {(place.city || place.state) && (
            <Text style={styles.placeLocation} numberOfLines={1}>
              {[place.city, place.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
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
  const [bookmarked, setBookmarked] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const bookmarkedData = await getBookmarkedPlaces();
      setBookmarked(bookmarkedData);
    } catch {
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

      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="bookmark" size={20} color={colors.accent} />
        <Text style={styles.sectionTitle}>
          Bookmarked {bookmarked.length > 0 ? `(${bookmarked.length})` : ''}
        </Text>
      </View>

      <View style={styles.tabContent}>
        {loading ? (
          <Text style={styles.sectionEmpty}>Loading...</Text>
        ) : bookmarked.length === 0 ? (
          <Text style={styles.sectionEmpty}>No bookmarked restaurants yet</Text>
        ) : (
          bookmarked.map((place) => (
            <PlaceItem
              key={place.id}
              place={place}
              onRemove={handleRemoveBookmark}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  placeInfo: {
    flex: 1,
    marginRight: 12,
  },
  placeLocation: {
    fontSize: 13,
    color: colors.textDim,
    marginTop: 2,
  },
  removeButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  placeName: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
});
