import * as Haptics from 'expo-haptics';

export function triggerSelectionHaptic() {
  Haptics.selectionAsync();
}
