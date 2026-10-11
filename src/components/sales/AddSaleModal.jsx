import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let plotKey = 0;
const newPlot = () => ({ key: ++plotKey, manual: false, townshipId: "", unitId: "", township: "", plotNo: "", plotArea: "" });

// One plot in the sale: either picked from the system (township -> plot, area
// auto-fills) or typed in by hand when it isn't in the system.
function PlotRow({ index, plot, townships, excludeIds, onChange, onRemove }) {
  const [units, setUnits] = useState([]);

  useEffect(() => {
    if (plot.manual || !plot.townshipId) {
      setUnits([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: us }, { data: taken }] = await Promise.all([
        sb.from("colony_units").select("id,unit_number,unit_size,status").eq("listing_id", plot.townshipId).in("status", ["available", "sold"]).order("unit_number"),
        sb.from("token_submissions").select("unit_id").eq("listing_id", plot.townshipId).in("status", ["approved", "pending"]),
      ]);
      if (cancelled) return;
      const takenIds = new Set((taken || []).map((t) => t.unit_id));
      setUnits((us || []).filter((u) => !takenIds.has(u.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [plot.manual, plot.townshipId]);

  const available = units.filter((u) => u.id === plot.unitId || !excludeIds.has(u.id));
  const selected = units.find((u) => u.id === plot.unitId);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Plot {index + 1}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove plot" className="flex h-6 w-6 items-center justify-center rounded-full text-ink/40 hover:text-ink">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!plot.manual ? (
        <>
          <Field label="Township *">
            <select className="field-input" value={plot.townshipId} onChange={(e) => onChange({ townshipId: e.target.value, unitId: "" })}>
              <option value="">Choose township…</option>
              {townships.map((t) => (
                <option key={t.id} value={t.id}>{t.title}{t.area ? ` — ${t.area}` : ""}</option>
              ))}
            </select>
          </Field>
          {plot.townshipId && (
            <Field label="Plot no *">
              <select className="field-input" value={plot.unitId} onChange={(e) => onChange({ unitId: e.target.value })}>
                <option value="">Choose plot…</option>
                {available.map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_number}{u.unit_size ? ` — ${u.unit_size}` : ""}</option>
                ))}
              </select>
              {available.length === 0 && <p className="mt-1.5 text-xs text-ink/40">No open plots here — all already have a sale or a pending token.</p>}
            </Field>
          )}
          {selected && (
            <div className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink/60">
              Plot area: <span className="font-semibold text-ink">{selected.unit_size || "—"}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <Field label="Township">
            <input className="field-input" value={plot.township} onChange={(e) => onChange({ township: e.target.value })} placeholder="e.g. Kailash Dham" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plot no *">
              <input className="field-input" value={plot.plotNo} onChange={(e) => onChange({ plotNo: e.target.value })} placeholder="e.g. 42" />
            </Field>
            <Field label="Plot area">
              <input className="field-input" value={plot.plotArea} onChange={(e) => onChange({ plotArea: e.target.value })} placeholder="e.g. 200 Gaj" />
            </Field>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => onChange({ manual: !plot.manual, townshipId: "", unitId: "", township: "", plotNo: "", plotArea: "" })}
        className="text-xs font-medium text-stone-600 underline-offset-2 hover:underline"
      >
        {plot.manual ? "← Pick this plot from the system instead" : "Plot isn't in the system? Type the details instead"}
      </button>
    </div>
  );
}

// Admin-only: record a sale that didn't come through Plots & Tokens. One sale
// can cover several plots. Saved through admin_add_sale as an already-approved
// deal credited to the chosen associate (counts in their portal and monthly
// commission); plots picked from the system are marked Sold.
export default function AddSaleModal({ open, onClose, onAdded }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [associateId, setAssociateId] = useState("");
  const [plots, setPlots] = useState([newPlot()]);
  const [commission, setCommission] = useState("");
  const [saleDate, setSaleDate] = useState(todayLocal());
  const [employees, setEmployees] = useState([]);
  const [townships, setTownships] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientName("");
    setClientPhone("");
    setAssociateId("");
    setPlots([newPlot()]);
    setCommission("");
    setSaleDate(todayLocal());
    setErr("");
    sb.from("employees").select("id,full_name").order("full_name").then(({ data }) => setEmployees(data || []));
    sb.from("listings").select("id,title,area").eq("type", "colony").order("title").then(({ data }) => setTownships(data || []));
  }, [open]);

  const updatePlot = (key, patch) => setPlots((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const plotOk = (p) => (p.manual ? p.plotNo.trim() : p.unitId);
  const ready = clientName.trim() && associateId && plots.every(plotOk) && commission !== "" && Number(commission) >= 0;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setErr("");
    const { error } = await sb.rpc("admin_add_sale", {
      p_buyer_name: clientName,
      p_buyer_phone: clientPhone || null,
      p_associate_employee_id: associateId,
      p_plots: plots.map((p) =>
        p.manual ? { unit_id: null, township: p.township, plot_no: p.plotNo, plot_area: p.plotArea } : { unit_id: p.unitId }
      ),
      p_commission_amount: Number(commission),
      p_sale_date: saleDate || null,
      p_admin_name: profile?.full_name || profile?.email || user?.email || "Admin",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    showToast("✓ Sale added.");
    onAdded();
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Add a sale" sub="Saved as an approved deal and credited to the associate you pick." />

      <div className="space-y-3">
        <Field label="Client name *">
          <input className="field-input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Client number">
          <input className="field-input" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Mobile number" />
        </Field>
        <Field label="Associate *">
          <select className="field-input" value={associateId} onChange={(e) => setAssociateId(e.target.value)}>
            <option value="">Choose associate…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </Field>

        {plots.map((p, i) => (
          <PlotRow
            key={p.key}
            index={i}
            plot={p}
            townships={townships}
            excludeIds={new Set(plots.filter((o) => o.key !== p.key && o.unitId).map((o) => o.unitId))}
            onChange={(patch) => updatePlot(p.key, patch)}
            onRemove={plots.length > 1 ? () => setPlots((list) => list.filter((o) => o.key !== p.key)) : null}
          />
        ))}
        <button
          type="button"
          onClick={() => setPlots((list) => [...list, newPlot()])}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-stone-400 px-4 py-2 text-xs font-semibold text-stone-600"
        >
          <Plus className="h-3.5 w-3.5" /> Add another plot
        </button>

        <Field label="Commission earned by associate (₹) *">
          <input className="field-input" type="number" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="e.g. 45000" />
          {plots.length > 1 && <p className="mt-1.5 text-xs text-ink/40">One commission for the whole sale, not per plot.</p>}
        </Field>
        <Field label="Sale date">
          <input className="field-input" type="date" value={saleDate} max={todayLocal()} onChange={(e) => setSaleDate(e.target.value)} />
        </Field>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        className="mt-5 w-full rounded-full bg-gradient-to-br from-stone-500 to-stone-700 py-3.5 text-sm font-semibold text-sand disabled:opacity-40"
      >
        {busy ? "Adding…" : "Add sale"}
      </button>
    </Sheet>
  );
}
