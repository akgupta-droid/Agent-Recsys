import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SageChatPanel } from "@/components/SageChat";
import { ProductCard, type Product } from "@/components/ProductCard";
import { BundleBar } from "@/components/BundleBar";
import { AccessoryCarousel, type Accessory } from "@/components/AccessoryCarousel";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Star } from "lucide-react";

export const Route = createFileRoute("/bundle/mid-century-warm")({
  component: MidCenturyBundle,
  head: () => ({
    meta: [
      { title: "Mid-Century Warm Bundle — AgentRec" },
      { name: "description", content: "Walnut desk, lounge chair, brass keyboard, and arched lamp — warm mid-century elegance." },
    ],
  }),
});

const products: Product[] = [
  { name: "Walnut Standing Desk", price: 279, category: "Desk", image: "https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=600", shopUrl: "https://www.wayfair.com" },
  { name: "Terracotta Lounge Chair", price: 349, category: "Seating", image: "https://images.pexels.com/photos/1148955/pexels-photo-1148955.jpeg?auto=compress&cs=tinysrgb&w=600", shopUrl: "https://www.amazon.com/dp/B07KGSYK6D" },
  { name: "Brass Keyboard", price: 119, category: "Peripherals", image: "https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=600" },
  { name: "Arched Floor Lamp", price: 159, category: "Lighting", image: "https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?w=600" },
];

const accessories: Accessory[] = [
  { name: "Burnt Orange Wool Rug", price: 229, image: "https://images.pexels.com/photos/6585598/pexels-photo-6585598.jpeg?auto=compress&cs=tinysrgb&w=600", category: "Rug", why: "Grounds the room with warmth underfoot." },
  { name: "Terracotta Clay Vase", price: 65, image: "https://images.pexels.com/photos/4207786/pexels-photo-4207786.jpeg?auto=compress&cs=tinysrgb&w=600", category: "Décor", why: "Earthy texture that echoes the chair." },
  { name: "Vintage Botanical Print", price: 95, image: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600", category: "Art", why: "Organic artwork for a nature-inspired wall." },
  { name: "Brass Desk Lamp", price: 89, image: "https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?w=600", category: "Lighting", why: "Warm brass glow for late-night work." },
  { name: "Leather Desk Pad", price: 55, image: "https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?w=600", category: "Utility", why: "Patinas beautifully over time." },
];

function MidCenturyBundle() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const total = products.reduce((s, p) => s + p.price, 0);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#FAF5EE" }}>
      <Navbar />
      <div className="pt-28 pb-8 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#BA7517" }}>Bundle</p>
              <h1 className="font-heading text-3xl md:text-4xl text-foreground mt-1">Mid-Century Warm</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Rich walnut, warm terracotta, and brass accents for the discerning creative. Like a boutique hotel you never want to leave.
              </p>
            </div>

            <div className="rounded-xl px-4 py-3 flex items-center gap-4" style={{ backgroundColor: "#F0E4D0" }}>
              <div className="flex items-center gap-1">
                <Star size={16} style={{ color: "#BA7517", fill: "#BA7517" }} />
                <span className="font-bold text-sm">91</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <span className="text-sm font-medium text-foreground">Style Harmony Score</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {products.map((p) => (
                <ProductCard key={p.name} product={p} accentClass="bg-gradient-amber" cardBgClass="bg-warm-surface" />
              ))}
            </div>

            <h2 className="font-heading text-xl text-foreground">Accessories</h2>
            <AccessoryCarousel accessories={accessories} accentColor="#BA7517" />
          </div>

          <div>
            <SageChatPanel
              className="sticky top-24"
              initialMessages={[
                { role: "sage", text: "Walnut and terracotta is my all-time favorite combination. This room will feel like a boutique hotel — warm, characterful, impossible to leave." },
              ]}
            />
          </div>
        </div>
      </div>
      <BundleBar
        total={total}
        budget={1000}
        label="Mid-Century Warm Bundle"
        colorClass="bg-gradient-amber"
        barBgClass="bg-amber-dark"
        barTextClass="text-primary-foreground"
        onCheckout={() => setCheckoutOpen(true)}
      />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={products} total={total} budget={1000} bundleName="Mid-Century Warm" accentColor="#BA7517" />
    </div>
  );
}
