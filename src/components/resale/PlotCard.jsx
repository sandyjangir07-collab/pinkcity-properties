import { Link } from "react-router-dom";
import { MapPin, Share2, FileText, Map as MapIcon } from "lucide-react";
import { formatINR } from "../../lib/utils";
import { RESALE_STATUS, formatGaj, isImagePath } from "../../lib/resale";

function Fact({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</div>
      <div className="truncate text-[14px] font-semibold text-ink">{value}</div>
    </div>
  );
}

// One listing, readable in five seconds: where, how big, what it costs, is it free.
export default function PlotCard({ plot: p, thumb, onShare }) {
  const st = RESALE_STATUS[p.status] || RESALE_STATUS.available;
  return (
    <div className={`rounded-[22px] border border-ink/[0.06] bg-surface p-4 shadow-soft ${p.archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-[17px] font-semibold text-ink">{p.scheme}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[13px] text-ink/55">
            <span className="shrink-0 font-semibold text-stone-600">Plot {p.plot_number}</span>
            <span>·</span>
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.location}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold ${p.archived ? "bg-ink/10 text-ink/60" : st.cls}`}>
          {p.archived ? "Archived" : st.label}
        </span>
      </div>

      <div className="mt-3.5 flex gap-3.5">
        <Link
          to={`/resale/${p.id}`}
          aria-label="Open site plan and details"
          className="flex h-[84px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-50 text-stone-400"
        >
          {thumb ? (
            <img src={thumb} alt="Site plan" loading="lazy" className="h-full w-full object-cover" />
          ) : p.site_plan_path && !isImagePath(p.site_plan_path) ? (
            <FileText className="h-7 w-7" />
          ) : (
            <MapIcon className="h-7 w-7" />
          )}
        </Link>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5">
          <Fact label="Area" value={formatGaj(p.area_gaj)} />
          <Fact label="Facing" value={p.facing || "—"} />
          <Fact label="Plot size" value={p.dimensions || "—"} />
          <Fact label="Rate" value={`${formatINR(p.rate_per_gaj)}/Gaj`} />
        </div>
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Total demand</div>
          <div className="font-display text-[24px] font-semibold leading-tight text-stone-700">{formatINR(p.total_demand)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Registration</div>
          <div className="text-[14px] font-semibold text-ink">{formatINR(p.registration_amount)}</div>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2.5">
        <Link
          to={`/resale/${p.id}`}
          className="flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-stone-600 text-[14.5px] font-semibold text-white transition-transform active:scale-[0.98]"
        >
          View Details
        </Link>
        <button
          onClick={() => onShare(p)}
          className="flex min-h-[48px] items-center gap-2 rounded-full border border-stone-100 bg-white px-5 text-[14px] font-semibold text-stone-700 transition-transform active:scale-[0.98]"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );
}
