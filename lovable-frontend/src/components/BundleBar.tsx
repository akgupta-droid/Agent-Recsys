import { ShoppingCart, Check } from "lucide-react";

export function BundleBar({
  total,
  budget,
  label = "Your Bundle",
  colorClass = "bg-gradient-teal",
  barBgClass,
  barTextClass,
  onCheckout,
}: {
  total: number;
  budget: number;
  label?: string;
  colorClass?: string;
  barBgClass?: string;
  barTextClass?: string;
  onCheckout?: () => void;
}) {
  const pct = Math.min((total / budget) * 100, 100);
  const remaining = budget - total;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-40 shadow-lg ${barBgClass || "bg-card border-t border-border"}`}>
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart size={20} className={barTextClass || "text-primary"} />
          <span className={`font-semibold text-sm ${barTextClass || ""}`}>{label}</span>
        </div>
        <div className="flex-1 max-w-md">
          <div className={`h-2 rounded-full overflow-hidden ${barTextClass ? "bg-white/20" : "bg-muted"}`}>
            <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
          </div>
          <p className={`text-xs mt-1 flex items-center gap-1 ${barTextClass ? barTextClass + " opacity-80" : "text-muted-foreground"}`}>
            ${total} of ${budget} budget · ${remaining} under budget <Check size={12} />
          </p>
        </div>
        <button onClick={onCheckout} className={`${colorClass} text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity`}>
          Checkout — ${total}
        </button>
      </div>
    </div>
  );
}
