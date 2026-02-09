import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Restaurant } from '../types';
import { colors } from '../constants/theme';
import { getProfile } from '../lib/profile';
import { fetchPlaceDetails, getPlacePhotoSource } from '../lib/restaurants';
import { supabase } from '../lib/supabase';
import StarRating from './StarRating';

function getMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
}

function formatDistance(meters: number): string {
  const feet = meters * 3.28084;
  if (feet >= 500) {
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi away`;
  }
  return `${Math.round(feet)} ft away`;
}

function formatPriceLevel(priceLevel?: string): string {
  if (!priceLevel) return '';
  if (priceLevel === 'PRICE_LEVEL_INEXPENSIVE') return '$';
  if (priceLevel === 'PRICE_LEVEL_MODERATE') return '$$';
  if (priceLevel === 'PRICE_LEVEL_EXPENSIVE') return '$$$';
  return '';
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
    priceLevel?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    openNow?: boolean;
    hours?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isTester, setIsTester] = useState(false);
  const lightboxFade = useRef(new Animated.Value(0)).current;

  const loadProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await getProfile(session.user.id);
      setIsTester(profile?.is_tester ?? false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
        priceLevel: data.priceLevel,
        nationalPhoneNumber: data.nationalPhoneNumber,
        websiteUri: data.websiteUri,
        openNow: data.openNow,
        hours: data.hours,
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
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [lightboxFade]);

  const closeLightbox = useCallback(() => {
    Animated.timing(lightboxFade, {
      toValue: 0,
      duration: 50,
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
  const heroPhotoId = photos[0];
  const rating = details?.rating ?? restaurant.rating ?? 0;

  return (
    <>
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero image */}
      <View style={[styles.heroContainer, { height: height * 0.35 }]}>
        {heroPhotoId ? (
          <Image
            source={getPlacePhotoSource(restaurant.id, heroPhotoId, 1200)}
            style={[styles.heroImage, { width, height: height * 0.35 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.heroPlaceholder, { width, height: height * 0.35 }]} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.heroInfo, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.heroName}>{details?.name ?? restaurant.name}</Text>
          <View style={styles.heroMetaRow}>
            <StarRating rating={rating} size={24} color="#fff" />
            {formatPriceLevel(details?.priceLevel ?? restaurant.priceLevel) ? (
              <Text style={styles.heroPrice}>{formatPriceLevel(details?.priceLevel ?? restaurant.priceLevel)}</Text>
            ) : null}
            {(details?.openNow ?? restaurant.openNow) != null && (
              <Text style={[styles.heroOpenStatus, (details?.openNow ?? restaurant.openNow) ? styles.heroOpenNow : styles.heroClosed]}>
                {(details?.openNow ?? restaurant.openNow) ? 'Open now' : 'Closed'}
              </Text>
            )}
          </View>
          <Text style={styles.heroCuisine}>{cuisine}</Text>
          {restaurant.distanceMeters != null && (
            <Text style={styles.heroDistance}>{formatDistance(restaurant.distanceMeters)}</Text>
          )}
        </View>
      </View>

      <View style={[styles.details, { paddingTop: 24 }]}>

        {isTester && restaurant.scoreBreakdown && (
          <View style={styles.scoreBreakdown}>
            <Text style={[styles.scoreBreakdownTitle, { marginTop: 4 }]}>
              Score: {restaurant.score != null ? restaurant.score : '—'}
            </Text>
            <Text style={[styles.scoreBreakdownLine, { fontWeight: '600'}]}>
              Breakdown
            </Text>
            <Text style={styles.scoreBreakdownLine}>
              Rating: {(details?.rating ?? restaurant.rating)?.toFixed(1) ?? '—'}
            </Text>
            <Text style={styles.scoreBreakdownLine}>
              Base (rating × 20): {restaurant.scoreBreakdown.base}
            </Text>
            {restaurant.scoreBreakdown.interactionType === 'like' && (
              <Text style={styles.scoreBreakdownLine}>Liked: +50</Text>
            )}
            {restaurant.scoreBreakdown.interactionType === 'unlike' && (
              <Text style={styles.scoreBreakdownLine}>Unliked: −30</Text>
            )}
            {restaurant.scoreBreakdown.timeSpent > 0 && restaurant.scoreBreakdown.interactionType !== 'unlike' && (
              <Text style={styles.scoreBreakdownLine}>
                View time: +{restaurant.scoreBreakdown.timeSpent}
              </Text>
            )}
          </View>
        )}
        {(details?.userRatingCount ?? restaurant.userRatingCount) != null && (
          <Text style={styles.reviewCount}>
            {(details?.userRatingCount ?? restaurant.userRatingCount)} reviews
          </Text>
        )}
        <Text style={styles.address}>{details?.address ?? restaurant.address}</Text>

        {details?.nationalPhoneNumber ? (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${details.nationalPhoneNumber}`)}
          >
            <MaterialCommunityIcons name="phone" size={20} color={colors.accent} />
            <Text style={styles.contactText}>{details.nationalPhoneNumber}</Text>
          </TouchableOpacity>
        ) : null}

        {details?.websiteUri ? (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(details.websiteUri!)}
          >
            <MaterialCommunityIcons name="web" size={20} color={colors.accent} />
            <Text style={styles.contactText}>Visit website</Text>
          </TouchableOpacity>
        ) : null}

        {details?.hours && details.hours.length > 0 ? (
          <View style={styles.hoursSection}>
            <Text style={styles.hoursTitle}>Hours</Text>
            {details.hours.map((line, i) => (
              <Text key={i} style={styles.hoursLine}>{line}</Text>
            ))}
          </View>
        ) : null}

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
    </Animated.ScrollView>

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
              decelerationRate={0.9}
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
  heroContainer: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  heroPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: colors.surfaceSecondary,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  heroName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCuisine: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
  },
  heroDistance: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  heroPrice: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  heroOpenStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroOpenNow: {
    color: '#4ade80',
  },
  heroClosed: {
    color: 'rgba(255,255,255,0.7)',
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
  score: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  scoreBreakdown: {
    backgroundColor: colors.surfaceSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  scoreBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  scoreBreakdownLine: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
  },
  reviewCount: {
    fontSize: 16,
    color: colors.textDim,
    marginBottom: 12,
  },
  address: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: colors.accent,
    flex: 1,
  },
  hoursSection: {
    marginBottom: 24,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  hoursLine: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 2,
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
