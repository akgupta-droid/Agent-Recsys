import type { StylePhilosophy, BudgetTier } from "@/context/DesignContext";

export interface CuratedProduct {
  name: string;
  price: number;
  category: "Living Room" | "Lighting" | "Decor";
  why: string;
  gradient: string; // tailwind gradient classes
  emoji: string;
  shopUrl?: string;
}

export const PRODUCTS_BY_STYLE: Record<StylePhilosophy, CuratedProduct[]> = {
  "Japandi Zen": [
    {
      name: "Kano Slim 2-Seat Sofa",
      price: 420,
      category: "Living Room",
      why: "Slim 2-seater — fits narrow rooms without blocking walkways",
      gradient: "from-stone-200 via-amber-100 to-stone-300",
      emoji: "🛋️",
      shopUrl: "https://www.wayfair.com/keyword.php?keyword=japandi+sofa",
    },
    {
      name: "Mori Round Coffee Table",
      price: 85,
      category: "Decor",
      why: "Solid oak, 28 inch diameter — soft edges keep small rooms safe",
      gradient: "from-amber-100 via-orange-100 to-stone-200",
      emoji: "🪵",
      shopUrl: "https://www.ikea.com/us/en/p/jakobsfors-coffee-table-oak-veneer-90500121/",
    },
    {
      name: "Luna Arc Floor Lamp",
      price: 75,
      category: "Lighting",
      why: "Brass finish, rice paper shade — diffuses warm light without glare",
      gradient: "from-yellow-100 via-amber-200 to-stone-300",
      emoji: "💡",
      shopUrl: "https://www.amazon.com/s?k=japandi+arc+floor+lamp",
    },
  ],
  "Modern Minimalist": [
    {
      name: "Luca Low Profile Sofa",
      price: 450,
      category: "Living Room",
      why: "Low profile silhouette — keeps sightlines open in compact spaces",
      gradient: "from-slate-200 via-zinc-100 to-slate-300",
      emoji: "🛋️",
      shopUrl: "https://www.wayfair.com/keyword.php?keyword=modern+minimalist+sofa",
    },
    {
      name: "Nova Glass Side Table",
      price: 95,
      category: "Decor",
      why: "Tempered glass, minimal frame — visually disappears beside the sofa",
      gradient: "from-zinc-100 via-slate-100 to-zinc-200",
      emoji: "🪟",
      shopUrl: "https://www.ikea.com/us/en/cat/coffee-tables-10716/",
    },
    {
      name: "Beam LED Floor Lamp",
      price: 65,
      category: "Lighting",
      why: "Matte black, adjustable head — directs light exactly where you need it",
      gradient: "from-slate-300 via-zinc-200 to-slate-400",
      emoji: "💡",
      shopUrl: "https://www.amazon.com/s?k=modern+minimalist+LED+floor+lamp",
    },
  ],
  "Mid-Century Warm": [
    {
      name: "Eames-Inspired Lounge Sofa",
      price: 460,
      category: "Living Room",
      why: "Tapered walnut legs lift the frame — feels lighter in tight rooms",
      gradient: "from-orange-200 via-amber-300 to-yellow-200",
      emoji: "🛋️",
    },
    {
      name: "Atomic Walnut Side Table",
      price: 120,
      category: "Decor",
      why: "Hairpin legs and warm walnut — adds mid-century character without bulk",
      gradient: "from-amber-300 via-orange-200 to-yellow-300",
      emoji: "🪑",
    },
    {
      name: "Sputnik Tripod Floor Lamp",
      price: 110,
      category: "Lighting",
      why: "Brass tripod base — period-correct silhouette, modern LED bulb",
      gradient: "from-yellow-200 via-amber-300 to-orange-300",
      emoji: "💡",
    },
  ],
  "Bohemian Eclectic": [
    {
      name: "Marrakech Tufted Loveseat",
      price: 470,
      category: "Living Room",
      why: "Layered upholstery anchors a maximalist palette without feeling busy",
      gradient: "from-rose-200 via-orange-200 to-amber-200",
      emoji: "🛋️",
    },
    {
      name: "Rattan Pouf Ottoman",
      price: 95,
      category: "Decor",
      why: "Doubles as seating or footrest — flexible for hosting friends",
      gradient: "from-amber-200 via-rose-200 to-pink-200",
      emoji: "🧺",
    },
    {
      name: "Macramé Pendant Lamp",
      price: 95,
      category: "Lighting",
      why: "Hand-knotted shade casts patterned light — instant boho atmosphere",
      gradient: "from-orange-200 via-rose-300 to-amber-200",
      emoji: "💡",
    },
  ],
  "Industrial Loft": [
    {
      name: "Foundry Leather Sofa",
      price: 480,
      category: "Living Room",
      why: "Distressed leather + steel frame — wears in rather than out over time",
      gradient: "from-stone-400 via-zinc-500 to-stone-600",
      emoji: "🛋️",
      shopUrl: "https://www.wayfair.com/keyword.php?keyword=industrial+leather+sofa",
    },
    {
      name: "Reclaimed Wood Crate Table",
      price: 110,
      category: "Decor",
      why: "Caster wheels — easy to roll out of the way in open lofts",
      gradient: "from-stone-500 via-amber-700 to-stone-600",
      emoji: "📦",
      shopUrl: "https://www.amazon.com/s?k=industrial+reclaimed+wood+coffee+table",
    },
    {
      name: "Edison Cage Floor Lamp",
      price: 85,
      category: "Lighting",
      why: "Exposed bulb in metal cage — warm filament glow against raw textures",
      gradient: "from-zinc-400 via-stone-500 to-zinc-600",
      emoji: "💡",
      shopUrl: "https://www.amazon.com/s?k=edison+cage+floor+lamp+industrial",
    },
  ],
  "Coastal Bright": [
    {
      name: "Sandbar White Linen Sofa",
      price: 450,
      category: "Living Room",
      why: "Slipcovered linen — washable for sandy feet and sunny afternoons",
      gradient: "from-sky-100 via-blue-100 to-cyan-100",
      emoji: "🛋️",
    },
    {
      name: "Driftwood Coffee Table",
      price: 120,
      category: "Decor",
      why: "Bleached oak finish — bounces natural light around the room",
      gradient: "from-blue-100 via-sky-200 to-cyan-200",
      emoji: "🌊",
    },
    {
      name: "Rope Pendant Floor Lamp",
      price: 80,
      category: "Lighting",
      why: "Jute-wrapped stem with linen shade — soft glow for breezy evenings",
      gradient: "from-cyan-100 via-sky-100 to-blue-200",
      emoji: "💡",
    },
  ],
};

