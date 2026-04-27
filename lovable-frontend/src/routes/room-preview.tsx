import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SageChatPanel, SageAvatar } from "@/components/SageChat";

export const Route = createFileRoute("/room-preview")({
  component: RoomPreviewPage,
  head: () => ({
    meta: [
      { title: "Room Preview — AgentRec" },
      { name: "description", content: "Visualize your perfect workspace. Customize colors, swap styles, and preview before you buy." },
    ],
  }),
});

interface RoomColors {
  desk: string;
  chair: string;
  sofa: string;
  rug: string;
}

const defaultColors: RoomColors = { desk: "#D4C5A9", chair: "#87A878", sofa: "#C9B99A", rug: "#F0EBE3" };

const presetColors: Record<string, RoomColors> = {
  "Modern Teal": { desk: "#D4CFC6", chair: "#4A6741", sofa: "#7F77DD", rug: "#C9A97A" },
  "Mid-Century": { desk: "#8B6F47", chair: "#D85A30", sofa: "#C8A87A", rug: "#D85A30" },
  "Japandi": { desk: "#C8A87A", chair: "#444441", sofa: "#D4CFC6", rug: "#D4CFC6" },
  "Scandinavian": { desk: "#D4CFC6", chair: "#1D9E75", sofa: "#B5D4F4", rug: "#F1EFE8" },
  "Bohemian": { desk: "#8B6F47", chair: "#C4654A", sofa: "#E88AAB", rug: "#D4A574" },
  "Industrial": { desk: "#2D2D2D", chair: "#333333", sofa: "#6B6B67", rug: "#E8E4DD" },
};

const presets = ["Empty Room", "Modern Teal", "Mid-Century", "Japandi", "Scandinavian", "Industrial", "Bohemian"];

interface SwatchCategory {
  label: string;
  key: keyof RoomColors;
  options: { name: string; color: string }[];
}

const swatchCategories: SwatchCategory[] = [
  {
    label: "Desk", key: "desk",
    options: [
      { name: "White Oak", color: "#D4C5A9" },
      { name: "Walnut", color: "#8B7355" },
      { name: "Charcoal", color: "#2D2D2D" },
      { name: "Birch", color: "#F5F0E8" },
    ],
  },
  {
    label: "Chair", key: "chair",
    options: [
      { name: "Forest Green", color: "#1D9E75" },
      { name: "Amber", color: "#BA7517" },
      { name: "Slate", color: "#333333" },
      { name: "Terracotta", color: "#C4654A" },
    ],
  },
  {
    label: "Sofa", key: "sofa",
    options: [
      { name: "Sage", color: "#87A878" },
      { name: "Warm Sand", color: "#C9B99A" },
      { name: "Lavender", color: "#9B8EC4" },
      { name: "Blush", color: "#E88AAB" },
    ],
  },
  {
    label: "Rug", key: "rug",
    options: [
      { name: "Cream", color: "#F0EBE3" },
      { name: "Sienna", color: "#D4A574" },
      { name: "Linen", color: "#E8E4DD" },
      { name: "Charcoal", color: "#2D2D2D" },
    ],
  },
];

