import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X, Settings } from "lucide-react";
import { useState } from "react";
import { useApiKey } from "@/context/ApiKeyContext";
import { SettingsModal } from "@/components/SettingsModal";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Dream Room", to: "/dream-room" },
  { label: "Shopping", to: "/shopping" },
  { label: "Lookbook", to: "/lookbook" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { hasKey } = useApiKey();
  const location = useLocation();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="font-heading text-2xl font-bold text-foreground tracking-tight">
          AgentRec
        </Link>
        <div className="hidden md:flex gap-6 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

        </div>
        <div className="hidden md:flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="relative w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <Settings size={18} />
            {hasKey && (
              <span
                className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#1D9E75] ring-2 ring-card"
                title="API key saved"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("upload-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get Started
          </button>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="relative w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground"
          >
            <Settings size={16} />
            {hasKey && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1D9E75] ring-2 ring-card" />
            )}
          </button>
          <button onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-3 bg-background border-b border-border">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setOpen(false)} className="text-sm font-medium text-foreground py-2">
              {link.label}
            </Link>
          ))}
        </div>
      )}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </nav>
  );
}
