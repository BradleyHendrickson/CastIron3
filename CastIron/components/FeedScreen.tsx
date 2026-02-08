import { useCallback, useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Restaurant } from '../types';
import { colors } from '../constants/theme';
import {
  addBookmark,
  fetchRestaurants,
  getBookmarkedPlaceIds,
  recordInteraction,
  removeBookmark,
} from '../lib/restaurants';

function getMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
}

const ICON_SIZE = 36;

function ActionBar({
  onLike,
  onUnlike,
  onBookmark,
  onUnbookmark,
  onShare,
  onProfile,
  liked,
  bookmarked,
  likeScaleAnim,
  profileInitial,
}: {
  onLike: () => void;
  onUnlike: () => void;
  onBookmark: () => void;
  onUnbookmark: () => void;
  onShare: () => void;
  onProfile: () => void;
  liked: boolean;
  bookmarked: boolean;
  likeScaleAnim: Animated.Value;
  profileInitial: string;
}) {
  const insets = useSafeAreaInsets();

  const handleToggleLike = useCallback(() => {
    if (liked) {
      onUnlike();
    } else {
      onLike();
      Animated.sequence([
        Animated.timing(likeScaleAnim, {
          toValue: 1.4,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.spring(likeScaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [liked, onLike, onUnlike, likeScaleAnim]);

  return (
    <View style={[styles.actionBar, { bottom: insets.bottom + 56 }]}>
      <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
        <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
          <MaterialCommunityIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={ICON_SIZE}
            color={liked ? '#e74c3c' : colors.textMuted}
          />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={bookmarked ? onUnbookmark : onBookmark}>
        <MaterialCommunityIcons
          name={bookmarked ? 'bookmark' : 'bookmark-outline'}
          size={ICON_SIZE}
          color={bookmarked ? colors.accent : colors.textMuted}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={onShare}>
        <MaterialCommunityIcons
          name="share-variant"
          size={ICON_SIZE}
          color={colors.text}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileCircle} onPress={onProfile}>
        <Text style={styles.profileCircleText}>{profileInitial}</Text>
      </TouchableOpacity>
    </View>
  );
}

function RestaurantCard({
  restaurant,
  onLike,
  onUnlike,
  onBookmark,
  onUnbookmark,
  onShare,
  onProfile,
  liked,
  bookmarked,
  profileInitial,
}: {
  restaurant: Restaurant;
  onLike: () => void;
  onUnlike: () => void;
  onBookmark: () => void;
  onUnbookmark: () => void;
  onShare: () => void;
  onProfile: () => void;
  liked: boolean;
  bookmarked: boolean;
  profileInitial: string;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const cuisine =
    restaurant.cuisine?.replace(/_/g, ' ') ?? 'Restaurant';

  return (
    <View style={[styles.card, { height }]}>
      <View style={[styles.cardContent, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.cuisine}>{cuisine}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>★ {restaurant.rating?.toFixed(1) ?? '—'}</Text>
        </View>
        <Text style={styles.address}>{restaurant.address}</Text>
      </View>
      <ActionBar
        onLike={onLike}
        onUnlike={onUnlike}
        onBookmark={onBookmark}
        onUnbookmark={onUnbookmark}
        onShare={onShare}
        onProfile={onProfile}
        liked={liked}
        bookmarked={bookmarked}
        likeScaleAnim={likeScaleAnim}
        profileInitial={profileInitial}
      />
    </View>
  );
}

type FeedScreenProps = {
  onProfilePress?: () => void;
  onCurrentRestaurantChange?: (restaurant: Restaurant | null) => void;
  profileInitial?: string;
};

export default function FeedScreen({
  onProfilePress,
  onCurrentRestaurantChange,
  profileInitial = '?',
}: FeedScreenProps = {}) {
  const { height } = useWindowDimensions();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const viewStartRef = useRef<number>(Date.now());
  const currentIndexRef = useRef(0);

  const loadRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby restaurants.');
        setRestaurants([]);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;
      const [data, bookmarks] = await Promise.all([
        fetchRestaurants(latitude, longitude),
        getBookmarkedPlaceIds(),
      ]);
      setRestaurants(data);
      setBookmarkedIds(bookmarks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load restaurants');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    if (restaurants.length > 0 && currentIndexRef.current === 0) {
      onCurrentRestaurantChange?.(restaurants[0]);
    } else if (restaurants.length === 0) {
      onCurrentRestaurantChange?.(null);
    }
  }, [restaurants, onCurrentRestaurantChange]);

  const recordViewEnd = useCallback(
    async (index: number, action: 'like' | 'skip' | 'unlike') => {
      const restaurant = restaurants[index];
      if (!restaurant) return;
      const timeSpentMs = Date.now() - viewStartRef.current;
      await recordInteraction(restaurant.id, action, timeSpentMs);
    },
    [restaurants]
  );

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
      const visible = viewableItems[0];
      if (visible?.index == null) return;
      const newIndex = visible.index;
      const prevIndex = currentIndexRef.current;
      if (prevIndex !== newIndex) {
        recordViewEnd(prevIndex, 'skip').catch(() => {});
        currentIndexRef.current = newIndex;
        viewStartRef.current = Date.now();
      }
      onCurrentRestaurantChange?.(restaurants[newIndex] ?? null);
    },
    [recordViewEnd, onCurrentRestaurantChange, restaurants]
  );

  const handleShare = useCallback((restaurant: Restaurant) => {
    const url = getMapsUrl(restaurant.id);
    Share.share({
      message: `Check out ${restaurant.name}!\n${url}`,
      url: url,
      title: restaurant.name,
    });
  }, []);

  const handleBookmark = useCallback((placeId: string) => {
    addBookmark(placeId);
    setBookmarkedIds((prev) => new Set(prev).add(placeId));
  }, []);

  const handleUnbookmark = useCallback((placeId: string) => {
    removeBookmark(placeId);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      next.delete(placeId);
      return next;
    });
  }, []);

  const handleLike = useCallback(
    async (index: number) => {
      const restaurant = restaurants[index];
      if (restaurant) setLikedIds((prev) => new Set(prev).add(restaurant.id));
      viewStartRef.current = Date.now();
      await recordViewEnd(index, 'like');
    },
    [recordViewEnd, restaurants]
  );

  const handleUnlike = useCallback(
    async (index: number) => {
      const restaurant = restaurants[index];
      if (restaurant) {
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(restaurant.id);
          return next;
        });
      }
      viewStartRef.current = Date.now();
      await recordViewEnd(index, 'unlike');
    },
    [recordViewEnd, restaurants]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Restaurant; index: number }) => (
      <RestaurantCard
        restaurant={item}
        onLike={() => handleLike(index)}
        onUnlike={() => handleUnlike(index)}
        onBookmark={() => handleBookmark(item.id)}
        onUnbookmark={() => handleUnbookmark(item.id)}
        onShare={() => handleShare(item)}
        onProfile={() => onProfilePress?.()}
        liked={likedIds.has(item.id)}
        bookmarked={bookmarkedIds.has(item.id)}
        profileInitial={profileInitial}
      />
    ),
    [handleLike, handleUnlike, handleBookmark, handleUnbookmark, handleShare, onProfilePress, likedIds, bookmarkedIds, profileInitial]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height]
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 80,
    minimumViewTime: 100,
  }).current;

  if (loading && restaurants.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Finding restaurants near you...</Text>
      </View>
    );
  }

  if (error && restaurants.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={loadRestaurants}>
          Retry
        </Text>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No restaurants found nearby.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textDim,
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 16,
  },
  retryText: {
    color: colors.accent,
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSecondary,
  },
  cardContent: {
    padding: 24,
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  cuisine: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: 16,
  },
  ratingContainer: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accentText,
  },
  address: {
    fontSize: 16,
    color: colors.textDim,
  },
  actionBar: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
    gap: 28,
  },
  actionButton: {
    alignItems: 'center',
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  profileCircleText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDim,
  },
  actionLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
