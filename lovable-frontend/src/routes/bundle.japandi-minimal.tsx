import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SageChatPanel } from "@/components/SageChat";
import { ProductCard, type Product } from "@/components/ProductCard";
import { BundleBar } from "@/components/BundleBar";
import { AccessoryCarousel, type Accessory } from "@/components/AccessoryCarousel";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Star } from "lucide-react";

export const Route = createFileRoute("/bundle/japandi-minimal")({
  component: JapandiBundle,
  head: () => ({
    meta: [
      { title: "Japandi Minimal Bundle — AgentRec" },
      { name: "description", content: "Oak desk, charcoal chair, white keyboard, and paper lamp — serene Japandi minimalism." },
    ],
  }),
});

const products: Product[] = [
  { name: "Oak Desk", price: 199, category: "Desk", image: "https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { name: "Floor Chair Charcoal", price: 169, category: "Seating", image: "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { name: "Slim Wireless Keyboard", price: 89, category: "Peripherals", image: "https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?w=600", shopUrl: "https://www.amazon.com" },
  { name: "Paper Pendant Lamp", price: 149, category: "Lighting", image: "https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?w=600" },
];

const accessories: Accessory[] = [
  { name: "Jute Rug", price: 159, image: "https://images.pexels.com/photos/6207819/pexels-photo-6207819.jpeg?w=600", category: "Rug", why: "Natural texture that softens the minimal palette." },
  { name: "Black Bud Vase", price: 35, image: "https://images.pexels.com/photos/4207892/pexels-photo-4207892.jpeg?w=600", category: "Décor", why: "One stem, one vase — wabi-sabi simplicity." },
  { name: "Japanese Ink Wash Print", price: 85, image: "https://images.pexels.com/photos/1568607/pexels-photo-1568607.jpeg?w=600", category: "Art", why: "Meditative brushwork for a calm wall." },
  { name: "Bamboo Organizer", price: 45, image: "https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?w=600", category: "Utility", why: "Keeps essentials tidy without plastic." },
  { name: "Linen Cushion", price: 55, image: "https://images.pexels.com/photos/6207820/pexels-photo-6207820.jpeg?w=600", category: "Comfort", why: "Adds warmth to the floor chair." },
];

function JapandiBundle() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const total = products.reduce((s, p) => s + p.price, 0);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F5F0E8" }}>
      <Navbar />
      <div className="pt-28 pb-8 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: "#2C2C2A" }}>Bundle</p>
              <h1 className="font-heading text-3xl md:text-4xl mt-2" style={{ color: "#2C2C2A" }}>Japandi Minimal</h1>
              <p className="text-sm mt-3" style={{ color: "#6B6B67" }}>
                Japanese simplicity meets Scandinavian warmth. Restraint as an art form.
              </p>
            </div>

            <div className="rounded-xl px-4 py-3 flex items-center gap-4" style={{ backgroundColor: "#EDE8DE" }}>
              <div className="flex items-center gap-1">
                <Star size={16} style={{ color: "#2C2C2A", fill: "#2C2C2A" }} />
                <span className="font-bold text-sm" style={{ color: "#2C2C2A" }}>96</span>
                <span className="text-xs" style={{ color: "#6B6B67" }}>/100</span>
              </div>
              <span className="text-sm font-medium" style={{ color: "#2C2C2A" }}>Style Harmony Score</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {products.map((p) => (
                <ProductCard key={p.name} product={p} accentClass="bg-gradient-charcoal" cardBgClass="bg-ivory" />
              ))}
            </div>

            <h2 className="font-heading text-xl" style={{ color: "#2C2C2A" }}>Accessories</h2>
            <AccessoryCarousel accessories={accessories} accentColor="#2C2C2A" />
          </div>

          <div>
            <SageChatPanel
              className="sticky top-24"
              initialMessages={[
                { role: "sage", text: "This is restraint as an art form. Every piece chosen for what it doesn't do as much as what it does. Your space will feel like a breath of fresh air." },
              ]}
            />
          </div>
        </div>
      </div>
      <BundleBar
        total={total}
        budget={600}
        label="Japandi Minimal Bundle"
        colorClass="bg-gradient-charcoal"
        barBgClass="bg-charcoal"
        barTextClass="text-ivory"
        onCheckout={() => setCheckoutOpen(true)}
      />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={products} total={total} budget={600} bundleName="Japandi Minimal" accentColor="#2C2C2A" />
    </div>
  );
}
