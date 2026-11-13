import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Star } from "lucide-react";
import { sb } from "../../lib/supabase";
import { BrandedLoader } from "../../components/ui/BrandedLoader";
import { BUDGETS, AREAS, inRange } from "../../lib/resale";
import PublicShell, { usePageTitle } from "./PublicShell";
import { PublicCard } from "./publicUi";

const sel = "field-input !w-auto !min-h-[44px] !rounded-full !py-2 !pl-4 !pr-9 !text-[13.5px] !font-semibold shrink-0 !bg-white";
const PAGE = 24;

// Public catalogue of the plots marked Public. No login. Data comes from a database function
// that only ever returns property facts, never owner details.
export default function PublicResale() {
  const { search } = useLocation(); // keeps ?a=<associate> on every link
  usePageTitle("Resale Plots in Jaipur — PinkCity Properties & Consultants", "Resale plots in Jaipur with clear pricing, plot sizes and site plans from PinkCity Properties & Consultants.");
  const [plots, setPlots] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [scheme, setScheme] = useState("all");
  const [budget, setBudget] = useState("any");
  const [area, setArea] = useState("any");
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await sb.rpc("public_resale_list");
      if (err) {
        setError("We couldn't load the plots right now. Please try again.");
        setPlots([]);
        return;
      }
      setPlots(data || []);
    })();
  }, []);

  const schemes = useMemo(() => [...new Set((plots || []).map((p) => p.scheme))].sort(), [plots]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const b = BUDGETS.find((x) => x.id === budget);
    const a = AREAS.find((x) => x.id === area);
    return (plots || []).filter((p) => {
      if (scheme !== "all" && p.scheme !== scheme) return false;
      if (!inRange(p.total_demand, b) || !inRange(p.area_gaj, a)) return false;
      if (!needle) return true;
      return [p.scheme, p.plot_number, p.location].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [plots, q, scheme, budget, area]);
  useEffect(() => setVisible(PAGE), [q, scheme, budget, area]);

  const featured = (plots || []).filter((p) => p.featured);
  const featuredShown = featured.slice(0, 4).map((p) => p.public_code);
  const filtersOn = q.trim() || scheme !== "all" || budget !== "any" || area !== "any";
  // When the Plot of the week strip is showing, don't list those plots a second time.
  const hideFeatured = featured.length > 0 && !filtersOn;
  const listed = hideFeatured ? filtered.filter((p) => !featuredShown.includes(p.public_code)) : filtered;

  return (
    <PublicShell search={search}>
      <h1 className="font-display text-[30px] font-semibold leading-[1.05] tracking-tight sm:text-[38px]">Resale plots in Jaipur</h1>
      <p className="mt-2 max-w-xl text-[14.5px] text-ink/55">Clear pricing, plot sizes and site plans. Pick a plot to see the details or talk to us.</p>

      {plots === null && <div className="flex justify-center py-24"><BrandedLoader size={24} /></div>}
      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-[13.5px] text-red-700">{error}</div>}

      {plots !== null && !error && plots.length === 0 && (
        <div className="mt-8 rounded-2xl border border-ink/[0.06] bg-white p-10 text-center">
          <div className="text-[16px] font-semibold">New plots are being added</div>
          <p className="mt-1.5 text-[13px] text-ink/50">Call us and we'll tell you what's available right now.</p>
        </div>
      )}

      {plots !== null && plots.length > 0 && (
        <>
          <div className="relative mt-6">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
            <input className="field-input !min-h-[52px] !bg-white !pl-11 !text-[15px]" placeholder="Search scheme, plot no. or location" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plots" />
          </div>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <select className={sel} value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Scheme">
              <option value="all">All schemes</option>
              {schemes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className={sel} value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget">
              {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
            <select className={sel} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
              {AREAS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            {filtersOn && <button onClick={() => { setQ(""); setScheme("all"); setBudget("any"); setArea("any"); }} className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] font-semibold text-crimson">Clear</button>}
          </div>

          {featured.length > 0 && !filtersOn && (
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-1.5 font-display text-[19px] font-semibold"><Star className="h-4 w-4 fill-amber-400 text-amber-500" /> Plot of the week</h2>
              <div className="grid gap-4 md:grid-cols-2">{featured.slice(0, 4).map((p) => <PublicCard key={p.public_code} p={p} search={search} />)}</div>
            </section>
          )}

          <p className="mb-3 mt-8 text-[13px] text-ink/50">{filtered.length} plot{filtered.length === 1 ? "" : "s"}{filtersOn ? " match" : " available"}{hideFeatured && listed.length > 0 ? " · more below" : ""}</p>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-ink/[0.06] bg-white p-8 text-center text-[13.5px] text-ink/50">No plots match these filters. Try clearing them.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">{listed.slice(0, visible).map((p) => <PublicCard key={p.public_code} p={p} search={search} />)}</div>
          )}
          {listed.length > visible && (
            <button onClick={() => setVisible((v) => v + PAGE)} className="mx-auto mt-6 block min-h-[48px] rounded-full border border-ink/10 bg-white px-8 text-[13.5px] font-semibold text-crimson">Show more</button>
          )}
        </>
      )}
    </PublicShell>
  );
}
