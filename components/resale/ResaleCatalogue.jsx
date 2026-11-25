"use client";

import { useEffect, useMemo, useState } from "react";
import ResaleCard from "./ResaleCard";
import { AREAS, BUDGETS, inRange } from "../../lib/resale";

const PAGE = 24;
const sel =
  "bg-white border border-ink/10 rounded-full px-4 py-2.5 pr-9 text-sm font-medium text-ink/80 outline-none focus:border-stone-500 transition-colors shrink-0";

export default function ResaleCatalogue({ plots }) {
  const [q, setQ] = useState("");
  const [scheme, setScheme] = useState("all");
  const [budget, setBudget] = useState("any");
  const [area, setArea] = useState("any");
  const [visible, setVisible] = useState(PAGE);

  const schemes = useMemo(() => [...new Set(plots.map((p) => p.scheme))].sort(), [plots]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const b = BUDGETS.find((x) => x.id === budget);
    const a = AREAS.find((x) => x.id === area);
    return plots.filter((p) => {
      if (scheme !== "all" && p.scheme !== scheme) return false;
      if (!inRange(p.total_demand, b) || !inRange(p.area_gaj, a)) return false;
      if (!needle) return true;
      return [p.scheme, p.plot_number, p.location].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [plots, q, scheme, budget, area]);
  useEffect(() => setVisible(PAGE), [q, scheme, budget, area]);

  const filtersOn = q.trim() || scheme !== "all" || budget !== "any" || area !== "any";
  const featured = plots.filter((p) => p.featured).slice(0, 4);
  const featuredCodes = featured.map((p) => p.public_code);
  const showFeatured = featured.length > 0 && !filtersOn;
  const listed = showFeatured ? filtered.filter((p) => !featuredCodes.includes(p.public_code)) : filtered;

  return (
    <div>
      {plots.length > 0 && (
        <div className="mb-10 rounded-3xl bg-white/70 border border-ink/[0.06] p-4 sm:p-5">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              className="w-full bg-white border border-ink/10 rounded-full pl-11 pr-4 py-3 text-sm text-ink outline-none focus:border-stone-500 transition-colors"
              placeholder="Search scheme, plot no. or location"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search plots"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            <select className={sel} value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Scheme">
              <option value="all">All schemes</option>
              {schemes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={sel} value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget">
              {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select className={sel} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Plot size">
              {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            {filtersOn && (
              <button
                onClick={() => { setQ(""); setScheme("all"); setBudget("any"); setArea("any"); }}
                className="text-sm font-medium text-stone-600 px-3 shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {plots.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-ink/15 py-24 text-center text-ink/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="w-14 h-14 object-contain mx-auto mb-4 opacity-25" />
          No resale plots are listed right now — check back soon, or WhatsApp us and we&apos;ll find one for you.
        </div>
      ) : (
        <>
          {showFeatured && (
            <section className="mb-12">
              <h2 className="font-display text-2xl text-ink mb-4 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#B98A3E"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></svg>
                Plot of the week
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((p) => <ResaleCard key={p.public_code} p={p} />)}
              </div>
            </section>
          )}

          {listed.length > 0 && showFeatured && <h2 className="font-display text-2xl text-ink mb-4">More plots</h2>}
          <p className="mb-4 text-sm text-ink/50">
            {filtered.length} plot{filtered.length === 1 ? "" : "s"}{filtersOn ? " match your search" : " available"}
          </p>
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 py-16 text-center text-ink/45 text-sm">No plots match these filters — try clearing them.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listed.slice(0, visible).map((p) => <ResaleCard key={p.public_code} p={p} />)}
            </div>
          )}
          {listed.length > visible && (
            <button onClick={() => setVisible((v) => v + PAGE)} className="mx-auto mt-10 block rounded-full border border-ink/10 bg-white px-8 py-3 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
}
