import { useEffect, useMemo, useState } from "react";
import { Phone, Search, Pencil, Plus, Trash2 } from "lucide-react";
import { sb } from "../lib/supabase";
import { formatINR, formatDate } from "../lib/utils";
import { groupSales, plotLabel } from "../lib/sales";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { StatCard } from "../components/ui/primitives";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import AddSaleModal from "../components/sales/AddSaleModal";
import { Sheet, SheetHeader } from "../components/ui/Sheet";

// Admin-only ledger of every approved sale: client, associate, township +
// plot(s), amount received (where recorded) and the associate's commission.
// A sale covering several plots shows as one card.

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function Sales() {
  const showToast = useToast();
  const { profile, user } = useAuth();
  const [sales, setSales] = useState(null);
  const [month, setMonth] = useState("all");
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
      .order("reviewed_at", { ascending: false });
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

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (sales || []).filter((s) => {
      if (month !== "all" && (!s.reviewed_at || monthKey(s.reviewed_at) !== month)) return false;
      if (!needle) return true;
      const haystack = [s.buyer_name, s.buyer_phone, s.associate_name, ...s.plots.flatMap((p) => [p.plotNo, p.township])];
      return haystack.filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [sales, month, q]);

  const totalReceived = filtered.reduce((sum, s) => sum + (s.sale_amount || 0), 0);

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

  if (sales === null) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Admin Panel</div>
          <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Sales</h1>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-stone-500 to-stone-700 px-4 py-2.5 text-xs font-semibold text-sand active:scale-95 transition-transform"
        >
          <Plus className="h-3.5 w-3.5" /> Add sale
        </button>
      </div>
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink/50">Every approved sale in one place.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard label={month === "all" ? "Total Sales" : "Sales in month"} value={filtered.length} tone="stone" />
        <StatCard label="Amount Received" value={formatINR(totalReceived)} tone="emerald" />
      </div>

      <div className="mt-5 flex gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input className="field-input !pl-10" placeholder="Search client, associate, plot…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field-input !w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All time</option>
          {months.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-8 text-center text-[13px] text-ink/40">
            {sales.length === 0 ? "No approved sales yet. Approved tokens and sales you add will appear here." : "No sales match this filter."}
          </div>
        )}

        {filtered.map((s) => (
          <div key={s.key} className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-ink">{s.buyer_name || "—"}</div>
                {s.buyer_phone ? (
                  <a href={`tel:${s.buyer_phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-stone-600">
                    <Phone className="h-3 w-3" /> {s.buyer_phone}
                  </a>
                ) : editingKey === s.key ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input autoFocus type="tel" className="field-input !py-1.5 !text-[13px]" placeholder="Client number" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
                    <button onClick={() => savePhone(s)} className="rounded-full bg-stone-600 px-3 py-1.5 text-[11.5px] font-semibold text-sand">Save</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditingKey(s.key); setPhoneDraft(""); }} className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink/40">
                    <Pencil className="h-3 w-3" /> Add number
                  </button>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-[19px] font-semibold leading-none text-ink">{s.sale_amount != null ? formatINR(s.sale_amount) : "—"}</div>
                <div className="mt-1 text-[10.5px] text-ink/40">{formatDate(s.reviewed_at)}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-ink/[0.06] pt-3">
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink/35">{s.plots.length > 1 ? `Plots (${s.plots.length})` : "Plot"}</div>
                {s.plots.map((p, i) => (
                  <div key={i} className="mt-0.5 text-[13px] font-medium text-ink">{plotLabel(p)}</div>
                ))}
              </div>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink/35">Associate</div>
                <div className="mt-0.5 text-[13px] font-medium text-ink">{s.associate_name || "—"}</div>
                <div className="text-[11.5px] text-ink/45">
                  Commission {formatINR(s.commission)}
                  {s.is_manual ? " · added manually" : ""}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-ink/[0.06] pt-3">
              <button
                onClick={() => setEditSale(s)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-3.5 py-1.5 text-[11.5px] font-semibold text-ink/70 active:scale-95 transition-transform"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
              <button
                onClick={() => { setFreePlots(true); setDeleteTarget(s); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-[11.5px] font-semibold text-red-600 active:scale-95 transition-transform"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>
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
            <button
              disabled={deleting}
              onClick={confirmDelete}
              className="mt-5 w-full rounded-full border border-red-200 bg-red-50 py-3 text-sm font-semibold text-red-600 disabled:opacity-50"
            >
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
