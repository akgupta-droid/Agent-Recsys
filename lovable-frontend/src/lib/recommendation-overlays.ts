export interface OverlayRecommendation {
  name: string;
  category: string;
}

const OVERLAY_LABEL_IMAGES = [
  "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=150",
  "https://images.unsplash.com/photo-1600166898405-da9535204843?w=150",
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150",
] as const;

export const getOverlayLabelImageUrl = (index: number) => {
  return OVERLAY_LABEL_IMAGES[index] ?? OVERLAY_LABEL_IMAGES[OVERLAY_LABEL_IMAGES.length - 1];
};