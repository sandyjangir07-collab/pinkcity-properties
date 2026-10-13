import { useEffect, useMemo, useState } from "react";
import { Phone, Search, Pencil, Plus, Trash2, Receipt, LayoutGrid, Ruler, BadgeIndianRupee } from "lucide-react";
import { sb } from "../lib/supabase";
import { formatINR, initials } from "../lib/utils";
import { groupSales, formatGaj, areaText } from "../lib/sales";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import AddSaleModal from "../components/sales/AddSaleModal";
import { Sheet, SheetHeader } from "../components/ui/Sheet";
import { plotLabel } from "../lib/sales";

// Admin-only ledger of every approved sale. Compact on purpose: a table on
// laptops and tight cards on phones, grouped by month with subtotals, so many
// sales fit on one screen. A sale covering several plots is still one row.

// Each associate gets a consistent colour (avatar + accent bar).
const TONES = [
  { chip: "bg-rose-100 text-rose-700", bar: "bg-rose-400" },
  { chip: "bg-sky-100 text-sky-700", bar: "bg-sky-400" },
  { chip: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  { chip: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-400" },
  { chip: "bg-violet-100 text-violet-700", bar: "bg-violet-400" },
  { chip: "bg-teal-100 text-teal-700", bar: "bg-teal-400" },
  { chip: "bg-indigo-100 text-indigo-700", bar: "bg-indigo-400" },
  { chip: "bg-orange-100 text-orange-700", bar: "bg-orange-400" },
];
function toneFor(name) {
  let h = 0;
  for (const c of String(name || "?")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function plotGroups(plots) {
  const map = new Map();
  for (const p of plots) {
    const k = p.township || "";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  }
  return [...map.entries()];
}

function Tile({ label, value, Icon, className }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lift ${className}`}>
      <Icon className="absolute -right-1 -top-1 h-14 w-14 opacity-[0.13]" />
      <div className="font-display text-[22px] font-semibold leading-none lg:text-[28px]">{value}</div>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</div>
    </div>
  );
}

function DateBadge({ iso }) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    <div className="flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-stone-50 text-stone-700">
      <span className="font-display text-[18px] font-semibold leading-none">{d.getDate()}</span>
      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
        {d.toLocaleDateString("en-IN", { month: "short" })}
      </span>
    </div>
  );
}

function PlotChips({ plots }) {
  return (
    <div className="space-y-1">
      {plotGroups(plots).map(([township, list]) => (
        <div key={township} className="flex flex-wrap items-center gap-1.5">
          {township && <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink/35">{township}</span>}
          {list.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-stone-100 bg-stone-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-stone-700">
              {p.plotNo ? `Plot ${p.plotNo}` : "Plot —"}
              {p.plotArea ? <span className="font-medium text-stone-500">· {areaText(p.plotArea)}</span> : null}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Associate({ name }) {
  const tone = toneFor(name);
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${tone.chip}`}>{initials(name)}</span>
      <span className="truncate text-[13px] font-medium text-ink">{name || "—"}</span>
    </div>
  );
}

function PhoneCell({ s, editingKey, setEditingKey, phoneDraft, setPhoneDraft, savePhone }) {
  if (s.buyer_phone) {
    return (
      <a href={`tel:${s.buyer_phone}`} className="inline-flex items-center gap-1.5 text-[12px] text-stone-600">
        <Phone className="h-3 w-3" /> {s.buyer_phone}
      </a>
    );
  }
  if (editingKey === s.key) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <input autoFocus type="tel" className="field-input !py-1.5 !text-[13px]" placeholder="Client number" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
        <button onClick={() => savePhone(s)} className="rounded-full bg-stone-600 px-3 py-1.5 text-[11.5px] font-semibold text-sand">Save</button>
      </div>
    );
  }
  return (
    <button onClick={() => { setEditingKey(s.key); setPhoneDraft(""); }} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink/35 hover:text-stone-600">
      <Pencil className="h-3 w-3" /> Add number
    </button>
  );
}

