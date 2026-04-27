import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, ArrowRight, Check, ShieldCheck, Info } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SageAvatar } from "@/components/SageChat";

export const Route = createFileRoute("/quiz")({
  component: StyleQuizPage,
  head: () => ({
    meta: [
      { title: "Style Quiz — AgentRec" },
      { name: "description", content: "Discover your workspace style in 4 quick questions. Sage will recommend the perfect bundle." },
    ],
  }),
});

const questions = [
  {
    question: "What's your ideal workspace mood?",
    options: ["Clean & Modern", "Warm & Cozy", "Minimal & Zen", "Bold & Creative"],
  },
  {
    question: "Pick your primary material preference",
    options: ["White & Metal", "Walnut & Brass", "Light Oak & Paper", "Mixed & Eclectic"],
  },
  {
    question: "How do you feel about color?",
    options: ["Teal & cool tones", "Warm amber & earth", "Neutral monochrome", "Vibrant pops"],
  },
  {
    question: "What's your budget range?",
    options: ["Under $500", "$500–$700", "$700–$1000", "$1000+"],
  },
];

const stores = [
  { name: "IKEA", url: "ikea.com", icon: "🏠" },
  { name: "Wayfair", url: "wayfair.com", icon: "🛋️" },
  { name: "West Elm", url: "westelm.com", icon: "🪴" },
  { name: "Article", url: "article.com", icon: "🪑" },
  { name: "CB2", url: "cb2.com", icon: "✨" },
  { name: "AllModern", url: "allmodern.com", icon: "◻️" },
  { name: "Herman Miller", url: "hermanmiller.com", icon: "💺" },
  { name: "FlexiSpot", url: "flexispot.com", icon: "⬆️" },
  { name: "Etsy", url: "etsy.com", icon: "🎨" },
  { name: "Crate & Barrel", url: "crateandbarrel.com", icon: "📦" },
  { name: "Design Within Reach", url: "dwr.com", icon: "🔲" },
  { name: "Houzz", url: "houzz.com", icon: "🏡" },
];

interface BundleInfo {
  bundle: string;
  path: "/bundle/modern-teal" | "/bundle/mid-century-warm" | "/bundle/japandi-minimal";
  description: string;
  color: string;
  tagline: string;
  price: string;
}

const allBundles: BundleInfo[] = [
  {
    bundle: "Modern Teal",
    path: "/bundle/modern-teal",
    description: "Your aesthetic is clean, fresh, and ergonomic. The Modern Teal bundle keeps you productive in a space that feels intentional.",
    color: "#1D9E75",
    tagline: "Clean · Fresh · Ergonomic",
    price: "$676",
  },
  {
    bundle: "Mid-Century Warm",
    path: "/bundle/mid-century-warm",
    description: "You love warmth and character. The Mid-Century Warm bundle with walnut and terracotta will make your office feel like a boutique hotel.",
    color: "#BA7517",
    tagline: "Warm · Rich · Timeless",
    price: "$906",
  },
  {
    bundle: "Japandi Minimal",
    path: "/bundle/japandi-minimal",
    description: "You seek calm and clarity. The Japandi Minimal bundle creates a serene, distraction-free workspace where restraint is an art form.",
    color: "#2C2C2A",
    tagline: "Calm · Minimal · Serene",
    price: "$536",
  },
];

function getRecommendedIndex(answers: string[]): number {
  const warmSignals = ["Warm & Cozy", "Walnut & Brass", "Warm amber & earth", "$700–$1000", "$1000+"];
  const zenSignals = ["Minimal & Zen", "Light Oak & Paper", "Neutral monochrome", "Under $500", "$500–$700"];
  const modernSignals = ["Clean & Modern", "Bold & Creative", "White & Metal", "Mixed & Eclectic", "Teal & cool tones", "Vibrant pops"];

  let warm = 0, zen = 0, modern = 0;
  for (const a of answers) {
    if (warmSignals.includes(a)) warm++;
    if (zenSignals.includes(a)) zen++;
    if (modernSignals.includes(a)) modern++;
  }

  // Only recommend Japandi when user explicitly picked "Minimal & Zen" AND zen is strictly highest
  if (answers.includes("Minimal & Zen") && zen > warm && zen > modern) {
    return 2; // Japandi
  }
  if (warm > modern && warm > zen) {
    return 1; // Mid-Century Warm
  }
  return 0; // Modern Teal (default)
}

type Phase = "quiz" | "stores" | "searching" | "result";

function StyleQuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const quizDone = step >= questions.length;
  const recommendedIdx = quizDone ? getRecommendedIndex(answers) : 0;
  const result = quizDone ? allBundles[recommendedIdx] : null;
  const otherBundles = quizDone ? allBundles.filter((_, i) => i !== recommendedIdx) : [];

  const selectOption = (opt: string) => {
    setAnswers((prev) => [...prev, opt]);
    const nextStep = step + 1;
    setStep(nextStep);
    if (nextStep >= questions.length) {
      setPhase("stores");
    }
  };

  const toggleStore = (name: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleContinue = () => {
    setPhase("searching");
    setTimeout(() => {
      setPhase("result");
    }, 2000);
  };

  const handleSkip = () => {
    setPhase("result");
  };

  const selectedCount = selectedStores.size;
  const canContinue = selectedCount >= 2;
  const storeNamesList = Array.from(selectedStores).join(", ");

  // Progress bar: 5 steps total (4 questions + stores)
  const totalSteps = 5;
  const currentProgress = phase === "quiz" ? step : totalSteps;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-6 max-w-2xl mx-auto">
        {/* Header */}
        {phase === "quiz" && (
          <>
            <div className="flex items-center gap-3 mb-8">
              <SageAvatar size={48} />
              <div>
                <h1 className="font-heading text-3xl text-foreground">Style Quiz</h1>
                <p className="text-sm text-muted-foreground">4 questions to find your perfect bundle</p>
              </div>
            </div>

            <div className="flex gap-1 mb-8">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < currentProgress ? "bg-primary" : i === currentProgress ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="space-y-4">
              <h2 className="font-heading text-2xl text-foreground">
                {questions[step].question}
              </h2>
              <p className="text-sm text-muted-foreground">
                Question {step + 1} of {questions.length}
              </p>
              <div className="grid gap-3 mt-6">
                {questions[step].options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => selectOption(opt)}
                    className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 text-left hover:border-primary hover:bg-teal-light/30 transition-all group"
                  >
                    <span className="font-medium text-sm">{opt}</span>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Store Connection Screen */}
        {phase === "stores" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShieldCheck size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="font-heading text-2xl text-foreground">Connect your favorite stores</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Sage searches across your connected retailers to find the best products for your style. Select at least 2 stores.
            </p>

            {/* Progress bar */}
            <div className="flex gap-1 mb-6">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < totalSteps ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 mb-8">
              <Info size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground/80">
                <span className="font-semibold">Secure &amp; encrypted</span> — We only search public product pages. No login or personal data required.
              </p>
            </div>

            {/* Store grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {stores.map((store) => {
                const isSelected = selectedStores.has(store.name);
                return (
                  <button
                    key={store.name}
                    onClick={() => toggleStore(store.name)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-5 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check size={12} className="text-primary-foreground" />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                      {store.icon}
                    </div>
                    <span className="font-medium text-sm text-foreground text-center leading-tight">{store.name}</span>
                    <span className="text-xs text-muted-foreground">{store.url}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom actions */}
            <div className="space-y-3">
              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className={`w-full py-3 rounded-full font-semibold text-sm transition-all ${
                  canContinue
                    ? "bg-primary text-primary-foreground hover:opacity-90 shadow-teal"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                Continue ({selectedCount} selected)
              </button>
              <button
                onClick={handleSkip}
                className="block mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Searching state */}
        {phase === "searching" && (
          <div className="animate-in fade-in duration-500 flex flex-col items-center justify-center py-16 space-y-6">
            <SageAvatar size={56} />
            <div className="text-center space-y-2 max-w-md">
              <h2 className="font-heading text-2xl text-foreground">Searching your stores…</h2>
              <p className="text-sm text-muted-foreground">
                "Perfect — I'll search {storeNamesList || "your favorite stores"} to find products that match your style and budget. Give me a moment."
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-primary"
                  style={{
                    animation: "sage-pulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {phase === "result" && result && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <SageAvatar size={48} />
              <div>
                <h1 className="font-heading text-3xl text-foreground">Your Result</h1>
                <p className="text-sm text-muted-foreground">Based on your style + connected stores</p>
              </div>
            </div>

            {/* Primary recommendation */}
            <div className="rounded-2xl p-6 border-2" style={{ borderColor: result.color, backgroundColor: result.color + "10" }}>
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 text-primary-foreground" style={{ backgroundColor: result.color }}>
                Sage's top pick for you
              </span>
              <div className="flex items-center gap-3 mb-3">
                <SageAvatar size={36} />
                <p className="font-semibold text-sm">Sage's Recommendation</p>
              </div>
              <h2 className="font-heading text-2xl mb-2" style={{ color: result.color }}>
                {result.bundle} Bundle
              </h2>
              <p className="text-sm text-muted-foreground mb-4">{result.description}</p>
              <div className="flex items-center gap-3">
                <Link
                  to={result.path}
                  className="inline-flex items-center gap-2 text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: result.color }}
                >
                  View Bundle <ArrowRight size={16} />
                </Link>
                <span className="text-sm font-medium text-muted-foreground">{result.price}</span>
              </div>
            </div>

            {/* Other bundles */}
            <div>
              <h3 className="font-heading text-lg text-foreground mb-3">Explore other styles</h3>
              <div className="grid grid-cols-2 gap-3">
                {otherBundles.map((b) => (
                  <div key={b.bundle} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <h4 className="font-heading text-base" style={{ color: b.color }}>{b.bundle}</h4>
                    <p className="text-xs text-muted-foreground">{b.tagline}</p>
                    <p className="text-sm font-semibold text-foreground">{b.price}</p>
                    <Link
                      to={b.path}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border-2 transition-colors hover:opacity-80"
                      style={{ borderColor: b.color, color: b.color }}
                    >
                      View Bundle <ArrowRight size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setStep(0); setAnswers([]); setPhase("quiz"); setSelectedStores(new Set()); }}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              Retake quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
