import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Inbox } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import PlotCard from "../components/resale/PlotCard";
import RequestsInbox from "../components/resale/RequestsInbox";
import {
  BUCKET_PLANS, RESALE_STATUS, BUDGETS, AREAS, inRange, isImagePath, shareText, shareOrCopy, signedUrls,
} from "../lib/resale";

const chipSelect = "field-input !w-auto !min-h-[44px] !rounded-full !py-2 !pl-4 !pr-9 !text-[13.5px] !font-semibold shrink-0";

// Plots for Resale — the team's searchable inventory. Owner details never load here.
export default function ResalePlots() {
  const { isAdmin } = useAuth();
  const showToast = useToast();
  const [plots, setPlots] = useState(null);
  const [error, setError] = useState("");
  const [thumbs, setThumbs] = useState({});
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("all");
  const [scheme, setScheme] = useState("all");
  const [budget, setBudget] = useState("any");
  const [area, setArea] = useState("any");
  const [status, setStatus] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [openRequests, setOpenRequests] = useState(0);

  async function load() {
    setError("");
    const { data, error: err } = await sb.from("resale_plots").select("*").order("created_at", { ascending: false }).range(0, 2999);
    if (err) {
      setError(err.message);
      setPlots([]);
      return;
    }
    const list = data || [];
    setPlots(list);
    const paths = list.filter((p) => p.site_plan_path && isImagePath(p.site_plan_path)).map((p) => p.site_plan_path);
    signedUrls(BUCKET_PLANS, paths, 3600).then(setThumbs).catch(() => {});
  }

  async function loadRequestCount() {
    if (!isAdmin) return;
    const { count } = await sb.from("resale_plot_requests").select("id", { count: "exact", head: true }).eq("status", "open");
    setOpenRequests(count || 0);
  }

  useEffect(() => {
    load();
    loadRequestCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const locations = useMemo(() => [...new Set((plots || []).map((p) => p.location).filter(Boolean))].sort(), [plots]);
  const schemes = useMemo(() => [...new Set((plots || []).map((p) => p.scheme).filter(Boolean))].sort(), [plots]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const b = BUDGETS.find((x) => x.id === budget);
    const a = AREAS.find((x) => x.id === area);
    return (plots || []).filter((p) => {
      if (p.archived && !showArchived) return false;
      if (location !== "all" && p.location !== location) return false;
      if (scheme !== "all" && p.scheme !== scheme) return false;
      if (status !== "all" && p.status !== status) return false;
      if (!inRange(p.total_demand, b) || !inRange(p.area_gaj, a)) return false;
      if (!needle) return true;
      return [p.scheme, p.plot_number, p.location].some((v) => String(v || "").toLowerCase().includes(needle));
    });
  }, [plots, q, location, scheme, status, budget, area, showArchived]);

  const filtersActive = q.trim() || location !== "all" || scheme !== "all" || status !== "all" || budget !== "any" || area !== "any";
  const clear = () => {
    setQ(""); setLocation("all"); setScheme("all"); setStatus("all"); setBudget("any"); setArea("any");
  };

  async function share(p) {
    const r = await shareOrCopy(shareText(p), `${p.scheme} — Plot ${p.plot_number}`);
    if (r === "copied") showToast("✓ Details copied. Paste them in WhatsApp.");
    if (r === "failed") showToast("Couldn't share. Please try again.");
  }

  if (plots === null) {
    return (
      <div className="mx-auto flex max-w-6xl justify-center px-5 py-24">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">PinkCity Properties &amp; Consultants</div>
          <h1 className="mt-2 font-display text-[32px] font-semibold leading-[0.98] tracking-tight text-ink">Plots for Resale</h1>
          <p className="mt-2 text-[14px] text-ink/50">Find available resale inventory</p>
        </div>
        {isAdmin && (
          <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row">
            <button
              onClick={() => setInboxOpen(true)}
              className="relative inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 text-[12.5px] font-semibold text-ink/70"
            >
              <Inbox className="h-4 w-4" /> Requests
              {openRequests > 0 && <span className="ml-0.5 rounded-full bg-stone-600 px-1.5 text-[10.5px] font-bold text-white">{openRequests}</span>}
            </button>
            <Link to="/resale/new" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-stone-600 px-5 text-[12.5px] font-semibold text-white shadow-lift active:scale-95">
              <Plus className="h-4 w-4" /> Add listing
            </Link>
          </div>
        )}
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
        <input
          className="field-input !min-h-[52px] !pl-11 !text-[15px]"
          placeholder="Search by scheme, plot number or location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search plots"
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <select className={chipSelect} value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location">
          <option value="all">Location</option>
          {locations.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className={chipSelect} value={scheme} onChange={(e) => setScheme(e.target.value)} aria-label="Scheme">
          <option value="all">Scheme</option>
          {schemes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={chipSelect} value={budget} onChange={(e) => setBudget(e.target.value)} aria-label="Budget">
          {BUDGETS.map((b) => <option key={b.id} value={b.id}>{b.id === "any" ? "Budget" : b.label}</option>)}
        </select>
        <select className={chipSelect} value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area">
          {AREAS.map((a) => <option key={a.id} value={a.id}>{a.id === "any" ? "Area" : a.label}</option>)}
        </select>
        <select className={chipSelect} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Availability">
          <option value="all">Availability</option>
          {Object.entries(RESALE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {filtersActive && (
          <button onClick={clear} className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] font-semibold text-stone-600">Clear</button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink/50">
          {filtered.length} plot{filtered.length === 1 ? "" : "s"} found
        </p>
        {isAdmin && (
          <label className="flex items-center gap-2 text-[12.5px] text-ink/55">
            <input type="checkbox" className="h-4 w-4 accent-stone-600" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-[13.5px] text-red-700">
          Couldn't load the plots. {error}
          <button onClick={load} className="mt-3 block w-full text-[13px] font-semibold underline">Try again</button>
        </div>
      )}

      {!error && filtered.length === 0 && (
        <div className="mt-4 rounded-2xl border border-ink/[0.06] bg-surface p-10 text-center">
          <div className="text-[15px] font-semibold text-ink">{plots.length === 0 ? "No resale plots yet" : "No plots match these filters"}</div>
          <p className="mt-1.5 text-[13px] text-ink/45">
            {plots.length === 0
              ? isAdmin ? "Add the first listing to get started." : "Your admin hasn't added any plots yet."
              : "Try a different search, or clear the filters."}
          </p>
          {filtersActive && <button onClick={clear} className="mt-4 min-h-[44px] rounded-full bg-stone-600 px-6 text-[13px] font-semibold text-white">Clear filters</button>}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <PlotCard key={p.id} plot={p} thumb={thumbs[p.site_plan_path]} onShare={share} />
        ))}
      </div>

      {isAdmin && <RequestsInbox open={inboxOpen} onClose={() => setInboxOpen(false)} onChanged={loadRequestCount} />}
    </div>
  );
}