function Actions({ s, onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onEdit(s)} aria-label="Edit sale" title="Edit" className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-ink/55 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700 active:scale-95">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => onDelete(s)} aria-label="Delete sale" title="Delete" className="flex h-8 w-8 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 transition hover:bg-red-100 active:scale-95">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

const COLS = "lg:grid-cols-[56px_minmax(0,1.2fr)_minmax(0,2.1fr)_88px_minmax(0,1.1fr)_minmax(0,1fr)_76px]";

export default function Sales() {
  const showToast = useToast();
  const { profile, user } = useAuth();
  const [sales, setSales] = useState(null);
  const [month, setMonth] = useState("all");
  const [assoc, setAssoc] = useState("all");
  const [q, setQ] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSale, setEditSale] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [freePlots, setFreePlots] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data, error } = await sb
      .from("token_submissions")
      .select("id,sale_group_id,unit_id,associate_employee_id,buyer_name,buyer_phone,associate_name,sale_amount,commission_amount,reviewed_at,listing_id,is_manual,manual_township,manual_plot_no,manual_plot_area,colony_units(unit_number,unit_size)")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .range(0, 4999);
    if (error) {
      showToast(error.message);
      setSales([]);
      return;
    }
    const list = data || [];
    const ids = [...new Set(list.map((d) => d.listing_id).filter(Boolean))];
    let titles = {};
    if (ids.length) {
      const { data: ls } = await sb.from("listings").select("id,title").in("id", ids);
      titles = Object.fromEntries((ls || []).map((l) => [l.id, l.title]));
    }
    setSales(
      groupSales(
        list.map((d) => ({
          ...d,
          township: titles[d.listing_id] || d.manual_township || "",
          plotNo: d.colony_units?.unit_number || d.manual_plot_no || "",
          plotArea: d.colony_units?.unit_size || d.manual_plot_area || "",
        }))
      )
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const months = useMemo(
    () => [...new Set((sales || []).filter((s) => s.reviewed_at).map((s) => monthKey(s.reviewed_at)))].sort().reverse(),
    [sales]
  );
  const associates = useMemo(
    () => [...new Set((sales || []).map((s) => s.associate_name).filter(Boolean))].sort(),
    [sales]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (sales || []).filter((s) => {
      if (month !== "all" && (!s.reviewed_at || monthKey(s.reviewed_at) !== month)) return false;
      if (assoc !== "all" && s.associate_name !== assoc) return false;
      if (!needle) return true;
      const haystack = [s.buyer_name, s.buyer_phone, s.associate_name, ...s.plots.flatMap((p) => [p.plotNo, p.township])];
      return haystack.filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [sales, month, assoc, q]);

  // Group the (already newest-first) sales by month, with subtotals.
  const groups = useMemo(() => {
    const out = [];
    for (const s of filtered) {
      const key = s.reviewed_at ? monthKey(s.reviewed_at) : "none";
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        g = { key, sales: [], plots: 0, gaj: 0, commission: 0 };
        out.push(g);
      }
      g.sales.push(s);
      g.plots += s.plots.length;
      g.gaj += s.totalGaj;
      g.commission += s.commission;
    }
    return out;
  }, [filtered]);

  const totalPlots = filtered.reduce((sum, s) => sum + s.plots.length, 0);
  const totalGaj = filtered.reduce((sum, s) => sum + s.totalGaj, 0);
  const totalCommission = filtered.reduce((sum, s) => sum + s.commission, 0);
  const filtersActive = month !== "all" || assoc !== "all" || q.trim() !== "";

  async function savePhone(sale) {
    const phone = phoneDraft.trim();
    if (!phone) return;
    const { error } = await sb.from("token_submissions").update({ buyer_phone: phone }).in("id", sale.ids);
    if (error) {
      showToast(error.message);
      return;
    }
    setSales((list) => list.map((s) => (s.key === sale.key ? { ...s, buyer_phone: phone } : s)));
    setEditingKey(null);
    setPhoneDraft("");
    showToast("✓ Number saved.");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await sb.rpc("admin_delete_sale", {
      p_row_ids: deleteTarget.ids,
      p_free_plots: freePlots,
      p_admin_name: profile?.full_name || profile?.email || user?.email || "Admin",
    });
    setDeleting(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setDeleteTarget(null);
    showToast("✓ Sale deleted.");
    load();
  }

  const askDelete = (s) => {
    setFreePlots(true);
    setDeleteTarget(s);
  };
  const phoneProps = { editingKey, setEditingKey, phoneDraft, setPhoneDraft, savePhone };

  if (sales === null) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Admin Panel</div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Sales</h1>
          <p className="mt-2 text-[13.5px] text-ink/50">Every approved sale, grouped by month.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-stone-500 to-stone-700 px-5 py-3 text-xs font-semibold text-white shadow-lift active:scale-95 transition-transform"
        >
          <Plus className="h-3.5 w-3.5" /> Add sale
        </button>
      </div>

      {/* Summary band */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Sales" value={filtered.length} Icon={Receipt} className="bg-gradient-to-br from-stone-500 to-stone-700" />
        <Tile label="Total plots" value={totalPlots} Icon={LayoutGrid} className="bg-gradient-to-br from-brass to-[#8f6a2c]" />
        <Tile label="Total Gaj" value={totalGaj.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Icon={Ruler} className="bg-gradient-to-br from-jali to-[#34505a]" />
        <Tile label="Commission" value={formatINR(totalCommission)} Icon={BadgeIndianRupee} className="bg-gradient-to-br from-emerald-500 to-emerald-700" />
      </div>

      {/* Filters */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-[1fr_200px_200px]">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input className="field-input !pl-10" placeholder="Search client, associate, plot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field-input" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All time</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <select className="field-input" value={assoc} onChange={(e) => setAssoc(e.target.value)}>
          <option value="all">All associates</option>
          {associates.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Column headings (laptop) */}
      {filtered.length > 0 && (
        <div className={`mt-5 hidden gap-4 px-4 text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink/35 lg:grid ${COLS}`}>
          <span>Date</span>
          <span>Client</span>
          <span>Township & plots</span>
          <span>Gaj</span>
          <span>Associate</span>
          <span>Commission</span>
          <span />
        </div>
      )}

      {filtered.length === 0 && (
        <div className="mt-5 rounded-2xl border border-ink/[0.06] bg-surface p-10 text-center text-[13px] text-ink/40">
          {sales.length === 0 ? "No approved sales yet. Approved tokens and sales you add will appear here." : "No sales match this filter."}
          {filtersActive && sales.length > 0 && (
            <button onClick={() => { setMonth("all"); setAssoc("all"); setQ(""); }} className="mt-3 block w-full text-[12px] font-semibold text-stone-600">Clear filters</button>
          )}
        </div>
      )}

      <div className="mt-3 space-y-6">
        {groups.map((g) => (
          <section key={g.key}>
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
              <h2 className="font-display text-[19px] font-semibold text-ink">{g.key === "none" ? "No date" : monthLabel(g.key)}</h2>
              <div className="text-[11.5px] text-ink/45">
                <b className="font-semibold text-ink/70">{g.sales.length}</b> sales · <b className="font-semibold text-ink/70">{g.plots}</b> plots ·{" "}
                <b className="font-semibold text-ink/70">{g.gaj.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b> Gaj ·{" "}
                <b className="font-semibold text-emerald-700">{formatINR(g.commission)}</b>
              </div>
            </div>

            <div className="space-y-2">
              {g.sales.map((s) => {
                const tone = toneFor(s.associate_name);
                return (
                  <div key={s.key} className="relative overflow-hidden rounded-2xl border border-ink/[0.05] bg-surface shadow-soft transition hover:border-stone-200 hover:shadow-lift">
                    <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full ${tone.bar}`} />

                    {/* Laptop: one table row */}
                    <div className={`hidden items-center gap-4 px-4 py-3 lg:grid ${COLS}`}>
                      <DateBadge iso={s.reviewed_at} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-ink">{s.buyer_name || "—"}</div>
                        <PhoneCell s={s} {...phoneProps} />
                      </div>
                      <PlotChips plots={s.plots} />
                      <div className="text-[13px] font-semibold text-ink">
                        {s.totalGaj > 0 ? s.totalGaj.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
                        {s.totalGaj > 0 && <span className="ml-1 text-[10.5px] font-medium text-ink/40">Gaj</span>}
                      </div>
                      <Associate name={s.associate_name} />
                      <div>
                        <div className="text-[14px] font-bold text-emerald-700">{formatINR(s.commission)}</div>
                        {(s.sale_amount != null || s.is_manual) && (
                          <div className="text-[10.5px] text-ink/35">
                            {s.sale_amount != null ? `Received ${formatINR(s.sale_amount)}` : "added manually"}
                          </div>
                        )}
                      </div>
                      <Actions s={s} onEdit={setEditSale} onDelete={askDelete} />
                    </div>

                    {/* Phone / tablet: compact card */}
                    <div className="space-y-2.5 px-4 py-3.5 lg:hidden">
                      <div className="flex items-start gap-3">
                        <DateBadge iso={s.reviewed_at} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14.5px] font-semibold text-ink">{s.buyer_name || "—"}</div>
                          <PhoneCell s={s} {...phoneProps} />
                        </div>
                        <Actions s={s} onEdit={setEditSale} onDelete={askDelete} />
                      </div>
                      <PlotChips plots={s.plots} />
                      <div className="flex items-center justify-between gap-3 border-t border-ink/[0.05] pt-2.5">
                        <Associate name={s.associate_name} />
                        <div className="shrink-0 text-right">
                          <span className="text-[14px] font-bold text-emerald-700">{formatINR(s.commission)}</span>
                          {s.totalGaj > 0 && <span className="ml-2 text-[11px] font-medium text-ink/40">{formatGaj(s.totalGaj)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <AddSaleModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
      <AddSaleModal open={!!editSale} sale={editSale} onClose={() => setEditSale(null)} onAdded={load} />

      <Sheet open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)}>
        {deleteTarget && (
          <>
            <SheetHeader title="Delete this sale?" sub="This removes it from the Sales page and from the associate's portal and totals. It can't be undone." />
            <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70 space-y-0.5">
              <div className="font-semibold text-ink">{deleteTarget.buyer_name || "—"}</div>
              {deleteTarget.plots.map((p, i) => (
                <div key={i}>{plotLabel(p)}</div>
              ))}
              <div className="text-ink/45">Associate: {deleteTarget.associate_name || "—"}</div>
            </div>
            {deleteTarget.plots.some((p) => p.unitId) && (
              <label className="mt-4 flex items-start gap-2.5 text-sm text-ink/70">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-stone-600" checked={freePlots} onChange={(e) => setFreePlots(e.target.checked)} />
                <span>Also mark the plot{deleteTarget.plots.filter((p) => p.unitId).length > 1 ? "s" : ""} Available again</span>
              </label>
            )}
            <button disabled={deleting} onClick={confirmDelete} className="mt-5 w-full rounded-full border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 disabled:opacity-50">
              {deleting ? "Deleting…" : "Delete sale"}
            </button>
            <button disabled={deleting} onClick={() => setDeleteTarget(null)} className="mt-3 w-full rounded-full border border-ink/10 py-3 text-sm font-medium text-ink/60">
              Cancel
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}
