import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { X, Check } from "lucide-react";
import { SageAvatar } from "@/components/SageChat";

interface CheckoutItem {
  name: string;
  price: number;
}

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  items: CheckoutItem[];
  total: number;
  budget: number;
  bundleName: string;
  accentColor?: string;
}

export function CheckoutModal({
  open,
  onClose,
  items,
  total,
  budget,
  bundleName,
  accentColor = "#1D9E75",
}: CheckoutModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [orderNum] = useState(() => `#AGR-${Math.floor(1000 + Math.random() * 9000)}`);

  const saved = budget - total;

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      setStep("form");
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fade-in" style={{ animationDuration: "0.3s" }} />

      {/* Modal */}
      <div
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ animationDuration: "0.3s" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
        >
          <X size={16} />
        </button>

        {step === "form" ? (
          <div className="p-6 space-y-5">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Your style: {bundleName}
            </div>

            <h2 className="font-heading text-2xl">Complete your order</h2>

            {/* Sage message */}
            <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3">
              <SageAvatar size={32} />
              <p className="text-sm text-muted-foreground">
                Great choice — I'll make sure everything arrives together.
                {saved > 0 && ` You saved $${saved} staying under budget!`}
              </p>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="font-medium">${item.price}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span style={{ color: accentColor }}>${total}</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="text"
                placeholder="Delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep("success")}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                Place order
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                Keep browsing
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5 text-center">
            {/* Checkmark */}
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: accentColor }}
            >
              <Check size={32} className="text-white" strokeWidth={3} />
            </div>

            <h2 className="font-heading text-2xl">Your workspace is on its way!</h2>
            <p className="text-xs text-muted-foreground font-medium">Order {orderNum}</p>

            {/* Sage message */}
            <div className="flex items-start gap-3 bg-muted/50 rounded-xl p-3 text-left">
              <SageAvatar size={32} />
              <p className="text-sm text-muted-foreground">
                I had a feeling this was the one. Your bundle ships in 3–5 business days. Check your email for the full order summary.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Link
                to="/lookbook"
                className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white text-center transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor }}
              >
                View your lookbook
              </Link>
              <Link
                to="/"
                className="flex-1 py-2.5 rounded-full text-sm font-semibold border border-border text-center hover:bg-muted transition-colors"
              >
                Start a new search
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
