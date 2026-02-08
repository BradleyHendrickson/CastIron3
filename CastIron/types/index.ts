export type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  address: string;
  userRatingCount?: number;
  photos?: string[];
  distanceMeters?: number;
  priceLevel?: string;
  openNow?: boolean;
  score?: number;
  scoreBreakdown?: {
    base: number;
    interaction: number;
    timeSpent: number;
    interactionType: 'like' | 'skip' | 'unlike' | null;
  };
};
