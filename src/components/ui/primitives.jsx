export function Card({ children, className = "" }) {
  return <div className={`bg-surface rounded-3xl border border-ink/[0.06] shadow-soft p-6 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-lg text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-ink/[0.05] text-ink/50",
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600",
    stone: "bg-stone-50 text-stone-600",
  };
  return <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${tones[tone]}`}>{children}</span>;
}
