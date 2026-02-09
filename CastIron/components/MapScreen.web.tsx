import { useCallback, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { geocodeCity } from '../lib/geocode';
import { setSearchLocation, type SearchLocation } from '../lib/searchLocation';

type Props = {
  searchLocation: SearchLocation | null;
  onSearchLocationChange: (location: SearchLocation | null) => void;
  onBack?: () => void;
};

export default function MapScreen({ searchLocation, onSearchLocationChange, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [cityInput, setCityInput] = useState('');
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleUseMyLocation = useCallback(async () => {
    await setSearchLocation(null);
    onSearchLocationChange(null);
    setGeocodeError(null);
  }, [onSearchLocationChange]);

  const handleSearchCity = useCallback(async () => {
    setGeocodeError(null);
    setGeocodeLoading(true);
    try {
      const result = await geocodeCity(cityInput);
      if (result) {
        const loc: SearchLocation = { latitude: result.latitude, longitude: result.longitude };
        await setSearchLocation(loc);
        onSearchLocationChange(loc);
      } else {
        setGeocodeError('Could not find that city. Try a different search.');
      }
    } catch {
      setGeocodeError('Failed to look up location.');
    } finally {
      setGeocodeLoading(false);
    }
  }, [cityInput, onSearchLocationChange]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.webFallback}>
        <MaterialCommunityIcons name="map-marker" size={64} color={colors.accent} />
        <Text style={styles.webFallbackTitle}>Set search location</Text>
        <Text style={styles.webFallbackText}>
          Enter a city name to search for restaurants there, or use your device location on the app.
        </Text>
        <View style={styles.cityRow}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. San Francisco, Austin, London"
            placeholderTextColor={colors.textDim}
            value={cityInput}
            onChangeText={setCityInput}
            onSubmitEditing={handleSearchCity}
            editable={!geocodeLoading}
          />
          <TouchableOpacity
            style={[styles.searchButton, geocodeLoading && styles.searchButtonDisabled]}
            onPress={handleSearchCity}
            disabled={geocodeLoading || !cityInput.trim()}
          >
            {geocodeLoading ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <>
                <MaterialCommunityIcons name="magnify" size={20} color={colors.accentText} />
                <Text style={styles.buttonText}>Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {geocodeError ? (
          <Text style={styles.errorText}>{geocodeError}</Text>
        ) : null}
        {searchLocation ? (
          <View style={styles.badge}>
            <MaterialCommunityIcons name="map-marker" size={16} color={colors.accent} />
            <Text style={styles.badgeText}>Custom location set</Text>
          </View>
        ) : null}
        <View style={styles.webButtons}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  webFallbackText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  cityRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
    width: '100%',
    maxWidth: 400,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: 12,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  webButtons: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
    minWidth: 200,
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
});
