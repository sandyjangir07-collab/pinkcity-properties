import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Inbox, LayoutGrid, List as ListIcon, CheckSquare, Star } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import PlotCard from "../components/resale/PlotCard";
import PlotRow from "../components/resale/PlotRow";
import BulkBar from "../components/resale/BulkBar";
import ShareSheet from "../components/resale/ShareSheet";
import BrochureSheet from "../components/resale/BrochureSheet";
import RequestsInbox from "../components/resale/RequestsInbox";
import { formatINR } from "../lib/utils";
import {
  BUCKET_PLANS, RESALE_STATUS, BUDGETS, AREAS, FACINGS, SORTS, inRange, isImagePath, isStale, sortPlots, chunk, signedUrls, friendlyError, formatGaj,
} from "../lib/resale";

const chipSelect = "field-input !w-auto !min-h-[44px] !rounded-full !py-2 !pl-4 !pr-9 !text-[13.5px] !font-semibold shrink-0";
const PAGE = 50;

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

// Plots for Resale: the team's searchable inventory. Built for hundreds of plots: it shows 50 at a
// time, admins can edit in the list and change many at once. Owner details never load here.
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
  const [facing, setFacing] = useState("all");
  const [quick, setQuick] = useState("all"); // all | stale | public | featured
  const [sort, setSort] = useState("newest");
  const [showArchived, setShowArchived] = useState(false);
  const [layout, setLayout] = useState(() => readPref("resale_layout", ""));
  const [visible, setVisible] = useState(PAGE);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [shareFor, setShareFor] = useState(null);
  const [brochureFor, setBrochureFor] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [openRequests, setOpenRequests] = useState(0);
  const signed = useRef(new Set());

  // Admins manage in a compact list by default; associates browse cards.
  const mode = layout || (isAdmin ? "list" : "cards");
  const pickLayout = (m) => {
    setLayout(m);
    try {
      localStorage.setItem("resale_layout", m);
    } catch {
      /* private mode: just don't remember it */
    }
  };

  async function load() {
    setError("");
    const { data, error: err } = await sb.from("resale_plots").select("*").order("created_at", { ascending: false }).range(0, 2999);
    if (err) {
      setError(err.message);
      setPlots([]);
      return;
    }
    setPlots(data || []);
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

  const counts = useMemo(() => {
    const live = (plots || []).filter((p) => !p.archived);
    return {
      stale: live.filter((p) => isStale(p)).length,
      public: live.filter((p) => p.is_public).length,
      featured: live.filter((p) => p.featured).length,
    };
  }, [plots]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const b = BUDGETS.find((x) => x.id === budget);
    const a = AREAS.find((x) => x.id === area);
    const list = (plots || []).filter((p) => {
      if (p.archived && !showArchived) return false;
      if (location !== "all" && p.location !== location) return false;
      if (scheme !== "all" && p.scheme !== scheme) return false;
      if (status !== "all" && p.status !== status) return false;
      if (facing !== "all" && p.facing !== facing) return false;
      if (quick === "stale" && !isStale(p)) return false;
      if (quick === "public" && !p.is_public) return false;
      if (quick === "featured" && !p.featured) return false;
      if (!inRange(p.total_demand, b) || !inRange(p.area_gaj, a)) return false;
      if (!needle) return true;
      return [p.scheme, p.plot_number, p.location, p.public_code].some((v) => String(v || "").toLowerCase().includes(needle));
    });
    return sortPlots(list, sort);
  }, [plots, q, location, scheme, status, facing, budget, area, quick, sort, showArchived]);

  const filtersActive = q.trim() || location !== "all" || scheme !== "all" || status !== "all" || facing !== "all" || budget !== "any" || area !== "any" || quick !== "all";
  const clear = () => {
    setQ(""); setLocation("all"); setScheme("all"); setStatus("all"); setFacing("all"); setBudget("any"); setArea("any"); setQuick("all");
  };

  // Any change of search/filter/sort starts again from the first page.
  useEffect(() => {
    setVisible(PAGE);
  }, [q, location, scheme, status, facing, budget, area, quick, sort, showArchived]);

  const shown = filtered.slice(0, visible);

  // Plan thumbnails are only fetched for what is on screen, and only once.
  useEffect(() => {
    if (mode !== "cards" || !plots) return;
    const paths = shown
      .filter((p) => p.site_plan_path && isImagePath(p.site_plan_path) && !signed.current.has(p.site_plan_path))
      .map((p) => p.site_plan_path);
    if (!paths.length) return;
    paths.forEach((x) => signed.current.add(x));
    signedUrls(BUCKET_PLANS, paths, 3600).then((m) => setThumbs((t) => ({ ...t, ...m }))).catch(() => paths.forEach((x) => signed.current.delete(x)));
  }, [shown, mode, plots]);

  const featured = useMemo(
    () => (plots || []).filter((p) => p.featured && !p.archived && p.status === "available"),
    [plots]
  );

  // Change one or many plots (admin). Updates the screen at once, then saves; reloads if it fails.
  async function patch(ids, changes) {
    if (!isAdmin || !ids.length) return;
    const now = new Date().toISOString();
    const local = { ...changes };
    if (changes.status || changes.rate_per_gaj != null) local.last_confirmed_at = now;
    setPlots((list) =>
      list.map((p) => {
        if (!ids.includes(p.id)) return p;
        const next = { ...p, ...local };
        if (changes.rate_per_gaj != null) next.total_demand = Math.round(Number(next.area_gaj) * Number(changes.rate_per_gaj) * 100) / 100;
        return next;
      })
    );
    setBusy(true);
    try {
      for (const part of chunk(ids, 100)) {
        const { error: err } = await sb.from("resale_plots").update(changes).in("id", part);
        if (err) throw err;
      }
      if (ids.length > 1) showToast(`✓ ${ids.length} plots updated.`);
    } catch (e) {
      showToast(friendlyError(e));
      load();
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  async function applyBulk(changes) {
    const ids = [...selected];
    await patch(ids, changes);
    if (changes.archived) exitSelect();
  }

  if (plots === null) {
    return (
      <div className="mx-auto flex max-w-6xl justify-center px-5 py-24">
        <BrandedLoader size={24} />
      </div>
    );
  }

  const quickChips = [
    { id: "all", label: "All" },
    ...(isAdmin ? [{ id: "stale", label: `Needs confirming (${counts.stale})` }, { id: "public", label: `Public (${counts.public})` }] : []),
    { id: "featured", label: `★ Plot of the week (${counts.featured})` },
  ];

  const totalValue = filtered.reduce((t, p) => t + (p.status === "available" ? Number(p.total_demand) || 0 : 0), 0);

  return (
    <div className={`mx-auto max-w-6xl px-4 py-10 sm:px-6 ${selectMode ? "pb-44" : ""}`}>
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
        <select className={chipSelect} value={facing} onChange={(e) => setFacing(e.target.value)} aria-label="Facing">
          <option value="all">Facing</option>
          {FACINGS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className={chipSelect} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Availability">
          <option value="all">Availability</option>
          {Object.entries(RESALE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {filtersActive && (
          <button onClick={clear} className="min-h-[44px] shrink-0 rounded-full px-3 text-[13px] font-semibold text-stone-600">Clear</button>
        )}
      </div>

      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {quickChips.map((c) => (
          <button
            key={c.id}
            onClick={() => setQuick(c.id)}
            className={`min-h-[38px] shrink-0 rounded-full border px-4 text-[12.5px] font-semibold ${quick === c.id ? "border-stone-600 bg-stone-600 text-white" : c.id === "stale" && counts.stale > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-ink/10 bg-white text-ink/60"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Plot of the week */}
      {featured.length > 0 && quick === "all" && !filtersActive && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-amber-800"><Star className="h-4 w-4 fill-amber-400 text-amber-500" /> Plot of the week</div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {featured.map((p) => (
              <Link key={p.id} to={`/resale/${p.id}`} className="w-[250px] shrink-0 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 shadow-soft">
                <div className="truncate text-[14px] font-semibold text-ink">{p.scheme} · {p.plot_number}</div>
                <div className="mt-0.5 truncate text-[12px] text-ink/50">{p.location} · {formatGaj(p.area_gaj)}</div>
                <div className="mt-2 font-display text-[19px] font-semibold text-stone-700">{formatINR(p.total_demand)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[13px] text-ink/50">
          {filtered.length} plot{filtered.length === 1 ? "" : "s"} found
          {isAdmin && filtered.length > 0 && totalValue > 0 && <span className="text-ink/35"> · {formatINR(totalValue)} available</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select className="field-input !w-auto !min-h-[40px] !rounded-full !py-1.5 !pl-3 !pr-8 !text-[12.5px] !font-semibold" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.filter((s) => isAdmin || s.id !== "stale_first").map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex overflow-hidden rounded-full border border-ink/10 bg-white" role="group" aria-label="Layout">
            <button onClick={() => pickLayout("cards")} aria-label="Cards" aria-pressed={mode === "cards"} className={`flex h-10 w-10 items-center justify-center ${mode === "cards" ? "bg-stone-600 text-white" : "text-ink/50"}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => pickLayout("list")} aria-label="List" aria-pressed={mode === "list"} className={`flex h-10 w-10 items-center justify-center ${mode === "list" ? "bg-stone-600 text-white" : "text-ink/50"}`}><ListIcon className="h-4 w-4" /></button>
          </div>
          {isAdmin && (
            <button
              onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-semibold ${selectMode ? "border-stone-600 bg-stone-600 text-white" : "border-ink/10 bg-white text-ink/70"}`}
            >
              <CheckSquare className="h-4 w-4" /> Select
            </button>
          )}
          {isAdmin && (
            <label className="flex items-center gap-2 text-[12.5px] text-ink/55">
              <input type="checkbox" className="h-4 w-4 accent-stone-600" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Archived
            </label>
          )}
        </div>
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

      {mode === "cards" ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <PlotCard key={p.id} plot={p} thumb={thumbs[p.site_plan_path]} onShare={setShareFor} isAdmin={isAdmin} selectMode={selectMode} selected={selected.has(p.id)} onToggle={toggle} />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-2.5 lg:grid-cols-2">
          {shown.map((p) => (
            <PlotRow key={p.id} plot={p} isAdmin={isAdmin} selectMode={selectMode} selected={selected.has(p.id)} onToggle={toggle} onPatch={patch} onShare={setShareFor} />
          ))}
        </div>
      )}

      {filtered.length > visible && (
        <button onClick={() => setVisible((v) => v + PAGE)} className="mx-auto mt-6 block min-h-[48px] rounded-full border border-ink/10 bg-white px-8 text-[13.5px] font-semibold text-stone-700">
          Show more ({filtered.length - visible} left)
        </button>
      )}

      {selectMode && (
        <BulkBar
          count={selected.size}
          total={filtered.length}
          busy={busy}
          onApply={applyBulk}
          onSelectAll={() => setSelected(new Set(filtered.map((p) => p.id)))}
          onClear={() => setSelected(new Set())}
          onDone={exitSelect}
        />
      )}

      <ShareSheet
        open={!!shareFor}
        plot={shareFor}
        isAdmin={isAdmin}
        onClose={() => setShareFor(null)}
        onBrochure={() => setBrochureFor(shareFor)}
        onMakePublic={async () => {
          const id = shareFor.id;
          await patch([id], { is_public: true });
          setShareFor((s) => (s ? { ...s, is_public: true } : s));
        }}
      />
      <BrochureSheet open={!!brochureFor} plot={brochureFor} onClose={() => setBrochureFor(null)} />
      {isAdmin && <RequestsInbox open={inboxOpen} onClose={() => setInboxOpen(false)} onChanged={loadRequestCount} />}
    </div>
  );
}
