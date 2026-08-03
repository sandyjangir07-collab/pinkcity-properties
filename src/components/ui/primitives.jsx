export function Card({ children, className = "" }) {
  return <div className={`bg-surface rounded-3xl border border-ink/[0.06] shadow-soft p-6 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, tone = "stone", Icon, className = "" }) {
  const tones = {
    stone: "from-stone-50 to-stone-100/50 text-stone-600",
    jali: "from-jali-50 to-jali-50/40 text-jali",
    brass: "from-brass/10 to-brass/5 text-brass",
    emerald: "from-emerald-50 to-emerald-100/40 text-emerald-700",
  };
  return (
    <div className={`rounded-2xl border border-ink/[0.06] bg-gradient-to-br ${tones[tone]} p-4 transition-transform hover:-translate-y-0.5 ${className}`}>
      {Icon && <Icon className="w-4 h-4 mb-2 opacity-70" />}
      <div className="font-display text-2xl leading-none text-ink">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/40 mt-1.5">{label}</div>
    </div>
  );
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
