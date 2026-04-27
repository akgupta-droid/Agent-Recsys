import { createFileRoute } from "@tanstack/react-router";
import { Download, Share2, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SageAvatar } from "@/components/SageChat";
import { useDesign } from "@/context/DesignContext";
import { getProductsForStyle, parseBudget, getStoreLink } from "@/lib/style-products";
import type { StylePhilosophy } from "@/context/DesignContext";

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

export const Route = createFileRoute("/lookbook")({
  component: LookbookPage,
  head: () => ({
    meta: [
      { title: "Your Lookbook — AgentRec" },
      { name: "description", content: "Your curated room design lookbook. Download or share your personalized bundle." },
    ],
  }),
});

function LookbookPage() {
  const { brief, dreamImage } = useDesign();
  const style = brief?.style ?? "Japandi Zen";
  const products = getProductsForStyle(style);
  const budget = parseBudget(brief?.budget);
  const total = products.reduce((s, p) => s + p.price, 0);
  const heroImage = dreamImage ?? STYLE_PLACEHOLDERS[style];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-xs text-primary uppercase tracking-widest font-semibold">Your {style} Collection</p>
          <h1 className="font-heading text-4xl md:text-5xl text-foreground mt-2">Lookbook</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            A magazine-style overview of your {style.toLowerCase()} bundle — {products.length} pieces, ${total} total ({budget.label} budget).
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden mb-8 relative">
          <img
            src={heroImage}
            alt={`Your ${style} room`}
            className="w-full aspect-[16/9] object-cover"
            loading="lazy"
          />
          {!dreamImage && (
            <span className="absolute top-3 left-3 bg-background/80 backdrop-blur text-foreground text-xs px-3 py-1 rounded-full border border-border">
              Imagen AI preview — will be generated live in production
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {products.map((p, i) => {
            const link = getStoreLink(p, style, i);
            return (
            <div key={p.name} className="bg-card border border-border rounded-xl p-4">
              <div className={`aspect-square rounded-lg overflow-hidden mb-3 bg-gradient-to-br ${p.gradient} flex items-center justify-center text-5xl`}>
                <span aria-hidden>{p.emoji}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.category}</p>
              <h3 className="font-semibold text-sm">{p.name}</h3>
              <p className="text-primary font-bold text-sm">${p.price}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 w-full bg-gradient-teal text-primary-foreground text-xs font-semibold px-3 py-2 rounded-full hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={11} /> {link.label}
              </a>
            </div>
            );
          })}
        </div>

        <div className="bg-teal-light rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <SageAvatar size={44} />
            <div>
              <p className="font-semibold text-foreground">Sage's Personal Style Note</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                "Your {style} bundle balances form and function — each piece was chosen to harmonise
                with the others within your {budget.label} budget, creating a layered, intentional space
                that feels uniquely yours."
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button className="flex items-center gap-2 bg-gradient-teal text-primary-foreground px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-teal">
            <Download size={16} />
            Download PDF
          </button>
          <button className="flex items-center gap-2 border border-primary text-primary px-6 py-3 rounded-full font-semibold text-sm hover:bg-teal-light transition-colors">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
