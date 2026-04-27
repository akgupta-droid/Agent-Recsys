import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Accessory {
  name: string;
  price: number;
  image: string;
  category?: string;
  why?: string;
}

interface Props {
  accessories: Accessory[];
  accentColor?: string;
}

const IMG_FALLBACK = "https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?w=600";

export function AccessoryCarousel({ accessories, accentColor = "#1D9E75" }: Props) {
  const [current, setCurrent] = useState(0);
  const total = accessories.length;
  const maxDesktop = Math.max(0, total - 3);

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(maxDesktop, c + 1));

  const btnBase =
    "absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center rounded-full border-2 border-white transition-colors disabled:opacity-30";

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          onClick={prev}
          disabled={current === 0}
          className={`${btnBase} -left-5 md:-left-6 w-10 h-10 md:w-12 md:h-12`}
          style={{
            backgroundColor: "#1D9E75",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#085041")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1D9E75")}
        >
          <ChevronLeft size={20} className="text-white" strokeWidth={3} />
        </button>
        <button
          onClick={next}
          disabled={current >= maxDesktop}
          className={`${btnBase} -right-5 md:-right-6 w-10 h-10 md:w-12 md:h-12`}
          style={{
            backgroundColor: "#1D9E75",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#085041")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1D9E75")}
        >
          <ChevronRight size={20} className="text-white" strokeWidth={3} />
        </button>

        <div className="overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * (100 / 3)}%)` }}
          >
            {accessories.map((acc) => (
              <div
                key={acc.name}
                className="w-1/3 max-md:w-full flex-shrink-0 px-1.5"
              >
                <div
                  className="rounded-xl overflow-hidden border bg-card h-full"
                  style={{ borderColor: `${accentColor}30` }}
                >
                  <img
                    src={acc.image}
                    alt={acc.name}
                    className="w-full aspect-[4/3] object-cover"
                    loading="lazy"
                    onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = IMG_FALLBACK; }}
                  />
                  <div className="p-3 space-y-1.5">
                    <span
                      className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                    >
                      {acc.category || "Accessory"}
                    </span>
                    <p className="text-sm font-semibold">{acc.name}</p>
                    <p className="text-sm font-bold" style={{ color: accentColor }}>
                      ${acc.price}
                    </p>
                    {acc.why && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{acc.why}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: maxDesktop + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                backgroundColor: i === current ? accentColor : `${accentColor}30`,
                transform: i === current ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground md:hidden">Swipe to see more</p>
      </div>
    </div>
  );
}
