import { useEffect, useMemo, useState } from "react";
import { Phone, Search, Pencil, Plus } from "lucide-react";
import { sb } from "../lib/supabase";
import { formatINR, formatDate } from "../lib/utils";
import { useToast } from "../hooks/useToast";
import { StatCard } from "../components/ui/primitives";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import AddSaleModal from "../components/sales/AddSaleModal";

// Admin-only ledger of every approved sale (approved token submission):
// client, associate, township + plot, and the amount received.

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
  const [deals, setDeals] = useState(null);
  const [month, setMonth] = useState("all");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    const { data, error } = await sb
      .from("token_submissions")
      .select("id,buyer_name,buyer_phone,associate_name,sale_amount,commission_amount,reviewed_at,listing_id,is_manual,manual_township,manual_plot_no,manual_plot_area,colony_units(unit_number,unit_size)")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });
    if (error) {
      showToast(error.message);
      setDeals([]);
      return;
    }
    const list = data || [];
    const ids = [...new Set(list.map((d) => d.listing_id).filter(Boolean))];
    let titles = {};
    if (ids.length) {
      const { data: ls } = await sb.from("listings").select("id,title").in("id", ids);
      titles = Object.fromEntries((ls || []).map((l) => [l.id, l.title]));
    }
    setDeals(list.map((d) => ({
      ...d,
      township: titles[d.listing_id] || d.manual_township || "",
      plotNo: d.colony_units?.unit_number || d.manual_plot_no || "",
      plotArea: d.colony_units?.unit_size || d.manual_plot_area || "",
    })));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const months = useMemo(
    () => [...new Set((deals || []).filter((d) => d.reviewed_at).map((d) => monthKey(d.reviewed_at)))].sort().reverse(),
    [deals]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (deals || []).filter((d) => {
      if (month !== "all" && (!d.reviewed_at || monthKey(d.reviewed_at) !== month)) return false;
      if (!needle) return true;
      return [d.buyer_name, d.buyer_phone, d.associate_name, d.plotNo, d.township]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [deals, month, q]);

  const totalReceived = filtered.reduce((sum, d) => sum + (Number(d.sale_amount) || 0), 0);

  async function savePhone(id) {
    const phone = phoneDraft.trim();
    if (!phone) return;
    const { error } = await sb.from("token_submissions").update({ buyer_phone: phone }).eq("id", id);
    if (error) {
      showToast(error.message);
      return;
    }
    setDeals((list) => list.map((d) => (d.id === id ? { ...d, buyer_phone: phone } : d)));
    setEditingId(null);
    setPhoneDraft("");
    showToast("✓ Number saved.");
  }

  if (deals === null) {
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
      <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink/50">Every approved sale and the amount received, in one place.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatCard label={month === "all" ? "Total Sales" : "Sales in month"} value={filtered.length} tone="stone" />
        <StatCard label="Amount Received" value={formatINR(totalReceived)} tone="emerald" />
      </div>

      <div className="mt-5 flex gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
          <input
            className="field-input !pl-10"
            placeholder="Search client, associate, plot…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
            {deals.length === 0 ? "No approved sales yet. Approved tokens will appear here." : "No sales match this filter."}
          </div>
        )}

        {filtered.map((d) => (
          <div key={d.id} className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-ink">{d.buyer_name || "—"}</div>
                {d.buyer_phone ? (
                  <a href={`tel:${d.buyer_phone}`} className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-stone-600">
                    <Phone className="h-3 w-3" /> {d.buyer_phone}
                  </a>
                ) : editingId === d.id ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      autoFocus
                      type="tel"
                      className="field-input !py-1.5 !text-[13px]"
                      placeholder="Client number"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                    />
                    <button onClick={() => savePhone(d.id)} className="rounded-full bg-stone-600 px-3 py-1.5 text-[11.5px] font-semibold text-sand">Save</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingId(d.id); setPhoneDraft(""); }}
                    className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-ink/40"
                  >
                    <Pencil className="h-3 w-3" /> Add number
                  </button>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-[19px] font-semibold leading-none text-ink">{formatINR(d.sale_amount)}</div>
                <div className="mt-1 text-[10.5px] text-ink/40">{formatDate(d.reviewed_at)}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-ink/[0.06] pt-3">
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink/35">Plot</div>
                <div className="mt-0.5 text-[13px] font-medium text-ink">
                  {d.plotNo ? `Plot ${d.plotNo}` : "—"}
                  {d.plotArea ? <span className="text-ink/45"> · {d.plotArea}</span> : null}
                </div>
                {d.township && <div className="text-[11.5px] text-ink/45">{d.township}</div>}
              </div>
              <div>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-ink/35">Associate</div>
                <div className="mt-0.5 text-[13px] font-medium text-ink">{d.associate_name || "—"}</div>
                <div className="text-[11.5px] text-ink/45">
                  Commission {formatINR(d.commission_amount ?? 0)}
                  {d.is_manual ? " · added manually" : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddSaleModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} />
    </div>
  );
}
