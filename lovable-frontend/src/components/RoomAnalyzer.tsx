import { useEffect, useRef, useState, DragEvent } from "react";
import { Camera, Loader2, Sparkles, ShoppingBag, AlertCircle, Settings, Check, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useApiKey } from "@/context/ApiKeyContext";

const PERSONALIZED_PICK_CARDS = [
  {
    category: "Seating",
    name: "Mid Century Modern Sofa",
    priceRange: "$350-$500",
    reason:
      "A dark green velvet sofa with tapered wooden legs and a low-profile silhouette, bringing a retro-modern feel to any living space.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
  },
  {
    category: "Rug",
    name: "Area Rug",
    priceRange: "$150-$200",
    reason:
      "A handwoven natural fiber area rug in warm earth tones, adding texture and warmth to hardwood floors.",
    image:
      "https://images.unsplash.com/photo-1600166898405-da9535204843?w=600",
  },
  {
    category: "Lighting",
    name: "Contemporary Floor Lamp",
    priceRange: "$100-$150",
    reason:
      "A sleek modern floor lamp with a dark shade and slim profile, providing warm ambient lighting without taking up space.",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600",
  },
] as const;

export interface RoomAnalysis {
  style: string;
  colorPalette: string[];
  existingFurniture: string[];
  roomSize: "small" | "medium" | "large" | string;
  mood: "warm" | "cool" | "neutral" | string;
  recommendations: {
    name: string;
    category: string;
    priceRange: string;
    reason: string;
  }[];
}

const parseBudgetMax = (budget?: string | null): number | null => {
  if (!budget) return null;
  const nums = budget.replace(/,/g, "").match(/\d+/g);
  if (!nums) return null;
  if (/\+/.test(budget)) return parseInt(nums[0], 10) * 2;
  return parseInt(nums[nums.length - 1], 10);
};

