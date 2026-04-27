import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink, ArrowLeft, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useDesign } from "@/context/DesignContext";
import { getProductsForStyle, parseBudget, getStoreLink } from "@/lib/style-products";

export const Route = createFileRoute("/shopping")({
  component: ShoppingPage,
  head: () => ({
    meta: [
      { title: "Your Shopping List — AgentRec" },
      { name: "description", content: "Sage's curated picks matched to your style and budget. Research copilot — links out to external stores." },
    ],
  }),
});

function ShoppingPage() {
  const navigate = useNavigate();
  const { brief } = useDesign();

  const style = brief?.style ?? "Japandi Zen";
  const products = getProductsForStyle(style);
  const budget = parseBudget(brief?.budget);
  const total = products.reduce((s, p) => s + p.price, 0);
  const remaining = budget.max - total;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />
      <div className="pt-24 pb-12 px-6 max-w-6xl mx-auto">
        <button
          onClick={() => navigate({ to: "/dream-room" })}
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-4"
        >
          <ArrowLeft size={14} /> Back to dream room
        </button>

        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl text-foreground">
              Sage's Picks for Your {style}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Curated to match your style and stay within your {budget.label} budget.
              I'll point you to where to shop — purchasing happens on the brand's site.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
            <ShoppingBag size={12} /> Research copilot — no checkout
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p, i) => {
            const link = getStoreLink(p, style, i);
            return (
            <div
              key={p.name}
              className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col"
            >
              <div className={`aspect-[4/3] bg-gradient-to-br ${p.gradient} flex items-center justify-center text-5xl`}>
                <span aria-hidden>{p.emoji}</span>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {p.category}
                </span>
                <div className="flex items-baseline justify-between gap-2 mt-1">
                  <h3 className="font-heading text-base text-foreground">{p.name}</h3>
                  <p className="text-sm font-bold text-foreground whitespace-nowrap">${p.price}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed flex-1">
                  {p.why}
                </p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center gap-2 bg-gradient-teal text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
                >
                  <ExternalLink size={12} /> {link.label}
                </a>
              </div>
            </div>
            );
          })}
        </div>

      </div>

      {/* Bundle bar — totals only, no checkout */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-full shadow-lg px-6 py-3 flex items-center gap-6 md:gap-8">
        <Stat label="Total Bundle" value={`$${total.toLocaleString()}`} highlight />
        <Divider />
        <Stat label="Budget" value={budget.label} />
        <Divider />
        <Stat
          label="Remaining"
          value={`$${remaining.toLocaleString()}`}
          tone={remaining >= 0 ? "good" : "bad"}
        />
        <Divider />
        <Stat label="Items" value={String(products.length)} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "good" | "bad";
}) {
  const color = tone === "bad" ? "text-destructive" : highlight ? "text-primary" : "text-foreground";
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase text-muted-foreground tracking-wider">
        {label}
      </p>
      <p className={`text-base md:text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-border" />;
}