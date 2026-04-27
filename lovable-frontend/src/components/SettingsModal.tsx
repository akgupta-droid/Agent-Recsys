import { useEffect, useState } from "react";
import { X, KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useApiKey } from "@/context/ApiKeyContext";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { apiKey, setApiKey, googleApiKey, setGoogleApiKey } = useApiKey();
  const [draft, setDraft] = useState(apiKey);
  const [googleDraft, setGoogleDraft] = useState(googleApiKey);
  const [reveal, setReveal] = useState(false);
  const [revealGoogle, setRevealGoogle] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(apiKey);
      setGoogleDraft(googleApiKey);
    }
  }, [open, apiKey, googleApiKey]);

  if (!open) return null;

  const save = () => {
    setApiKey(draft.trim());
    setGoogleApiKey(googleDraft.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-light flex items-center justify-center">
              <KeyRound size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading text-xl text-foreground">Settings</h2>
              <p className="text-xs text-muted-foreground">Connect your AI provider keys</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">OpenAI API Key</label>
        <div className="relative mt-2">
          <input
            type={reveal ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono"
          />
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="text-xs font-semibold text-foreground uppercase tracking-wider mt-5 block">
          Google AI Studio Key
        </label>
        <div className="relative mt-2">
          <input
            type={revealGoogle ? "text" : "password"}
            value={googleDraft}
            onChange={(e) => setGoogleDraft(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono"
          />
          <button
            type="button"
            onClick={() => setRevealGoogle((r) => !r)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {revealGoogle ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Used to generate your Dream Room image. Get one at{" "}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            aistudio.google.com
          </a>
          .
        </p>

        <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground bg-teal-light/40 rounded-lg p-3">
          <ShieldCheck size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <p>
            Keys are saved to this browser&apos;s localStorage. They are sent only directly to the matching provider. Clear a field and save to remove it.
          </p>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-teal"
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}