function RoomSVG({ colors, furnished }: { colors: RoomColors; furnished: boolean }) {
  const wallColor = "#F5F0E8";
  const floorColor = "#C8A87A";
  const floorDark = "#B89A6A";
  const trim = "#E0D8C8";
  const windowFrame = "#D4CFC6";

  return (
    <svg viewBox="0 0 900 400" width="100%" height="400" xmlns="http://www.w3.org/2000/svg">
      {/* Back wall */}
      <rect x="0" y="0" width="900" height="260" fill={wallColor} />
      {/* Floor */}
      <polygon points="0,260 900,260 900,400 0,400" fill={floorColor} />
      {/* Floor planks */}
      <line x1="0" y1="300" x2="900" y2="300" stroke={floorDark} strokeWidth="1" opacity="0.3" />
      <line x1="0" y1="340" x2="900" y2="340" stroke={floorDark} strokeWidth="1" opacity="0.3" />
      <line x1="0" y1="370" x2="900" y2="370" stroke={floorDark} strokeWidth="1" opacity="0.3" />
      {/* Baseboard */}
      <rect x="0" y="255" width="900" height="8" fill={trim} />

      {/* Window — left wall */}
      <rect x="80" y="60" width="120" height="160" rx="3" fill={windowFrame} />
      <rect x="88" y="68" width="46" height="70" fill="#E8F4FD" />
      <rect x="146" y="68" width="46" height="70" fill="#D6ECFA" />
      <rect x="88" y="146" width="46" height="66" fill="#D6ECFA" />
      <rect x="146" y="146" width="46" height="66" fill="#E8F4FD" />
      <line x1="140" y1="68" x2="140" y2="212" stroke={windowFrame} strokeWidth="4" />
      <line x1="88" y1="140" x2="192" y2="140" stroke={windowFrame} strokeWidth="4" />
      {/* Window light rays */}
      <polygon points="200,100 320,260 200,260" fill="#FFFBE8" opacity="0.15" />
      <polygon points="200,140 280,260 200,260" fill="#FFFBE8" opacity="0.1" />

      {furnished ? (
        <g>
          {/* Rug — oval on floor */}
          <ellipse cx="420" cy="330" rx="160" ry="50" fill={colors.rug} style={{ transition: "fill 0.4s ease" }} opacity="0.85" />
          <ellipse cx="420" cy="330" rx="140" ry="40" fill={colors.rug} style={{ transition: "fill 0.4s ease" }} opacity="0.5" stroke={colors.rug} strokeWidth="2" />

          {/* Sofa — back wall center */}
          <rect x="300" y="185" width="240" height="75" rx="12" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} />
          <rect x="295" y="195" width="18" height="65" rx="8" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} opacity="0.8" />
          <rect x="527" y="195" width="18" height="65" rx="8" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} opacity="0.8" />
          {/* Sofa cushions */}
          <rect x="310" y="195" width="72" height="50" rx="6" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} opacity="0.7" stroke="#00000010" strokeWidth="1" />
          <rect x="390" y="195" width="72" height="50" rx="6" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} opacity="0.7" stroke="#00000010" strokeWidth="1" />
          <rect x="468" y="195" width="60" height="50" rx="6" fill={colors.sofa} style={{ transition: "fill 0.4s ease" }} opacity="0.7" stroke="#00000010" strokeWidth="1" />
          {/* Sofa legs */}
          <rect x="310" y="258" width="6" height="10" rx="1" fill="#6B6B67" />
          <rect x="525" y="258" width="6" height="10" rx="1" fill="#6B6B67" />

          {/* Standing desk — right side */}
          <rect x="660" y="140" width="160" height="8" rx="2" fill={colors.desk} style={{ transition: "fill 0.4s ease" }} />
          {/* Desk legs */}
          <rect x="670" y="148" width="6" height="115" rx="1" fill="#888" />
          <rect x="808" y="148" width="6" height="115" rx="1" fill="#888" />
          {/* Desk crossbar */}
          <rect x="670" y="220" width="144" height="3" rx="1" fill="#888" opacity="0.5" />
          {/* Monitor */}
          <rect x="700" y="90" width="80" height="50" rx="3" fill="#1a1a1a" />
          <rect x="704" y="94" width="72" height="42" rx="1" fill="#2d3748" />
          <rect x="735" y="140" width="16" height="6" fill="#555" />
          <rect x="725" y="144" width="36" height="3" rx="1" fill="#666" />

          {/* Ergonomic chair */}
          <ellipse cx="700" cy="285" rx="28" ry="8" fill="#555" opacity="0.3" />
          <rect x="682" y="230" width="36" height="40" rx="10" fill={colors.chair} style={{ transition: "fill 0.4s ease" }} />
          <rect x="686" y="210" width="28" height="24" rx="6" fill={colors.chair} style={{ transition: "fill 0.4s ease" }} opacity="0.85" />
          {/* Chair base */}
          <rect x="696" y="270" width="8" height="18" fill="#555" />
          <line x1="680" y1="288" x2="720" y2="288" stroke="#555" strokeWidth="3" strokeLinecap="round" />
          {/* Chair wheels */}
          <circle cx="682" cy="290" r="4" fill="#444" />
          <circle cx="718" cy="290" r="4" fill="#444" />

          {/* Floor lamp — next to sofa */}
          <rect x="268" y="120" width="4" height="140" fill="#333" />
          <ellipse cx="270" cy="118" rx="18" ry="10" fill="#F5E6C8" opacity="0.9" />
          <ellipse cx="270" cy="115" rx="16" ry="8" fill="#FFF8E8" />
          <circle cx="270" cy="260" r="10" fill="#333" opacity="0.4" />

          {/* Plant — left corner */}
          <rect x="48" y="240" width="20" height="22" rx="3" fill="#C4654A" opacity="0.8" />
          <ellipse cx="58" cy="235" rx="16" ry="14" fill="#4A6741" />
          <ellipse cx="50" cy="230" rx="10" ry="12" fill="#5A7A51" />
          <ellipse cx="65" cy="232" rx="8" ry="10" fill="#3D5A35" />
          <line x1="55" y1="228" x2="52" y2="215" stroke="#4A6741" strokeWidth="2" />
          <ellipse cx="50" cy="214" rx="5" ry="4" fill="#5A7A51" />
        </g>
      ) : (
        <g>
          {/* Empty room hint text */}
          <rect x="310" y="155" width="280" height="80" rx="16" fill="#FFFFFF" fillOpacity="0.85" />
          <text x="450" y="190" textAnchor="middle" fontFamily="sans-serif" fontSize="16" fontWeight="600" fill="#2C2C2A">Empty Room</text>
          <text x="450" y="215" textAnchor="middle" fontFamily="sans-serif" fontSize="12" fill="#6B6B67">Choose a style preset to furnish this space</text>
        </g>
      )}
    </svg>
  );
}

