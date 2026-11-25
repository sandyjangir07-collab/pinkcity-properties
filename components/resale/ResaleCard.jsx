import Link from "next/link";
import { STATUS, formatINR, formatGaj, plotPath } from "../../lib/resale";

export default function ResaleCard({ p }) {
  const st = STATUS[p.status] || STATUS.available;
  return (
    <Link
      href={plotPath(p.public_code)}
      data-cursor="View"
      className="group relative flex flex-col rounded-3xl bg-white/70 border border-ink/[0.06] p-5 shadow-[0_1px_2px_rgba(43,21,18,0.04)] hover:shadow-[0_28px_56px_-24px_rgba(124,46,34,0.30)] hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-ink/45 mb-1">{p.location}</div>
          <div className="font-display text-xl text-ink leading-tight truncate">{p.scheme}</div>
          <div className="mt-0.5 text-sm font-semibold text-stone-600">Plot {p.plot_number}</div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {p.featured && (
        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-brass-light/30 text-brass px-2.5 py-0.5 text-[11px] font-semibold">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
          Plot of the week
        </div>
      )}

      <div className="mt-4 flex items-end justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/40">Total demand</div>
          <div className="font-sans font-bold text-2xl text-stone-700 leading-tight">{formatINR(p.total_demand)}</div>
        </div>
        <div className="text-right text-xs text-ink/50 leading-snug">{formatINR(p.rate_per_gaj)}<br />per Gaj</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/60">
        <span>{formatGaj(p.area_gaj)}</span>
        {p.facing && <span>{p.facing} facing</span>}
        {p.dimensions && <span>{p.dimensions}</span>}
        {p.has_plan && <span className="text-stone-600">Site plan available</span>}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs font-medium text-ink/50 group-hover:text-stone-600 transition-colors">
        <span>View details</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </div>
    </Link>
  );
}
