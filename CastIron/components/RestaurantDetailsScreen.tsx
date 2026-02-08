import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Restaurant } from '../types';
import { colors } from '../constants/theme';
import { fetchPlaceDetails, getPlacePhotoSource } from '../lib/restaurants';

function getMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
}

const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const HORIZONTAL_PADDING = 24;

type Props = {
  restaurant: Restaurant | null;
};

export default function RestaurantDetailsScreen({ restaurant }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [details, setDetails] = useState<{
    name: string;
    address: string;
    rating: number;
    userRatingCount: number;
    cuisine: string;
    photos: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxFade = useRef(new Animated.Value(0)).current;

  const loadDetails = useCallback(async (placeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPlaceDetails(placeId);
      setDetails({
        name: data.name,
        address: data.address,
        rating: data.rating,
        userRatingCount: data.userRatingCount,
        cuisine: data.cuisine,
        photos: data.photos,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load details');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      loadDetails(restaurant.id);
    } else {
      setDetails(null);
      setError(null);
    }
  }, [restaurant?.id, loadDetails]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    lightboxFade.setValue(0);
    Animated.timing(lightboxFade, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [lightboxFade]);

  const closeLightbox = useCallback(() => {
    Animated.timing(lightboxFade, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setLightboxIndex(null);
    });
  }, [lightboxFade]);

  if (!restaurant) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Swipe right on a restaurant to see details</Text>
      </View>
    );
  }

  const cuisine = details?.cuisine ?? restaurant.cuisine?.replace(/_/g, ' ') ?? 'Restaurant';
  const photos = details?.photos ?? restaurant.photos ?? [];
  const contentWidth = width - HORIZONTAL_PADDING * 2;
  const cellSize = (contentWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.details}>
        <Text style={styles.name}>{details?.name ?? restaurant.name}</Text>
        <Text style={styles.cuisine}>{cuisine}</Text>
        <View style={styles.ratingRow}>
          <View style={styles.ratingBadge}>
            <Text style={styles.rating}>
              ★ {(details?.rating ?? restaurant.rating)?.toFixed(1) ?? '—'}
            </Text>
          </View>
          {(details?.userRatingCount ?? restaurant.userRatingCount) != null && (
            <Text style={styles.reviewCount}>
              ({(details?.userRatingCount ?? restaurant.userRatingCount)} reviews)
            </Text>
          )}
        </View>
        <Text style={styles.address}>{details?.address ?? restaurant.address}</Text>
        <TouchableOpacity
          style={styles.mapsButton}
          onPress={() => Linking.openURL(getMapsUrl(restaurant.id))}
        >
          <MaterialCommunityIcons name="map-marker" size={20} color={colors.accentText} />
          <Text style={styles.mapsButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.photosSection}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingPhotos}>Loading photos...</Text>
        </View>
      ) : error ? (
        <View style={styles.photosSection}>
          <Text style={styles.photosError}>{error}</Text>
        </View>
      ) : photos.length > 0 ? (
        <View style={styles.photosSection}>
          <Text style={styles.photosSectionTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {photos.map((photoId, index) => (
              <TouchableOpacity
                key={photoId}
                activeOpacity={1}
                onPress={() => openLightbox(index)}
              >
                <Image
                  source={getPlacePhotoSource(restaurant.id, photoId, Math.round(cellSize * 2))}
                  style={[styles.photoCell, { width: cellSize, height: cellSize }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.photosSection}>
          <View style={[styles.photoPlaceholder, { width: cellSize * 2, height: cellSize }]}>
            <MaterialCommunityIcons name="image-outline" size={48} color={colors.textDim} />
            <Text style={styles.noPhotosText}>No photos available</Text>
          </View>
        </View>
      )}
    </ScrollView>

    <Modal
      visible={lightboxIndex != null}
      transparent
      animationType="none"
      onRequestClose={closeLightbox}
    >
      <View style={styles.lightboxOverlay}>
        <Animated.View style={[styles.lightboxContent, { opacity: lightboxFade }]}>
          {lightboxIndex != null && photos.length > 0 ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(id) => id}
              initialScrollIndex={Math.min(lightboxIndex, photos.length - 1)}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              style={styles.lightboxFlatList}
              contentContainerStyle={styles.lightboxFlatListContent}
              renderItem={({ item: photoId }) => (
                <View style={[styles.lightboxSlide, { width, height }]}>
                  <Image
                    source={getPlacePhotoSource(restaurant.id, photoId, 1200)}
                    style={styles.lightboxImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          ) : null}
          <TouchableOpacity
            style={[styles.lightboxCloseButton, { top: insets.top + 12 }]}
            onPress={closeLightbox}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <MaterialCommunityIcons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 48,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 16,
    textAlign: 'center',
  },
  photosSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  photosSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCell: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
  },
  photoPlaceholder: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotosText: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 8,
  },
  loadingPhotos: {
    color: colors.textDim,
    fontSize: 14,
    marginTop: 8,
  },
  photosError: {
    color: colors.textMuted,
    fontSize: 14,
  },
  details: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cuisine: {
    fontSize: 18,
    color: colors.textMuted,
    marginBottom: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  ratingBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rating: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accentText,
  },
  reviewCount: {
    fontSize: 16,
    color: colors.textDim,
  },
  address: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 24,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  mapsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentText,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContent: {
    width: '100%',
    flex: 1,
  },
  lightboxFlatList: {
    flex: 1,
    width: '100%',
  },
  lightboxFlatListContent: {
    flexGrow: 1,
  },
  lightboxSlide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    aspectRatio: 1,
  },
  lightboxCloseButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
    zIndex: 10,
  },
});
