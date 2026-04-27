import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Check, RefreshCw, Sparkles, Image as ImageIcon, Box, AlertCircle, SlidersHorizontal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useDesign, type StylePhilosophy, type DesignBrief } from "@/context/DesignContext";
import { useApiKey } from "@/context/ApiKeyContext";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Room3DViewer } from "@/components/Room3DViewer";

export const Route = createFileRoute("/dream-room")({
  component: DreamRoomPage,
  head: () => ({
    meta: [
      { title: "Your Dream Room — AgentRec" },
      {
        name: "description",
        content:
          "Sage has rendered your dream room. Confirm to see your curated shopping list.",
      },
    ],
  }),
});

// Curated stock placeholders by style — used until Imagen is wired in.
const STYLE_PLACEHOLDERS: Record<StylePhilosophy, string> = {
  "Modern Minimalist":
    "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?w=1600",
  "Mid-Century Warm":
    "https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?w=1600",
  "Japandi Zen":
    "https://images.pexels.com/photos/2986011/pexels-photo-2986011.jpeg?w=1600",
  "Bohemian Eclectic":
    "https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg?w=1600",
  "Industrial Loft":
    "https://images.pexels.com/photos/1457847/pexels-photo-1457847.jpeg?w=1600",
  "Coastal Bright":
    "https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?w=1600",
};

function buildDreamPrompt(brief: DesignBrief, floor: string): string {
  return `Take this room photo and reimagine it in ${brief.style} style. Keep the same room layout, walls, windows, and dimensions. Replace or add furniture in ${brief.style} style. Keep the ${brief.wallColorName.toLowerCase()} walls and ${floor.toLowerCase()} flooring. The lighting should be ${brief.lighting.toLowerCase()}. The furniture budget is ${brief.budget}. Make it look like a professional interior design rendering.`;
}

function dataUrlToInlinePart(dataUrl: string): { mimeType: string; data: string } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