const parsePriceLow = (priceRange: string) => {
  const match = (priceRange || "").replace(/[, ]/g, "").match(/\$?(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const formatPriceRange = (low: number, high?: number) => {
  const safeLow = Math.max(0, Math.round(low / 10) * 10);
  const safeHigh = Math.max(safeLow + 40, Math.round((high ?? safeLow + 80) / 10) * 10);
  return `$${safeLow.toLocaleString()}–$${safeHigh.toLocaleString()}`;
};

const enforceBudgetOnAnalysis = (analysis: RoomAnalysis, budget?: string | null): RoomAnalysis => {
  const budgetMax = parseBudgetMax(budget);
  if (!budgetMax || analysis.recommendations.length === 0) return analysis;

  const totalLow = analysis.recommendations.reduce((sum, rec) => sum + parsePriceLow(rec.priceRange), 0);
  if (totalLow <= budgetMax) return analysis;

  const categoryWeights: Record<string, number> = {
    seating: 0.4,
    chair: 0.35,
    desk: 0.35,
    sofa: 0.45,
    storage: 0.2,
    rug: 0.15,
    lamp: 0.1,
    lighting: 0.1,
    accessory: 0.1,
    decor: 0.1,
  };

  const recommendations = analysis.recommendations.map((rec, index, all) => {
    const key = rec.category.toLowerCase();
    const matchedWeight = Object.entries(categoryWeights).find(([label]) => key.includes(label))?.[1];
    const fallbackWeight = 1 / all.length;
    return {
      ...rec,
      _weight: matchedWeight ?? fallbackWeight,
    };
  });

  const weightTotal = recommendations.reduce((sum, rec) => sum + rec._weight, 0) || 1;
  const adjusted = recommendations.map((rec) => {
    const allocation = Math.max(60, Math.floor((budgetMax * rec._weight) / weightTotal));
    return {
      name: rec.name,
      category: rec.category,
      reason: rec.reason,
      priceRange: formatPriceRange(allocation, allocation + Math.max(50, allocation * 0.25)),
    };
  });

  return {
    ...analysis,
    recommendations: adjusted,
  };
};

export function RoomAnalyzer({
  onAnalyzed,
  onOpenSettings,
  budget,
  showResults = true,
}: {
  onAnalyzed?: (analysis: RoomAnalysis, photoDataUrl: string) => void;
  onOpenSettings: () => void;
  budget?: string | null;
  showResults?: boolean;
}) {
  const { apiKey, hasKey } = useApiKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showRoomOverlay, setShowRoomOverlay] = useState(false);
  const lastAnalyzedBudget = useRef<string | null>(null);

  // Re-analyze when budget changes (if a photo is already uploaded)
  useEffect(() => {
    if (photo && budget && budget !== lastAnalyzedBudget.current && hasKey) {
      void analyze(photo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setError(null);
    setAnalysis(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      try {
        sessionStorage.setItem("uploadedRoomPhoto", dataUrl);
      } catch {}
      const storedKey =
        (typeof window !== "undefined" && window.localStorage.getItem("openai_api_key")) || "";
      if (!hasKey && !storedKey) {
        setError("Add your OpenAI API key in Settings to analyze the room.");
        return;
      }
      await analyze(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async (dataUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      // Always read the freshest key from localStorage at call time, falling back to context.
      const storedKey =
        (typeof window !== "undefined" && window.localStorage.getItem("openai_api_key")) || "";
      const keyToUse = (storedKey || apiKey || "").trim();
      console.log("[RoomAnalyzer] API key prefix:", keyToUse ? keyToUse.substring(0, 5) : "(none)");

      if (!keyToUse) {
        throw new Error("No OpenAI API key found. Please add one in Settings.");
      }

      // Strip the data URL prefix to get the raw base64
      const base64Image = dataUrl.split(",")[1] ?? dataUrl;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + keyToUse,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: "data:image/jpeg;base64," + base64Image },
                },
                {
                  type: "text",
                  text:
                    "You are Sage, an AI interior design copilot. Analyze this room photo. Return a JSON object with: style (detected style like modern, minimalist, bohemian), colorPalette (array of 4-5 dominant colors as hex codes), existingFurniture (array of furniture items you can see), roomSize (estimate as small/medium/large), mood (warm/cool/neutral), recommendations (array of 3 product suggestions that would complement this space, each with name, category, priceRange, and reason). For priceRange, give an actual realistic USD price range like \"$800–$1,200\" or \"$200–$400\" — never use $, $$, or $$$ symbols. Important: You may ask a maximum of 1 clarification question before providing recommendations. After the user answers your question, you MUST respond with 3 updated product recommendations with names, categories, and price ranges. Never ask a second clarification question. Always provide product recommendations after receiving the user's answer. Only return valid JSON, no markdown. CRITICAL RULE: After the user answers ONE of your questions, you MUST immediately provide 3 specific product recommendations with exact product names, price ranges, and short explanations. Do NOT ask any more questions. Respond with products in this format: 1. [Product Name] ([Category], XX−XX- XX−XX) — [reason]. 2. [Product Name] ([Category], XX−XX- XX−XX) — [reason]. 3. [Product Name] ([Category], XX−XX- XX−XX) — [reason]." +
                    (budget
                      ? ` IMPORTANT: The user selected a budget range of ${budget}. Keep the entire 3-item bundle inside this budget range. The SUM of the lower bounds of all 3 price ranges must stay within the selected budget cap. Choose budget-appropriate versions of products if needed, and do not suggest items that push the bundle over budget.`
                      : ""),
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`OpenAI returned ${res.status}: ${txt.slice(0, 160)}`);
      }
      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "";
      // Strip any accidental markdown fences just in case
      const cleaned = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed: RoomAnalysis = JSON.parse(cleaned);
      const budgetSafeAnalysis = enforceBudgetOnAnalysis(parsed, budget);
      setAnalysis(budgetSafeAnalysis);
      lastAnalyzedBudget.current = budget ?? null;
      try {
        localStorage.setItem("uploadedRoomPhoto", dataUrl);
        localStorage.setItem("roomAnalysis", JSON.stringify(budgetSafeAnalysis));
      } catch {}
      onAnalyzed?.(budgetSafeAnalysis, dataUrl);
    } catch (e) {
      console.error("[RoomAnalyzer] OpenAI API Error:", e);
      setError(e instanceof Error ? e.message : "Something went wrong analyzing the photo.");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-heading text-3xl md:text-4xl text-foreground">Upload your space</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Drag and drop a photo of your room, apartment, desk, or office. Sage will analyze the colors, style, and existing furniture, then recommend products that fit.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all p-10 md:p-14 text-center ${
          dragging
            ? "border-primary bg-teal-light/60 scale-[1.01]"
            : "border-primary/40 bg-teal-light/20 hover:bg-teal-light/40 hover:border-primary/70"
        }`}
      >
        {photo ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={photo}
              alt="Your uploaded room"
              className="max-h-64 rounded-xl object-cover shadow-md"
            />
            <p className="text-sm text-muted-foreground">
              Click or drop another photo to replace.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center shadow-sm">
              <Camera size={28} className="text-primary" />
            </div>
            <h3 className="font-heading text-2xl text-foreground">Drop a photo of your space</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Sage will analyze your style, colors, and recommend products that fit.
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="mt-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-teal"
            >
              Choose photo
            </button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {/* Status: loading / error */}
      {loading && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <Loader2 size={18} className="animate-spin text-primary" />
          <p className="text-sm text-foreground">Sage is analyzing your room…</p>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium">Couldn't analyze that photo</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
            {!hasKey && (
              <button
                onClick={onOpenSettings}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Settings size={12} /> Open settings to add your key
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && showResults && (
        <div className="space-y-5">
          {/* Color palette strip */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Detected color palette
            </p>
            <div className="flex flex-wrap gap-3">
              {analysis.colorPalette.map((color, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-14 h-14 rounded-full border-2 border-card shadow-md"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-mono text-muted-foreground">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sage's analysis card */}
          <div className="bg-gradient-teal text-primary-foreground rounded-2xl p-6 shadow-teal">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} />
              <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                Sage's Room Analysis
              </p>
            </div>
            <h3 className="font-heading text-2xl capitalize">{analysis.style}</h3>
            <p className="text-sm opacity-90 mt-1 capitalize">
              {analysis.mood} tones · {analysis.roomSize} space
            </p>
            {analysis.existingFurniture?.length > 0 && (
              <p className="text-xs opacity-80 mt-3">
                <span className="font-semibold">Sage spotted:</span>{" "}
                {analysis.existingFurniture.join(", ")}
              </p>
            )}
          </div>

          {/* See products in your room — overlay on uploaded photo */}
          {photo && (
            <div className="space-y-3">
              <button
                onClick={() => setShowRoomOverlay((s) => !s)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-teal"
              >
                {showRoomOverlay ? <EyeOff size={14} /> : <Eye size={14} />}
                {showRoomOverlay ? "Hide products" : "See products in your room"}
              </button>

              {showRoomOverlay && (
                <div className="relative rounded-2xl overflow-hidden border border-border">
                  <img src={photo} alt="Your room with products" className="w-full max-h-[480px] object-cover" />

                    <div className="absolute left-[5%] bottom-[10%]">
                    <div className="flex items-center gap-3 bg-white/95 text-foreground px-3 py-3 rounded-lg shadow-lg max-w-[16rem] border border-white/80 backdrop-blur-sm">
                      <img
                        src="https://images.unsplash.com/photo-1600166898405-da9535204843?w=150"
                        alt=""
                        aria-hidden="true"
                        className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight break-words">Area Rug</p>
                        <p className="text-[10px] font-bold leading-tight">$150-$200</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute left-[35%] bottom-[20%]">
                    <div className="flex items-center gap-3 bg-white/95 text-foreground px-3 py-3 rounded-lg shadow-lg max-w-[16rem] border border-white/80 backdrop-blur-sm">
                      <img
                        src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150"
                        alt=""
                        aria-hidden="true"
                        className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight break-words">Modern Sofa</p>
                        <p className="text-[10px] font-bold leading-tight">$350-$500</p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-[10%] top-[30%]">
                    <div className="flex items-center gap-3 bg-white/95 text-foreground px-3 py-3 rounded-lg shadow-lg max-w-[16rem] border border-white/80 backdrop-blur-sm">
                      <img
                        src="https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=150"
                        alt=""
                        aria-hidden="true"
                        className="h-[60px] w-[60px] rounded-md object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight break-words">Floor Lamp</p>
                        <p className="text-[10px] font-bold leading-tight">$100-$150</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recommendation cards — styled as a bundle */}
          <div>
            <h3 className="font-heading text-2xl text-foreground mb-3">
              Sage's Personalized Picks
            </h3>
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="grid sm:grid-cols-3 gap-px bg-border">
                {PERSONALIZED_PICK_CARDS.map((rec, i) => (
                  <div
                    key={i}
                    className="p-5 bg-card hover:bg-muted/30 transition-colors"
                  >
                    <img
                      src={rec.image}
                      alt={rec.name}
                      loading="lazy"
                      className="mb-4 aspect-[4/3] w-full rounded-lg object-cover"
                    />
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                      {rec.category}
                    </p>
                    <h4 className="font-heading text-lg text-foreground mt-1">{rec.name}</h4>
                    <p className="text-sm font-bold text-foreground mt-1">{rec.priceRange}</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{rec.reason}</p>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(rec.name + " buy")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-teal"
                    >
                      <ExternalLink size={12} />
                      Shop this item
                    </a>
                  </div>
                ))}
              </div>

              {/* Bundle total summary bar */}
              {(() => {
                const total = PERSONALIZED_PICK_CARDS.reduce(
                  (sum, r) => sum + parsePriceLow(r.priceRange),
                  0,
                );
                const budgetMax = parseBudgetMax(budget);
                const fmt = (n: number) => `$${n.toLocaleString()}`;
                const withinBudget = budgetMax === null || total <= budgetMax;
                const diff = budgetMax === null ? 0 : budgetMax - total;

                return (
                  <div
                    className={`px-5 py-4 flex flex-wrap items-center gap-3 text-primary-foreground ${
                      withinBudget ? "bg-gradient-teal" : "bg-destructive"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        withinBudget ? "bg-white/20" : "bg-white/25"
                      }`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
                        Your Bundle Total
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {fmt(total)}
                        {budgetMax !== null && (
                          <>
                            {" "}of {fmt(budgetMax)} budget
                            {" · "}
                            {withinBudget
                              ? `${fmt(Math.max(0, diff))} under budget`
                              : `${fmt(Math.abs(diff))} over budget`}
                          </>
                        )}
                        {budgetMax === null && " · set a budget to see how it fits"}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
