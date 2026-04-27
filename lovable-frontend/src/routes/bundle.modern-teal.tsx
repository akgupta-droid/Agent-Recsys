import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SageChatPanel } from "@/components/SageChat";
import { ProductCard, type Product } from "@/components/ProductCard";
import { BundleBar } from "@/components/BundleBar";
import { AccessoryCarousel, type Accessory } from "@/components/AccessoryCarousel";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Star } from "lucide-react";

export const Route = createFileRoute("/bundle/modern-teal")({
  component: ModernTealBundle,
  head: () => ({
    meta: [
      { title: "Modern Teal Bundle — AgentRec" },
      { name: "description", content: "Standing desk, ergonomic chair, keyboard, and lamp — curated for clean modern productivity." },
    ],
  }),
});

const products: Product[] = [
  { name: "Standing Desk", price: 249, category: "Desk", image: "https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?auto=compress&cs=tinysrgb&w=600", shopUrl: "https://www.flexispot.com/standard-standing-desk-e2" },
  { name: "Ergonomic Chair", price: 199, category: "Seating", image: "https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=600", shopUrl: "https://www.amazon.com/dp/B08H1Y8S21" },
  { name: "Mechanical Keyboard", price: 99, category: "Peripherals", image: "https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?w=600" },
  { name: "Task Lamp", price: 129, category: "Lighting", image: "https://images.pexels.com/photos/1112598/pexels-photo-1112598.jpeg?w=600" },
];

const accessories: Accessory[] = [
  { name: "Geometric Teal Rug", price: 189, image: "https://images.pexels.com/photos/6207819/pexels-photo-6207819.jpeg?w=600", category: "Rug", why: "Ties the teal accent into the floor plane." },
  { name: "White Ceramic Vase", price: 49, image: "https://images.pexels.com/photos/4207892/pexels-photo-4207892.jpeg?w=600", category: "Décor", why: "Clean silhouette that won't compete with your setup." },
  { name: "Abstract Wall Print", price: 79, image: "https://images.pexels.com/photos/1568607/pexels-photo-1568607.jpeg?w=600", category: "Art", why: "Adds visual interest without clutter." },
  { name: "Desk Plant", price: 35, image: "https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?w=600", category: "Plant", why: "A touch of life that improves focus." },
  { name: "Cable Organizer", price: 25, image: "https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?w=600", category: "Utility", why: "Keeps the clean-desk illusion intact." },
];

function ModernTealBundle() {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const total = products.reduce((s, p) => s + p.price, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-28 pb-8 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#1D9E75" }}>Bundle</p>
              <h1 className="font-heading text-3xl md:text-4xl text-foreground mt-1">Modern Teal</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Clean lines, ergonomic design, and cool teal accents for the modern professional.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-teal-light rounded-xl px-4 py-3">
              <div className="flex items-center gap-1">
                <Star size={16} className="text-primary fill-primary" />
                <span className="font-bold text-sm">94</span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
              <span className="text-sm font-medium text-foreground">Style Harmony Score</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {products.map((p) => (
                <ProductCard key={p.name} product={p} />
              ))}
            </div>

            <h2 className="font-heading text-xl text-foreground">Accessories</h2>
            <AccessoryCarousel accessories={accessories} accentColor="#1D9E75" />
          </div>

          <div>
            <SageChatPanel
              className="sticky top-24"
              initialMessages={[
                { role: "sage", text: "Clean lines, cool tones, built for focus. This is my most popular setup for professionals who want their space to feel intentional." },
              ]}
            />
          </div>
        </div>
      </div>
      <BundleBar total={total} budget={700} label="Modern Teal Bundle" onCheckout={() => setCheckoutOpen(true)} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} items={products} total={total} budget={700} bundleName="Modern Teal" accentColor="#1D9E75" />
    </div>
  );
}
