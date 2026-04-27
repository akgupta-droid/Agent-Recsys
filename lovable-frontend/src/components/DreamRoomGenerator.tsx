import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, RefreshCw, Check, AlertCircle, Settings, Wand2 } from "lucide-react";
import { useApiKey } from "@/context/ApiKeyContext";
import type { DesignPreferences } from "./PreferencesForm";

const PRIMARY_MODEL = "gemini-3.1-flash-image-preview";
const FALLBACK_MODEL = "gemini-2.5-flash-image-preview";

function buildPrompt(prefs: DesignPreferences, photoStyle?: string | null) {
  const goalText: Record<DesignPreferences["goal"], string> = {
    "cozy-relaxing": "cozy and relaxing",
    "focused-productive": "focused and productive",
    "elegant-entertaining": "elegant and refined for entertaining guests",
    "minimal-calm": "minimal and calm",
  };
  const roomText: Record<DesignPreferences["roomType"], string> = {
    "living-room": "living room",
    bedroom: "bedroom",
    office: "home office",
    "dining-room": "dining room",
    studio: "studio apartment",
  };
  const styleAnchor =
    prefs.keepDetectedStyle === "keep" && photoStyle ? photoStyle : prefs.style;

  return [
    `Professional interior design photograph of a ${roomText[prefs.roomType]}.`,
    `Style: ${styleAnchor}.`,
    `Mood: ${goalText[prefs.goal]}.`,
    `Budget tier: ${prefs.budget} — furnishings should look appropriate for that price range.`,
    `Composition: wide-angle shot, natural daylight from a window, realistic materials, layered lighting,`,
    `tasteful furniture arrangement, decorative accents, plants, art on walls.`,
    `Magazine-quality, photorealistic, 8k, architectural digest aesthetic.`,
  ].join(" ");
}

async function callGemini(model: string, prompt: string, key: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`Google AI ${res.status}: ${txt.slice(0, 200)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const data: string | undefined = p?.inlineData?.data ?? p?.inline_data?.data;
    const mime: string | undefined =
      p?.inlineData?.mimeType ?? p?.inline_data?.mime_type ?? "image/png";
    if (data) return `data:${mime};base64,${data}`;
  }
  throw new Error("Google AI response did not include an image.");
}

export function DreamRoomGenerator({
  preferences,
  detectedStyle,
  onConfirm,
  onAdjust,
  onOpenSettings,
}: {
  preferences: DesignPreferences;
  detectedStyle?: string | null;
  onConfirm: (imageDataUrl: string) => void;
  onAdjust: () => void;
  onOpenSettings: () => void;
}) {
  const { googleApiKey, hasGoogleKey } = useApiKey();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef<string | null>(null);

  const generate = async () => {
    if (!hasGoogleKey) {
      setError("Add your Google AI Studio key in Settings to generate your dream room.");
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    const prompt = buildPrompt(preferences, detectedStyle);
    try {
      let url: string;
      try {
        url = await callGemini(PRIMARY_MODEL, prompt, googleApiKey.trim());
      } catch (e) {
        const status = (e as Error & { status?: number }).status;
        // The exact model name may not exist yet — fall back to the real public image model.
        if (status === 404 || status === 400) {
          url = await callGemini(FALLBACK_MODEL, prompt, googleApiKey.trim());
        } else {
          throw e;
        }
      }
      setImageUrl(url);
    } catch (e) {
      console.error("[DreamRoom] generation failed:", e);
      setError(e instanceof Error ? e.message : "Could not generate the image.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate once per unique preferences fingerprint.
  useEffect(() => {
    const fingerprint = JSON.stringify(preferences);
    if (requestedRef.current === fingerprint) return;
    requestedRef.current = fingerprint;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-primary" />
        <h2 className="font-heading text-2xl md:text-3xl text-foreground">Your Dream Room</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Sage is rendering a {preferences.style.toLowerCase()} {preferences.roomType.replace("-", " ")} for{" "}
        {preferences.goal.replace("-", " ")} living within {preferences.budget}.
      </p>

      <div className="rounded-2xl overflow-hidden border border-border bg-muted aspect-[16/10] flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm">Sage is designing your space…</p>
          </div>
        )}
        {!loading && imageUrl && (
          <img src={imageUrl} alt="Your AI-generated dream room" className="w-full h-full object-cover" />
        )}
        {!loading && !imageUrl && !error && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles size={16} /> <span className="text-sm">Preparing your render…</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Couldn't generate your dream room</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{error}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!hasGoogleKey && (
                <button
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Settings size={12} /> Add your Google AI Studio key
                </button>
              )}
              <button
                onClick={() => void generate()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {imageUrl && !loading && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onConfirm(imageUrl)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity shadow-teal"
          >
            <Check size={16} /> This looks great — show me products
          </button>
          <button
            onClick={onAdjust}
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-5 py-2.5 rounded-full text-sm font-semibold hover:border-primary/60 hover:text-primary transition-colors"
          >
            <RefreshCw size={16} /> Try a different design
          </button>
        </div>
      )}
    </section>
  );
}