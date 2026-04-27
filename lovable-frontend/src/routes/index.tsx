import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Send, Sparkles, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SageAvatar } from "@/components/SageChat";
import {
  useDesign,
  type BudgetTier,
  type StylePhilosophy,
  type RoomType,
  type PhotoAnalysis,
} from "@/context/DesignContext";
import { analyzeRoomPhoto, parseRoomDescription } from "@/lib/gemini-image";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "AgentRec — Your AI Interior Design Companion" },
      {
        name: "description",
        content:
          "Tell us what you need. We build your bundle. Sage, your AI design consultant, curates a room that fits your space, style, and budget.",
      },
    ],
  }),
});

const BUDGETS: BudgetTier[] = ["Under $500", "$500–$700", "$700–$1000", "$1000+"];

const STYLES: { value: StylePhilosophy; image: string }[] = [
  { value: "Modern Minimalist", image: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?w=400" },
  { value: "Japandi Zen", image: "https://images.pexels.com/photos/2986011/pexels-photo-2986011.jpeg?w=400" },
  { value: "Mid-Century Warm", image: "https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?w=400" },
  { value: "Coastal Bright", image: "https://images.pexels.com/photos/1571463/pexels-photo-1571463.jpeg?w=400" },
  { value: "Bohemian Eclectic", image: "https://images.pexels.com/photos/3209049/pexels-photo-3209049.jpeg?w=400" },
  { value: "Industrial Loft", image: "https://images.pexels.com/photos/1457847/pexels-photo-1457847.jpeg?w=400" },
];

const ROOM_TYPES: RoomType[] = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Home Office",
];

type Phase =
  | "ask-photo"      // initial: upload OR "no photo"
  | "analyzing"      // photo analysis in flight
  | "ask-room-type"  // no-photo path: pick room type first
  | "ask-describe"   // no-photo path: short text description
  | "parsing"        // parsing description
  | "confirm-photo"  // post-photo: keep this look or try new
  | "ask-budget"
  | "ask-style"
  | "summary";

type ChatMessage = {
  role: "sage" | "user";
  text: string;
};

