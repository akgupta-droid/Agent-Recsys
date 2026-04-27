import { Plus, Check, ExternalLink } from "lucide-react";
import { useState } from "react";

export interface Product {
  name: string;
  price: number;
  category: string;
  image?: string;
  color?: string;
  shopUrl?: string;
}

const IMG_FALLBACK = "https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?w=600";

export function ProductCard({ product, accentClass = "bg-gradient-teal", cardBgClass }: { product: Product; accentClass?: string; cardBgClass?: string }) {
  const [added, setAdded] = useState(true);

  return (
    <div className={`group ${cardBgClass || "bg-card"} rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow`}>
      <div className="aspect-[4/3] relative overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = IMG_FALLBACK; }} />
        ) : (
          <div className={`w-full h-full ${product.color || "bg-muted"} flex items-center justify-center`}>
            <span className="text-3xl">🪑</span>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={() => setAdded(!added)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${added ? accentClass + " text-white shadow-md" : "bg-white/80 backdrop-blur text-foreground hover:bg-white"}`}
          >
            {added ? <Check size={14} strokeWidth={3} /> : <Plus size={14} strokeWidth={3} />}
          </button>
          {product.shopUrl && (
            <a
              href={product.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full bg-white/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-white transition-colors"
            >
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{product.category}</p>
        <p className="text-sm font-semibold mt-0.5">{product.name}</p>
        <p className="text-sm font-bold text-primary mt-1">${product.price}</p>
      </div>
    </div>
  );
}
