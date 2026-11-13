import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Globe, Check, Share2 } from "lucide-react";
import { formatINR } from "../../lib/utils";
import { RESALE_STATUS, formatGaj, isStale, confirmLabel } from "../../lib/resale";

// A compact line for the inventory list. Admins can change status and rate, star a plot,
// switch it public, or re-confirm it right here, without opening the plot.
export default function PlotRow({ plot: p, isAdmin, selectMode, selected, onToggle, onPatch, onShare }) {
  const [rate, setRate] = useState(String(p.rate_per_gaj ?? ""));
  const [lastRate, setLastRate] = useState(p.rate_per_gaj);
  if (p.rate_per_gaj !== lastRate) {
    setLastRate(p.rate_per_gaj);
    setRate(String(p.rate_per_gaj ?? ""));
  }
  const st = RESALE_STATUS[p.status] || RESALE_STATUS.available;
  const stale = isStale(p);

  function saveRate() {
    const n = Number(rate);
    if (rate === "" || !(n >= 0)) return setRate(String(p.rate_per_gaj ?? ""));
    if (n !== Number(p.rate_per_gaj)) onPatch([p.id], { rate_per_gaj: n });
  }

  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full border transition active:scale-90";

  return (
    <div className={`rounded-2xl border bg-surface px-3.5 py-3 shadow-soft ${selected ? "border-stone-600 ring-2 ring-stone-600/25" : "border-ink/[0.06]"} ${p.archived ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        {selectMode && (
          <input type="checkbox" aria-label={`Select plot ${p.plot_number}`} className="mt-1 h-5 w-5 shrink-0 accent-stone-600" checked={!!selected} onChange={() => onToggle(p.id)} />
        )}
        <Link to={`/resale/${p.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14.5px] font-semibold text-ink">{p.scheme}</span>
            <span className="shrink-0 text-[14px] font-bold text-stone-600">· {p.plot_number}</span>
            {p.featured && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
            {isAdmin && p.is_public && <Globe className="h-3.5 w-3.5 shrink-0 text-sky-600" />}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-ink/50">
            {p.location} · {formatGaj(p.area_gaj)}{p.facing ? ` · ${p.facing}` : ""}{p.dimensions ? ` · ${p.dimensions}` : ""}
          </div>
          <div className={`mt-0.5 text-[11px] ${stale ? "font-semibold text-amber-700" : "text-ink/35"}`}>
            {confirmLabel(p)}{stale ? " · check it" : ""}
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <div className="font-display text-[17px] font-semibold leading-tight text-stone-700">{formatINR(p.total_demand)}</div>
          {!isAdmin && <div className="text-[11px] text-ink/40">{formatINR(p.rate_per_gaj)}/Gaj</div>}
          {!isAdmin && <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${st.cls}`}>{p.archived ? "Archived" : st.label}</span>}
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-ink/[0.05] pt-2.5">
          <select
            aria-label="Status"
            value={p.status}
            onChange={(e) => onPatch([p.id], { status: e.target.value })}
            className={`min-h-[36px] rounded-full border-0 px-3 text-[12px] font-bold ${st.cls}`}
          >
            {Object.entries(RESALE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="flex min-h-[36px] items-center gap-1 rounded-full border border-ink/10 bg-white pl-3 pr-2 text-[12px] text-ink/50">
            ₹
            <input
              aria-label="Rate per Gaj"
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onBlur={saveRate}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-[84px] bg-transparent text-[12.5px] font-semibold text-ink outline-none"
            />
            /Gaj
          </label>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => onPatch([p.id], { last_confirmed_at: new Date().toISOString() })} title="Still available" aria-label="Still available" className={`${iconBtn} ${stale ? "border-amber-300 bg-amber-50 text-amber-700" : "border-ink/10 text-ink/40"}`}>
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => onPatch([p.id], { featured: !p.featured })} title="Plot of the week" aria-label="Plot of the week" className={`${iconBtn} ${p.featured ? "border-amber-300 bg-amber-50 text-amber-600" : "border-ink/10 text-ink/40"}`}>
              <Star className={`h-4 w-4 ${p.featured ? "fill-current" : ""}`} />
            </button>
            <button onClick={() => onPatch([p.id], { is_public: !p.is_public })} title={p.is_public ? "Public: tap to hide" : "Make public"} aria-label="Public on the website" className={`${iconBtn} ${p.is_public ? "border-sky-300 bg-sky-50 text-sky-700" : "border-ink/10 text-ink/40"}`}>
              <Globe className="h-4 w-4" />
            </button>
            <button onClick={() => onShare(p)} aria-label="Share" className={`${iconBtn} border-ink/10 text-stone-700`}>
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex justify-end">
          <button onClick={() => onShare(p)} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-stone-100 bg-white px-4 text-[12.5px] font-semibold text-stone-700">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      )}
    </div>
  );
}