function HomePage() {
  const navigate = useNavigate();
  const {
    uploadedPhoto,
    setUploadedPhoto,
    setBrief,
    photoAnalysis,
    setPhotoAnalysis,
    setDreamImage,
    setConfirmed,
  } = useDesign();

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("ask-photo");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "sage",
      text: "Hi, I'm Sage — your AI design companion. Want to upload a photo of your room, or shall we start from scratch?",
    },
  ]);
  const [input, setInput] = useState("");
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [budget, setBudget] = useState<BudgetTier | null>(null);
  const [style, setStyle] = useState<StylePhilosophy | null>(null);

  // Reset upload state on every fresh visit so the flow restarts cleanly.
  useEffect(() => {
    setUploadedPhoto(null);
    setPhotoAnalysis(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  const pushSage = (text: string) =>
    setMessages((p) => [...p, { role: "sage", text }]);
  const pushUser = (text: string) =>
    setMessages((p) => [...p, { role: "user", text }]);

  // === Photo upload path ===
  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setUploadedPhoto(dataUrl);
      pushUser("[Uploaded a photo]");
      pushSage("Got it — let me take a closer look at your space…");
      setPhase("analyzing");
      try {
        const analysis = await analyzeRoomPhoto(dataUrl);
        setPhotoAnalysis(analysis);
        setRoomType(analysis.roomType);
        pushSage(
          `I can see your space! It looks like a ${analysis.roomType.toLowerCase()}. The walls appear ${analysis.wallColorName.toLowerCase()}, with ${analysis.floor.toLowerCase()} flooring and ${analysis.lighting.toLowerCase()} light. Should we keep this look or try something new?`,
        );
        setPhase("confirm-photo");
      } catch {
        pushSage(
          "I had trouble analyzing that photo — let's go the manual route. What type of room are you designing?",
        );
        setPhase("ask-room-type");
      }
    };
    reader.readAsDataURL(file);
  };

  // === No-photo path ===
  const handleNoPhoto = () => {
    pushUser("I don't have a photo");
    pushSage("No problem! What type of room are you designing?");
    setPhase("ask-room-type");
  };

  const pickRoomType = (rt: RoomType) => {
    setRoomType(rt);
    pushUser(rt);
    pushSage(
      `Lovely. In a sentence or two, describe your ${rt.toLowerCase()} — wall color, flooring, how much natural light it gets, anything that stands out.`,
    );
    setPhase("ask-describe");
  };

  const submitDescription = async () => {
    const text = input.trim();
    if (!text || !roomType) return;
    pushUser(text);
    setInput("");
    pushSage("Thanks — let me piece that together…");
    setPhase("parsing");
    try {
      const analysis = await parseRoomDescription(roomType, text);
      setPhotoAnalysis(analysis);
      pushSage(
        `Got it: ${analysis.roomType.toLowerCase()} with ${analysis.wallColorName.toLowerCase()} walls, ${analysis.floor.toLowerCase()} flooring, ${analysis.lighting.toLowerCase()} lighting. Now — what's your budget for this room?`,
      );
      setPhase("ask-budget");
    } catch {
      // Graceful fallback with sensible defaults
      const fallback: PhotoAnalysis = {
        roomType,
        wallColorName: "White",
        wallColorHex: "#F8F6F1",
        lighting: "Bright & airy",
        floor: "Hardwood",
        description: text,
      };
      setPhotoAnalysis(fallback);
      pushSage("I'll work with that. What's your budget for this room?");
      setPhase("ask-budget");
    }
  };

  // === Confirm-photo branch ===
  const keepThisLook = () => {
    pushUser("Keep this look");
    pushSage("Perfect — I'll build on what's already there. What's your budget for the new pieces?");
    setPhase("ask-budget");
  };

  const tryNew = () => {
    pushUser("Try something new");
    pushSage("Exciting — a fresh direction. What's your budget for this room?");
    setPhase("ask-budget");
  };

  // === Budget ===
  const pickBudget = (b: BudgetTier) => {
    setBudget(b);
    pushUser(b);
    pushSage(
      `${b} — great. Last thing: which style speaks to you? Pick one that feels like home.`,
    );
    setPhase("ask-style");
  };

  // === Style ===
  const pickStyle = (s: StylePhilosophy) => {
    setStyle(s);
    pushUser(s);
    pushSage("Perfect — here is your design brief:");
    setPhase("summary");
  };

  // === Generate ===
  const generate = () => {
    if (!photoAnalysis || !budget || !style || !roomType) return;
    setBrief({
      roomType,
      wallColor: photoAnalysis.wallColorHex,
      wallColorName: photoAnalysis.wallColorName,
      lighting: photoAnalysis.lighting,
      style,
      budget,
    });
    setDreamImage(null);
    setConfirmed(false);
    navigate({ to: "/dream-room" });
  };

  const summaryReady =
    phase === "summary" && photoAnalysis && budget && style && roomType;

  const showInput = phase === "ask-describe";

  // For the left column — what to show below the hero
  const showUploader = phase === "ask-photo";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* === LEFT: Hero + uploader / progress === */}
          <div className="space-y-6">
            <header className="space-y-3 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
                The Intelligent Atelier
              </p>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-foreground">
                Tell us what you need.
                <br />
                <span className="text-gradient-teal">We build your bundle.</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-xl">
                Meet Sage, your personal AI interior design consultant. Together,
                we'll transform your vision into a curated shopping list that
                perfectly fits your space and budget.
              </p>
            </header>

            {/* Uploader — only at start */}
            {showUploader && (
              <section
                id="upload-section"
                className="bg-card rounded-3xl border border-border shadow-sm p-6"
              >
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-muted/30 transition-colors py-12 px-6 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-teal-light flex items-center justify-center">
                      <Camera size={20} className="text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Drop a photo of your space
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Sage will analyze your style, colors, and recommend products
                      that fit your existing architecture.
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileRef.current?.click();
                      }}
                      className="mt-2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Choose photo
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNoPhoto}
                  className="mt-4 w-full text-sm font-semibold text-muted-foreground hover:text-primary transition-colors py-2"
                >
                  I don't have a photo →
                </button>
              </section>
            )}

            {/* Show uploaded photo once analyzed */}
            {!showUploader && uploadedPhoto && (
              <div className="bg-card rounded-3xl border border-border shadow-sm p-4">
                <img
                  src={uploadedPhoto}
                  alt="Your room"
                  className="w-full max-h-72 object-cover rounded-2xl"
                />
                {photoAnalysis && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Detected: {photoAnalysis.roomType} · {photoAnalysis.wallColorName} walls ·{" "}
                    {photoAnalysis.floor} · {photoAnalysis.lighting}
                  </p>
                )}
              </div>
            )}

            {/* Summary card — appears at the end */}
            {summaryReady && (
              <section className="bg-card rounded-3xl border border-primary/30 shadow-teal p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" />
                  <h2 className="font-heading text-xl text-foreground">Your Design Brief</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <SummaryCell label="Room" value={roomType!} />
                  <SummaryCell label="Style" value={style!} />
                  <SummaryCell
                    label="Walls"
                    value={photoAnalysis!.wallColorName}
                    swatch={photoAnalysis!.wallColorHex}
                  />
                  <SummaryCell label="Floor" value={photoAnalysis!.floor} />
                  <SummaryCell label="Lighting" value={photoAnalysis!.lighting} />
                  <SummaryCell label="Budget" value={budget!} />
                </div>
                <button
                  onClick={generate}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-teal text-primary-foreground px-6 py-3.5 rounded-full text-sm font-semibold shadow-teal hover:opacity-90 transition-opacity"
                >
                  <Sparkles size={16} />
                  Generate my dream room
                </button>
              </section>
            )}
          </div>

          {/* === RIGHT: Sage chat panel === */}
          <aside className="lg:sticky lg:top-24 self-start">
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col">
              {/* Header */}
              <div className="bg-gradient-teal text-primary-foreground px-5 py-4 flex items-center gap-3">
                <SageAvatar size={32} />
                <div className="flex-1">
                  <p className="font-semibold text-sm leading-tight">Sage</p>
                  <p className="text-[11px] opacity-90 leading-tight">
                    AI Design Companion
                  </p>
                </div>
                {budget && (
                  <span className="bg-white/20 text-primary-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/30 whitespace-nowrap">
                    Budget: {budget}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="overflow-y-auto p-4 space-y-3"
                style={{ minHeight: 200, maxHeight: 400 }}
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}
                  >
                    {msg.role === "sage" && <SageAvatar size={28} />}
                    <div
                      className={`rounded-xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                        msg.role === "sage"
                          ? "bg-teal-light text-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {(phase === "analyzing" || phase === "parsing") && (
                  <div className="flex gap-2 items-center text-xs text-muted-foreground pl-10">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    Sage is thinking…
                  </div>
                )}
              </div>

              {/* Quick replies / input */}
              <div className="border-t border-border p-3 space-y-2">
                {phase === "ask-photo" && (
                  <div className="flex flex-wrap gap-2">
                    <QuickReply onClick={() => fileRef.current?.click()}>
                      Upload a photo
                    </QuickReply>
                    <QuickReply onClick={handleNoPhoto}>I don't have a photo</QuickReply>
                  </div>
                )}

                {phase === "confirm-photo" && (
                  <div className="flex flex-wrap gap-2">
                    <QuickReply onClick={keepThisLook}>Keep this look</QuickReply>
                    <QuickReply onClick={tryNew}>Try something new</QuickReply>
                  </div>
                )}

                {phase === "ask-room-type" && (
                  <div className="flex flex-wrap gap-2">
                    {ROOM_TYPES.map((rt) => (
                      <QuickReply key={rt} onClick={() => pickRoomType(rt)}>
                        {rt}
                      </QuickReply>
                    ))}
                  </div>
                )}

                {phase === "ask-budget" && (
                  <div className="flex flex-wrap gap-2">
                    {BUDGETS.map((b) => (
                      <QuickReply key={b} onClick={() => pickBudget(b)}>
                        {b}
                      </QuickReply>
                    ))}
                  </div>
                )}

                {phase === "ask-style" && (
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => pickStyle(s.value)}
                        className="relative rounded-lg overflow-hidden h-[90px] border border-border hover:border-primary/60 transition-all text-left"
                      >
                        <img
                          src={s.image}
                          alt={s.value}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                        <span className="absolute bottom-1 left-1.5 right-1.5 text-white text-[10px] font-semibold leading-tight">
                          {s.value}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showInput && (
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitDescription()}
                      placeholder="Describe your room…"
                      className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      onClick={submitDescription}
                      disabled={!input.trim()}
                      className="bg-primary text-primary-foreground rounded-full p-2 hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                )}

                {phase === "summary" && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    Review your design brief on the left, then generate your dream room.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Hidden file input shared with quick-reply "Upload a photo" */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </main>
    </div>
  );
}

function QuickReply({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-teal-light text-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
    >
      {children}
    </button>
  );
}

function SummaryCell({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
      {swatch && (
        <span
          className="w-6 h-6 rounded-full border border-border shrink-0"
          style={{ backgroundColor: swatch }}
        />
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