type Tab = "illustrated" | "upload";

const presetPhotoInsights: Record<string, string> = {
  "Modern Teal": "Based on your room I can see clean surfaces and good natural light — Modern Teal's cool accents and ergonomic lines will feel crisp and modern in your space.",
  "Mid-Century": "Based on your room I can see you already have warm wood tones — the Mid-Century Warm bundle will feel very natural in your space.",
  "Japandi": "Based on your room I see calm, balanced light and minimal clutter — Japandi's oak, charcoal and paper palette will feel right at home here.",
  "Scandinavian": "Based on your room I can see soft, airy light — Scandinavian whites and pale naturals will brighten the space even more.",
  "Bohemian": "Based on your room I can see warmth and texture — bohemian's layered clay tones and earthy fabrics will give it real soul.",
  "Industrial": "Based on your room I can see strong architectural lines — industrial charcoal and raw materials will sharpen that edge while keeping the warmth.",
};

function RoomPreviewPage() {
  const [selectedPreset, setSelectedPreset] = useState("Empty Room");
  const [roomColors, setRoomColors] = useState<RoomColors>(defaultColors);
  const [selectedSwatchNames, setSelectedSwatchNames] = useState<Record<string, string>>({
    Desk: "White Oak", Chair: "Forest Green", Sofa: "Warm Sand", Rug: "Cream",
  });
  const [tab, setTab] = useState<Tab>("illustrated");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<
    { name: string; category: string; priceRange: string; reason: string }[]
  >([]);
  const [showProducts, setShowProducts] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFurnished = selectedPreset !== "Empty Room";

  // Pick up photo + analysis passed from homepage (persisted in localStorage)
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("uploadedRoomPhoto") ||
        sessionStorage.getItem("uploadedRoomPhoto");
      if (stored) {
        setUploadedPhoto(stored);
        setTab("upload");
      }
      const rawAnalysis = localStorage.getItem("roomAnalysis");
      if (rawAnalysis) {
        const parsed = JSON.parse(rawAnalysis);
        if (Array.isArray(parsed?.recommendations)) {
          setRecommendations(parsed.recommendations);
        }
      }
    } catch {}
  }, []);

  const handlePresetClick = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== "Empty Room" && presetColors[preset]) {
      setRoomColors(presetColors[preset]);
    } else if (preset === "Empty Room") {
      setRoomColors(defaultColors);
    }
  };

  const selectSwatch = (cat: SwatchCategory, option: { name: string; color: string }) => {
    setRoomColors((prev) => ({ ...prev, [cat.key]: option.color }));
    setSelectedSwatchNames((prev) => ({ ...prev, [cat.label]: option.name }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhoto(reader.result as string);
      setAnalyzing(true);
      setTimeout(() => setAnalyzing(false), 2000);
    };
    reader.readAsDataURL(file);
  };

  const sageInsightText = (() => {
    if (uploadedPhoto && tab === "upload" && isFurnished && presetPhotoInsights[selectedPreset]) {
      return presetPhotoInsights[selectedPreset];
    }
    if (isFurnished) {
      return `The ${selectedPreset} style looks great! The desk, chair, sofa, and rug colors work together to create a cohesive space. Try clicking the swatches above to customize individual pieces.`;
    }
    return "Select a style preset above to see how your room transforms. Then fine-tune individual colors to make it truly yours.";
  })();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl text-foreground">Room Preview</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Start with an empty room or upload a photo of your real space.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
              <button
                onClick={() => setTab("illustrated")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === "illustrated" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Illustrated Room
              </button>
              <button
                onClick={() => setTab("upload")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  tab === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera size={14} />
                My Room
              </button>
            </div>

            {/* Room area */}
            <div className="relative rounded-2xl overflow-hidden border border-border">
              {tab === "illustrated" ? (
                <>
                  <RoomSVG colors={roomColors} furnished={isFurnished} />
                  {isFurnished && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/50 to-transparent p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {swatchCategories.map((cat) => (
                          <div key={cat.label} className="flex items-center gap-1.5 bg-card/90 backdrop-blur rounded-full px-3 py-1">
                            <div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: roomColors[cat.key] }} />
                            <span className="text-xs font-medium">{cat.label}: {selectedSwatchNames[cat.label]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : uploadedPhoto ? (
                <div className="relative select-none">
                  <img src={uploadedPhoto} alt="Your room" className="w-full h-[500px] object-cover" draggable={false} />
                  <div className="absolute top-3 left-3 right-3 sm:right-44 flex items-start gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 shadow-teal">
                    <SageAvatar size={24} />
                    <p className="text-xs sm:text-sm font-medium leading-snug break-words">
                      {analyzing
                        ? "Sage is analyzing your room..."
                        : recommendations.length > 0
                        ? "Drag each product to wherever you'd put it in your room. Toggle the overlay to compare before and after."
                        : "I can see warm tones and natural light in your space. I'll match everything to what's already there."}
                    </p>
                  </div>

                  {/* Toggle: Show / Hide products */}
                  {recommendations.length > 0 && (
                    <button
                      onClick={() => setShowProducts((s) => !s)}
                      className="absolute top-3 right-3 bg-card/95 backdrop-blur text-foreground text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-card transition-colors flex items-center gap-1.5 shadow-md"
                    >
                      {showProducts ? <EyeOff size={12} /> : <Eye size={12} />}
                      {showProducts ? "Hide products" : "Show products in room"}
                    </button>
                  )}

                  {showProducts && (
                    <>
                      <div className="absolute left-[5%] bottom-[10%]">
                        <div className="flex items-center gap-3 bg-card/95 backdrop-blur border border-border rounded-md px-3 py-3 shadow-md max-w-[16rem]">
                          <img
                            src="https://images.unsplash.com/photo-1600166898405-da9535204843?w=150"
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground leading-tight break-words">Area Rug</p>
                            <p className="text-[10px] font-bold text-primary leading-tight">$150-$200</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute left-[35%] bottom-[20%]">
                        <div className="flex items-center gap-3 bg-card/95 backdrop-blur border border-border rounded-md px-3 py-3 shadow-md max-w-[16rem]">
                          <img
                            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150"
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground leading-tight break-words">Modern Sofa</p>
                            <p className="text-[10px] font-bold text-primary leading-tight">$350-$500</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute right-[10%] top-[30%]">
                        <div className="flex items-center gap-3 bg-card/95 backdrop-blur border border-border rounded-md px-3 py-3 shadow-md max-w-[16rem]">
                          <img
                            src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=150"
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-foreground leading-tight break-words">Floor Lamp</p>
                            <p className="text-[10px] font-bold text-primary leading-tight">$100-$150</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-3 right-3 bg-card/90 backdrop-blur text-foreground text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-card transition-colors flex items-center gap-1.5"
                  >
                    <Upload size={12} />
                    Replace photo
                  </button>
                </div>
              ) : (
                <div className="h-[400px] bg-muted/30 flex items-center justify-center p-6">
                  <div className="border-2 border-dashed border-primary/40 rounded-xl w-full h-full flex flex-col items-center justify-center text-center px-6 bg-card/50">
                    <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mb-4">
                      <Camera size={28} className="text-primary" />
                    </div>
                    <h3 className="font-heading text-xl text-foreground">Upload your room photo here</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                      Sage will show you how the furniture looks in your actual space.
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-teal"
                    >
                      Choose photo
                    </button>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Style Presets */}
            <div className="space-y-3">
              <h2 className="font-heading text-xl text-foreground">Style Presets</h2>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePresetClick(p)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      selectedPreset === p
                        ? "bg-primary text-primary-foreground shadow-teal"
                        : "bg-muted text-muted-foreground hover:bg-border"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="space-y-4">
              <h2 className="font-heading text-xl text-foreground">Color Swatches</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {swatchCategories.map((cat) => (
                  <div key={cat.label} className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">{cat.label}</p>
                    <div className="flex gap-1.5">
                      {cat.options.map((opt) => (
                        <button
                          key={opt.name}
                          onClick={() => selectSwatch(cat, opt)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            roomColors[cat.key] === opt.color
                              ? "border-primary scale-110 shadow-md"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{ backgroundColor: opt.color }}
                          title={opt.name}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{selectedSwatchNames[cat.label]}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Palette Strip */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Your Current Palette</p>
              <div className="flex items-center gap-4">
                {swatchCategories.map((cat) => (
                  <div key={cat.label} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-border shadow-sm" style={{ backgroundColor: roomColors[cat.key] }} />
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-none">{cat.label}</p>
                      <p className="text-xs font-medium leading-tight">{selectedSwatchNames[cat.label]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sage Insight */}
            <div className="bg-teal-light rounded-2xl p-5 flex items-start gap-3">
              <SageAvatar size={36} />
              <div>
                <p className="font-semibold text-sm">Sage's Insight</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sageInsightText}
                </p>
              </div>
            </div>
          </div>

          <div>
            <SageChatPanel className="sticky top-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