async function generateGeminiImage(
  prompt: string,
  apiKey: string,
  referencePhoto: string | null,
): Promise<string> {
  const model = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (referencePhoto) {
    const inline = dataUrlToInlinePart(referencePhoto);
    if (inline) parts.unshift({ inlineData: inline });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini image API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const candParts = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = candParts.find((p: { inlineData?: { data?: string } }) => p?.inlineData?.data);
  const data = imgPart?.inlineData?.data;
  if (!data) throw new Error("No image returned from Gemini");
  const mime = imgPart.inlineData.mimeType ?? "image/png";
  return `data:${mime};base64,${data}`;
}

function DreamRoomPage() {
  const navigate = useNavigate();
  const { brief, photoAnalysis, uploadedPhoto, setConfirmed, dreamImage, setDreamImage } = useDesign();
  const { googleApiKey, hasGoogleKey } = useApiKey();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"2D" | "BA" | "3D">("2D");
  const requested = useRef<string | null>(null);

  const runGeneration = async (b: DesignBrief) => {
    setLoading(true);
    setError(null);
    if (!hasGoogleKey) {
      setError("Add your Google AI Studio key in Settings to generate a real room image.");
      setLoading(false);
      return;
    }
    try {
      const floor = photoAnalysis?.floor ?? "natural";
      const img = await generateGeminiImage(
        buildDreamPrompt(b, floor),
        googleApiKey,
        uploadedPhoto,
      );
      setDreamImage(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!brief) return;
    const fp = JSON.stringify(brief) + (uploadedPhoto ? "|photo" : "|nophoto");
    if (requested.current === fp) return;
    requested.current = fp;
    runGeneration(brief);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief, uploadedPhoto]);

  if (!brief) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 px-6 text-center">
          <p className="text-muted-foreground">No design brief yet.</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-semibold"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const placeholderImage = STYLE_PLACEHOLDERS[brief.style];
  const floor = photoAnalysis?.floor ?? "Hardwood";
  const displayImage = dreamImage ?? placeholderImage;
  const isRealImage = Boolean(dreamImage);

  const sageMessage = `Here is your dream room. I kept your ${brief.wallColorName.toLowerCase()} walls and ${floor.toString().toLowerCase()} flooring, and styled it with ${brief.style} furniture within your ${brief.budget} budget. What do you think?`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto space-y-8">
        {/* === Hero image / 3D placeholder === */}
        <div className="relative rounded-3xl overflow-hidden border border-border bg-muted aspect-[16/9]">
          {view === "2D" && (
            <>
              {!loading && (
                <img
                  src={displayImage}
                  alt="Your dream room"
                  className="w-full h-full object-cover"
                />
              )}
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted">
                  <Loader2 size={36} className="animate-spin text-primary" />
                  <p className="text-sm font-medium">Sage is designing your space…</p>
                </div>
              )}
              {!loading && !isRealImage && (
                <span className="absolute top-4 right-4 bg-foreground/85 backdrop-blur text-background text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                  <Sparkles size={11} />
                  Imagen AI preview — will be generated live in production
                </span>
              )}
              {!loading && error && (
                <div className="absolute bottom-4 left-4 right-4 bg-destructive/90 text-destructive-foreground text-xs px-4 py-2.5 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}

          {view === "BA" && (
            <>
              {uploadedPhoto && !loading ? (
                <BeforeAfterSlider
                  beforeSrc={uploadedPhoto}
                  afterSrc={displayImage}
                  beforeLabel="Original"
                  afterLabel="Sage's design"
                />
              ) : loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-muted">
                  <Loader2 size={36} className="animate-spin text-primary" />
                  <p className="text-sm font-medium">Sage is designing your space…</p>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6 text-center">
                  <SlidersHorizontal size={28} className="text-primary" />
                  <p className="text-sm font-medium">Upload a room photo on the home page to use Before / After.</p>
                </div>
              )}
            </>
          )}

          {view === "3D" && (
            <Room3DViewer
              dreamImage={dreamImage}
              apiKey={googleApiKey}
              fallbackWallColor={brief.wallColor}
            />
          )}
        </div>

        {/* === Title + tags + view toggle === */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl md:text-5xl text-foreground">
              Your Dream Room
            </h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="bg-teal-light text-foreground px-3 py-1 rounded-full text-xs font-semibold border border-primary/20">
                {brief.style}
              </span>
              <span className="bg-muted text-foreground px-3 py-1 rounded-full text-xs font-semibold border border-border">
                {brief.roomType}
              </span>
            </div>
          </div>
          <div className="flex gap-1 bg-card border border-border rounded-full p-1">
            <button
              onClick={() => setView("2D")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === "2D"
                  ? "bg-primary text-primary-foreground shadow-teal"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon size={12} />
              2D Photo
            </button>
            <button
              onClick={() => setView("BA")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === "BA"
                  ? "bg-primary text-primary-foreground shadow-teal"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SlidersHorizontal size={12} />
              Before / After
            </button>
            <button
              onClick={() => setView("3D")}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                view === "3D"
                  ? "bg-primary text-primary-foreground shadow-teal"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Box size={12} />
              3D View
            </button>
          </div>
        </div>

        {/* === Sage message === */}
        <div className="bg-card rounded-2xl border border-border p-6 flex gap-4">
          <div
            className="w-10 h-10 rounded-full shrink-0"
            style={{
              background:
                "radial-gradient(circle at 35% 35%, #1D9E75, #15856280, #BA751740)",
              animation: "sage-pulse 3s ease-in-out infinite",
              boxShadow: "0 0 12px 2px rgba(29, 158, 117, 0.25)",
            }}
          />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Sage · AI Design Companion
            </p>
            <p className="text-base text-foreground leading-relaxed mt-1.5">
              "{sageMessage}"
            </p>
          </div>
        </div>

        {/* === Summary cards === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Meta label="Wall Color" value={brief.wallColorName} swatch={brief.wallColor} />
          <Meta label="Lighting" value={brief.lighting} />
          <Meta label="Style" value={brief.style} />
          <Meta label="Budget" value={brief.budget} />
        </div>

        {/* === Actions === */}
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setConfirmed(true);
                navigate({ to: "/shopping" });
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-gradient-teal text-primary-foreground px-6 py-3.5 rounded-full text-sm font-semibold shadow-teal hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              <Check size={16} />
              This looks great — show me products
            </button>
            <button
              onClick={() => runGeneration(brief)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground px-6 py-3.5 rounded-full text-sm font-semibold hover:border-primary/60 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Try a different design
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => navigate({ to: "/" })}
              className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors py-1"
            >
              ← Edit selections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        {swatch && (
          <span
            className="w-4 h-4 rounded-full border border-border shrink-0"
            style={{ backgroundColor: swatch }}
          />
        )}
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
