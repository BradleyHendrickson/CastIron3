import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../constants/theme';

type Props = {
  rating: number;
  size?: number;
  color?: string;
};

/** Renders rating as stars: 4.5 = 4 full + 1 half star */
export default function StarRating({ rating, size = 20, color = colors.accent }: Props) {
  if (rating <= 0 || isNaN(rating)) {
    return <Text style={[styles.placeholder, { fontSize: size }]}>—</Text>;
  }

  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.25;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <View style={styles.container}>
      {Array.from({ length: full }, (_, i) => (
        <MaterialCommunityIcons key={`f-${i}`} name="star" size={size} color={color} />
      ))}
      {hasHalf && (
        <MaterialCommunityIcons key="half" name="star-half-full" size={size} color={color} />
      )}
      {Array.from({ length: empty }, (_, i) => (
        <MaterialCommunityIcons key={`e-${i}`} name="star-outline" size={size} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeholder: {
    color: colors.textDim,
  },
});
