import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type RoomType = "Living Room" | "Bedroom" | "Kitchen" | "Dining Room" | "Home Office";
export type LightingMood = "Bright & airy" | "Warm & cozy" | "Dim & moody";
export type StylePhilosophy =
  | "Modern Minimalist"
  | "Mid-Century Warm"
  | "Japandi Zen"
  | "Bohemian Eclectic"
  | "Industrial Loft"
  | "Coastal Bright";
export type BudgetTier = "Under $500" | "$500–$700" | "$700–$1000" | "$1000+";

export interface DesignBrief {
  roomType: RoomType;
  wallColor: string; // hex
  wallColorName: string;
  lighting: LightingMood;
  style: StylePhilosophy;
  budget: BudgetTier;
}

export type FloorMaterial = "Hardwood" | "Tile" | "Carpet" | "Concrete" | "Marble";

export interface PhotoAnalysis {
  roomType: RoomType;
  wallColorName: string;
  wallColorHex: string;
  lighting: LightingMood;
  floor: FloorMaterial;
  description: string; // human-readable summary
}

interface DesignContextValue {
  brief: DesignBrief | null;
  setBrief: (b: DesignBrief | null) => void;
  dreamImage: string | null;
  setDreamImage: (img: string | null) => void;
  uploadedPhoto: string | null;
  setUploadedPhoto: (img: string | null) => void;
  confirmed: boolean;
  setConfirmed: (c: boolean) => void;
  photoAnalysis: PhotoAnalysis | null;
  setPhotoAnalysis: (a: PhotoAnalysis | null) => void;
}

const DesignContext = createContext<DesignContextValue | undefined>(undefined);

const BRIEF_KEY = "design_brief_v1";
const IMG_KEY = "dream_image_v1";
const PHOTO_KEY = "uploadedRoomPhoto";
const CONFIRM_KEY = "design_confirmed_v1";
const ANALYSIS_KEY = "photo_analysis_v1";

export function DesignProvider({ children }: { children: ReactNode }) {
  const [brief, setBriefState] = useState<DesignBrief | null>(null);
  const [dreamImage, setDreamImageState] = useState<string | null>(null);
  const [uploadedPhoto, setUploadedPhotoState] = useState<string | null>(null);
  const [confirmed, setConfirmedState] = useState(false);
  const [photoAnalysis, setPhotoAnalysisState] = useState<PhotoAnalysis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const b = window.localStorage.getItem(BRIEF_KEY);
      if (b) setBriefState(JSON.parse(b));
      const img = window.localStorage.getItem(IMG_KEY);
      if (img) setDreamImageState(img);
      const photo = window.localStorage.getItem(PHOTO_KEY);
      if (photo) setUploadedPhotoState(photo);
      const c = window.localStorage.getItem(CONFIRM_KEY);
      if (c === "1") setConfirmedState(true);
      const a = window.localStorage.getItem(ANALYSIS_KEY);
      if (a) setPhotoAnalysisState(JSON.parse(a));
    } catch {}
  }, []);

  const setBrief = (b: DesignBrief | null) => {
    setBriefState(b);
    try {
      if (b) window.localStorage.setItem(BRIEF_KEY, JSON.stringify(b));
      else window.localStorage.removeItem(BRIEF_KEY);
    } catch {}
  };
  const setDreamImage = (img: string | null) => {
    setDreamImageState(img);
    try {
      if (img) window.localStorage.setItem(IMG_KEY, img);
      else window.localStorage.removeItem(IMG_KEY);
    } catch {}
  };
  const setUploadedPhoto = (img: string | null) => {
    setUploadedPhotoState(img);
    try {
      if (img) window.localStorage.setItem(PHOTO_KEY, img);
      else window.localStorage.removeItem(PHOTO_KEY);
    } catch {}
  };
  const setConfirmed = (c: boolean) => {
    setConfirmedState(c);
    try {
      window.localStorage.setItem(CONFIRM_KEY, c ? "1" : "0");
    } catch {}
  };
  const setPhotoAnalysis = (a: PhotoAnalysis | null) => {
    setPhotoAnalysisState(a);
    try {
      if (a) window.localStorage.setItem(ANALYSIS_KEY, JSON.stringify(a));
      else window.localStorage.removeItem(ANALYSIS_KEY);
    } catch {}
  };

  return (
    <DesignContext.Provider
      value={{ brief, setBrief, dreamImage, setDreamImage, uploadedPhoto, setUploadedPhoto, confirmed, setConfirmed, photoAnalysis, setPhotoAnalysis }}
    >
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error("useDesign must be used inside DesignProvider");
  return ctx;
}