export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  address: string;
  userRatingCount?: number;
  photos?: string[];
};
