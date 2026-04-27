import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

interface Message {
  role: "sage" | "user";
  text: string;
}

export function SageAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 35%, #1D9E75, #15856280, #BA751740)",
        animation: "sage-pulse 3s ease-in-out infinite",
        boxShadow: "0 0 12px 2px rgba(29, 158, 117, 0.25)",
      }}
    />
  );
}

export function SageChatPanel({
  initialMessages,
  className = "",
  quickReplies,
  budget,
  injectedMessages,
}: {
  initialMessages?: Message[];
  className?: string;
  quickReplies?: string[];
  budget?: string | null;
  injectedMessages?: { id: string; text: string; role?: "sage" | "user" }[];
}) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages || [
      {
        role: "sage",
        text: "Hi, I'm Sage — think of me less as a chatbot and more as a design friend who happens to know every product catalogue by heart. Tell me what you're working with: the room, the vibe you're after, anything that's bothering you about your current setup. I'll take it from there.",
      },
    ]
  );
  const [input, setInput] = useState("");
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!injectedMessages) return;
    const fresh = injectedMessages.filter((m) => !seenIds.current.has(m.id));
    if (fresh.length === 0) return;
    fresh.forEach((m) => seenIds.current.add(m.id));
    setMessages((prev) => [
      ...prev,
      ...fresh.map((m) => ({ role: m.role ?? "sage", text: m.text } as Message)),
    ]);
  }, [injectedMessages]);

  const craftSageReply = (userText: string): string => {
    const t = userText.toLowerCase();

    // Budget signals
    const budgetMatch = t.match(/\$?\s?(\d{3,4})/);
    if (/budget|under|spend|afford|\$/.test(t) && budgetMatch) {
      const n = parseInt(budgetMatch[1], 10);
      if (n <= 550) {
        return "Great — a tighter budget actually pushes us toward smarter, more intentional choices. With that ceiling I'd point you at the **Japandi Minimal** bundle: oak, charcoal, paper. Restraint reads as sophistication. One question before I lock it in: do you work long hours at the desk, or is this more of a check-in-and-out space? That changes the chair I pick.";
      }
      if (n <= 750) {
        return "Perfect range — that's the sweet spot where ergonomics and aesthetics stop fighting each other. I'm leaning toward **Modern Teal** for you: clean lines, a properly adjustable chair, and just enough warmth from the wood tones to keep it from feeling clinical. Quick check — is the room more cool-lit (north-facing, fluorescents) or warm-lit (afternoon sun, lamps)? I want to match the accents to what's already there.";
      }
      return "Beautiful — at that level we stop compromising. **Mid-Century Warm** is calling: walnut, terracotta, brass. It feels like a boutique hotel study. Before I finalize, tell me one thing — do you want this room to feel calm and grounding, or rich and a little dramatic? Both are gorgeous, just very different moods.";
    }

    // Home office / desk setup
    if (/office|desk|work(space|ing)?|wfh|remote/.test(t)) {
      return "I can see from your room that you prefer clean lines and neutral tones — that tells me a lot already. One question before I build your bundle: is ergonomics your top priority, or are you more focused on the aesthetic look of the space? This will help me choose between two very different directions.";
    }

    // Style cues
    if (/minimal|zen|japandi|calm|clean/.test(t)) {
      return "Minimal lovers are my favourite to work with — every piece has to earn its place. The **Japandi Minimal** bundle was made for this brief: oak desk, charcoal task chair, paper-shade lamp. Quick question: do you want any warmth in there (a small ceramic, a single plant), or do you want it almost monastic? Both work, but the accessories shift completely.";
    }
    if (/mid.?century|warm|cozy|walnut|brass|terracotta/.test(t)) {
      return "Mid-century is such a forgiving language — it makes a room feel lived-in immediately. I'm picturing the **Mid-Century Warm** bundle for you: walnut standing desk, terracotta lounge chair, brass desk lamp. One thing I want to get right — is this a guest-facing room (clients, video calls) or your private hideaway? It changes how loud I let the brass get.";
    }
    if (/modern|sleek|teal|tech|clean.?lines/.test(t)) {
      return "Modern done well isn't cold — it's confident. **Modern Teal** balances ergonomic credentials with just enough colour to feel human. Before I commit, tell me: do you sit at this desk for deep focus blocks, or are you in and out all day? The chair recommendation hinges on that.";
    }

    // Color / mood
    if (/dark|moody|black|charcoal/.test(t)) {
      return "I love a moody room — they photograph beautifully and feel cocoon-like to work in. We can lean **Industrial** or push **Japandi** darker. One question: how much natural light does the room get? Moody works gorgeously in well-lit rooms; in a dim space it can fight you.";
    }
    if (/bright|airy|light|white|scandi/.test(t)) {
      return "Light and airy is the easiest brief to get wrong — too sterile and it feels like a dentist's office. I'd take you toward **Scandinavian** or a softer **Japandi**: pale woods, off-whites, one grounding dark accent. Tell me — do you want any colour at all, or is this strictly a neutrals-only request?";
    }

    // Default — warm, specific, asks a question
    return "Got it — let me sit with that for a second. To point you in the right direction without guessing, can you tell me one of two things: the **mood** you want the room to give off (calm, energising, sophisticated, playful), or the **time of day** you'll use it most? Either one tells me a lot about which bundle is going to actually feel right, not just look right in photos.";
  };

  const sendText = (text: string) => {
    const userText = text.trim();
    if (!userText) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText },
      { role: "sage", text: craftSageReply(userText) },
    ]);
  };

  const send = () => {
    if (!input.trim()) return;
    sendText(input);
    setInput("");
  };

  return (
    <div className={`flex flex-col bg-card rounded-2xl border border-border shadow-sm ${className}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "sage" && <SageAvatar size={28} />}
            <div
              className={`rounded-xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                msg.role === "sage"
                  ? "bg-teal-light text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask Sage anything..."
          className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={send}
          className="bg-primary text-primary-foreground rounded-full p-2 hover:opacity-90 transition-opacity"
        >
          <Send size={16} />
        </button>
      </div>
      {quickReplies && quickReplies.length > 0 && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendText(q)}
              className="bg-teal-light text-foreground px-3 py-1.5 rounded-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
