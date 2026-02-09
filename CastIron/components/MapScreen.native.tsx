import { useCallback, useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { colors } from '../constants/theme';
import { setSearchLocation, type SearchLocation } from '../lib/searchLocation';

type Props = {
  searchLocation: SearchLocation | null;
  onSearchLocationChange: (location: SearchLocation | null) => void;
  onBack?: () => void;
};

const DEFAULT_REGION = {
  latitude: 37.78825,
  longitude: -122.4324,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen({ searchLocation, onSearchLocationChange, onBack }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [deviceLocation, setDeviceLocation] = useState<SearchLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeviceLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const locCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setDeviceLocation(locCoords);
      setError(null);
      if (!searchLocation) {
        mapRef.current?.animateToRegion({
          ...locCoords,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  }, [searchLocation]);

  useEffect(() => {
    loadDeviceLocation();
  }, [loadDeviceLocation]);

  const handleMapPress = useCallback(
    async (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      const loc: SearchLocation = { latitude, longitude };
      await setSearchLocation(loc);
      onSearchLocationChange(loc);
    },
    [onSearchLocationChange],
  );

  const handleUseMyLocation = useCallback(async () => {
    await setSearchLocation(null);
    onSearchLocationChange(null);
    if (deviceLocation) {
      mapRef.current?.animateToRegion({
        ...deviceLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [onSearchLocationChange, deviceLocation]);

  const center = searchLocation ?? deviceLocation;
  const region = center
    ? {
        ...center,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_REGION;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={[styles.map, { width, height }]}
        initialRegion={region}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {searchLocation && (
          <Marker
            coordinate={searchLocation}
            title="Search location"
            description="Restaurants will be searched near here"
            pinColor={colors.accent}
          />
        )}
      </MapView>
      <View style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
        <View style={styles.instructionBg}>
          <Text style={styles.instruction}>Tap the map to set search location</Text>
        </View>
        {searchLocation ? (
          <View style={styles.badge}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.accent} />
            <Text style={styles.badgeText}>Custom location set</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.buttons, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.button} onPress={handleUseMyLocation}>
          <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.accentText} />
          <Text style={styles.buttonText}>Use my location</Text>
        </TouchableOpacity>
        {onBack ? (
          <TouchableOpacity style={styles.buttonSecondary} onPress={onBack}>
            <Text style={styles.buttonSecondaryText}>Back</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <View style={[styles.errorBanner, { top: insets.top + 60 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  instructionBg: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  instruction: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  buttons: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accentText,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loadingText: {
    color: colors.textDim,
    marginTop: 12,
    fontSize: 16,
  },
  errorBanner: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: 'rgba(200,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