export function parseBudget(b: BudgetTier | undefined): { min: number; max: number; label: string } {
  switch (b) {
    case "Under $500": return { min: 0, max: 500, label: "Under $500" };
    case "$500–$700": return { min: 500, max: 700, label: "$500–$700" };
    case "$700–$1000": return { min: 700, max: 1000, label: "$700–$1000" };
    case "$1000+": return { min: 1000, max: 2000, label: "$1000+" };
    default: return { min: 500, max: 700, label: "$500–$700" };
  }
}

export function getProductsForStyle(style: StylePhilosophy | undefined): CuratedProduct[] {
  return PRODUCTS_BY_STYLE[style ?? "Japandi Zen"] ?? PRODUCTS_BY_STYLE["Japandi Zen"];
}

function categoryKeyword(category: CuratedProduct["category"]): string {
  if (category === "Lighting") return "floor lamp";
  if (category === "Living Room") return "sofa";
  return "coffee table";
}

export function getShopUrl(style: StylePhilosophy | undefined, product: CuratedProduct): string {
  if (product.shopUrl) return product.shopUrl;
  const styleKeyword = (style ?? "modern").toLowerCase().split(" ")[0];
  const itemKeyword = categoryKeyword(product.category);
  const q = encodeURIComponent(`${styleKeyword} ${itemKeyword}`).replace(/%20/g, "+");
  return `https://www.wayfair.com/keyword.php?keyword=${q}`;
}

export type ShopStore = "Wayfair" | "West Elm" | "Target" | "Etsy";

const STORE_ROTATION: { store: ShopStore; label: string; build: (q: string) => string }[] = [
  { store: "Wayfair", label: "Shop on Wayfair", build: (q) => `https://www.wayfair.com/keyword.php?keyword=${q}` },
  { store: "West Elm", label: "Shop on West Elm", build: (q) => `https://www.westelm.com/search/results.html?words=${q}` },
  { store: "Target", label: "Shop on Target", build: (q) => `https://www.target.com/s?searchTerm=${q}` },
  { store: "Etsy", label: "Shop on Etsy", build: (q) => `https://www.etsy.com/search?q=${q}` },
];

export function getStoreLink(
  product: CuratedProduct,
  style: StylePhilosophy | undefined,
  index: number = 0,
): { store: ShopStore; url: string; label: string } {
  const q = encodeURIComponent(`${product.name} ${style ?? ""}`.trim());
  const slot = STORE_ROTATION[index % STORE_ROTATION.length];
  return { store: slot.store, url: slot.build(q), label: slot.label };
}