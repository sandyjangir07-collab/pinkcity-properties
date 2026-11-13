import { Link } from "react-router-dom";
import { MapPin, Star, Compass, Ruler } from "lucide-react";
import { formatINR } from "../../lib/utils";
import { formatGaj, RESALE_STATUS } from "../../lib/resale";

export function PublicCard({ p, search }) {
  const st = RESALE_STATUS[p.status] || RESALE_STATUS.available;
  return (
    <Link
      to={`/p/${encodeURIComponent(p.public_code)}${search}`}
      className="group block rounded-[22px] border border-ink/[0.06] bg-white p-4 shadow-soft transition hover:shadow-lift active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-display text-[18px] font-semibold text-ink">{p.scheme}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[13px] text-ink/55">
            <span className="shrink-0 font-semibold text-crimson">Plot {p.plot_number}</span>
            <span>·</span>
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.location}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold ${st.cls}`}>{st.label}</span>
      </div>
      {p.featured && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800"><Star className="h-3 w-3 fill-current" /> Plot of the week</div>
      )}
      <div className="mt-3 flex items-end justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Total demand</div>
          <div className="font-display text-[24px] font-semibold leading-tight text-crimson-deep">{formatINR(p.total_demand)}</div>
        </div>
        <div className="text-right text-[12px] text-ink/50">{formatINR(p.rate_per_gaj)}<br />per Gaj</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink/60">
        <span className="inline-flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {formatGaj(p.area_gaj)}</span>
        {p.facing && <span className="inline-flex items-center gap-1"><Compass className="h-3.5 w-3.5" /> {p.facing} facing</span>}
        {p.dimensions && <span>{p.dimensions}</span>}
      </div>
      <div className="mt-3.5 flex min-h-[46px] items-center justify-center rounded-full bg-crimson text-[14px] font-semibold text-white">View details</div>
    </Link>
  );
}
