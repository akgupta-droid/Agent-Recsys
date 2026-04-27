import { useState } from "react";
import { Sparkles } from "lucide-react";

export type RoomType = "living-room" | "bedroom" | "office" | "dining-room" | "studio";
export type DesignGoal = "cozy-relaxing" | "focused-productive" | "elegant-entertaining" | "minimal-calm";
export type BudgetTier = "Under $500" | "$500–$700" | "$700–$1000" | "$1000+";
export type StylePreference =
  | "Modern Minimalist"
  | "Mid-Century Warm"
  | "Japandi Zen"
  | "Bohemian Eclectic"
  | "Industrial Loft"
  | "Coastal Bright";

export interface DesignPreferences {
  roomType: RoomType;
  goal: DesignGoal;
  budget: BudgetTier;
  style: StylePreference;
  keepDetectedStyle?: "keep" | "change" | null;
}

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "living-room", label: "Living room" },
  { value: "bedroom", label: "Bedroom" },
  { value: "office", label: "Home office" },
  { value: "dining-room", label: "Dining room" },
  { value: "studio", label: "Studio" },
];

const GOALS: { value: DesignGoal; label: string }[] = [
  { value: "cozy-relaxing", label: "Cozy & relaxing" },
  { value: "focused-productive", label: "Focused & productive" },
  { value: "elegant-entertaining", label: "Elegant for entertaining" },
  { value: "minimal-calm", label: "Minimal & calm" },
];

const BUDGETS: BudgetTier[] = ["Under $500", "$500–$700", "$700–$1000", "$1000+"];

const STYLES: StylePreference[] = [
  "Modern Minimalist",
  "Mid-Century Warm",
  "Japandi Zen",
  "Bohemian Eclectic",
  "Industrial Loft",
  "Coastal Bright",
];

export function PreferencesForm({
  detectedStyle,
  onSubmit,
  initial,
}: {
  detectedStyle?: string | null;
  onSubmit: (prefs: DesignPreferences) => void;
  initial?: Partial<DesignPreferences>;
}) {
  const [roomType, setRoomType] = useState<RoomType | null>(initial?.roomType ?? null);
  const [goal, setGoal] = useState<DesignGoal | null>(initial?.goal ?? null);
  const [budget, setBudget] = useState<BudgetTier | null>(initial?.budget ?? null);
  const [style, setStyle] = useState<StylePreference | null>(initial?.style ?? null);
  const [keepDetected, setKeepDetected] = useState<"keep" | "change" | null>(
    initial?.keepDetectedStyle ?? null,
  );

  const ready =
    roomType && goal && budget && style && (!detectedStyle || keepDetected !== null);

  const submit = () => {
    if (!ready) return;
    onSubmit({
      roomType: roomType!,
      goal: goal!,
      budget: budget!,
      style: style!,
      keepDetectedStyle: detectedStyle ? keepDetected : null,
    });
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">A few quick questions</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {detectedStyle
              ? `I see a ${detectedStyle} room — should we keep this style or try something new?`
              : "Tell me a bit about the space and I'll design it for you."}
          </p>
        </div>
      </div>

      {detectedStyle && (
        <Group label="Detected style">
          <Pill active={keepDetected === "keep"} onClick={() => setKeepDetected("keep")}>
            Keep {detectedStyle}
          </Pill>
          <Pill active={keepDetected === "change"} onClick={() => setKeepDetected("change")}>
            Try something new
          </Pill>
        </Group>
      )}

      <Group label="Room type">
        {ROOM_TYPES.map((r) => (
          <Pill key={r.value} active={roomType === r.value} onClick={() => setRoomType(r.value)}>
            {r.label}
          </Pill>
        ))}
      </Group>

      <Group label="Design goal">
        {GOALS.map((g) => (
          <Pill key={g.value} active={goal === g.value} onClick={() => setGoal(g.value)}>
            {g.label}
          </Pill>
        ))}
      </Group>

      <Group label="Budget">
        {BUDGETS.map((b) => (
          <Pill key={b} active={budget === b} onClick={() => setBudget(b)}>
            {b}
          </Pill>
        ))}
      </Group>

      <Group label="Style preference">
        {STYLES.map((s) => (
          <Pill key={s} active={style === s} onClick={() => setStyle(s)}>
            {s}
          </Pill>
        ))}
      </Group>

      <button
        type="button"
        onClick={submit}
        disabled={!ready}
        className="w-full bg-primary text-primary-foreground rounded-full text-sm font-semibold py-2.5 shadow-teal disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Generate my dream room
      </button>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-primary text-primary-foreground border-primary shadow-teal"
          : "bg-card text-foreground border-border hover:border-primary/60 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}