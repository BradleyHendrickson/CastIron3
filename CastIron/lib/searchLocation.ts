import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_LOCATION_KEY = '@castiron/search_location';

export type SearchLocation = {
  latitude: number;
  longitude: number;
};

export async function getSearchLocation(): Promise<SearchLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SearchLocation;
    if (
      typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSearchLocation(location: SearchLocation | null): Promise<void> {
  if (location) {
    await AsyncStorage.setItem(SEARCH_LOCATION_KEY, JSON.stringify(location));
  } else {
    await AsyncStorage.removeItem(SEARCH_LOCATION_KEY);
  }
}
