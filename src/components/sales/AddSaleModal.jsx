import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMPTY = {
  clientName: "",
  clientPhone: "",
  associateId: "",
  manualPlot: false,
  townshipId: "",
  unitId: "",
  manualTownship: "",
  manualPlotNo: "",
  manualPlotArea: "",
  amount: "",
  commission: "",
  saleDate: todayLocal(),
  notes: "",
};

// Admin-only: record a sale that didn't come through Plots & Tokens. Goes
// through the admin_add_sale function, which saves it as an already-approved
// deal credited to the chosen associate (so it counts in their portal and
// monthly commission) and marks the plot Sold when it's picked from the system.
export default function AddSaleModal({ open, onClose, onAdded }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [f, setF] = useState(EMPTY);
  const [employees, setEmployees] = useState([]);
  const [townships, setTownships] = useState([]);
  const [units, setUnits] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setF({ ...EMPTY, saleDate: todayLocal() });
    setErr("");
    sb.from("employees").select("id,full_name").order("full_name").then(({ data }) => setEmployees(data || []));
    sb.from("listings")
      .select("id,title,area")
      .eq("type", "colony")
      .order("title")
      .then(({ data }) => setTownships(data || []));
  }, [open]);

  useEffect(() => {
    set("unitId", "");
    if (!f.townshipId) {
      setUnits([]);
      return;
    }
    (async () => {
      const [{ data: us }, { data: taken }] = await Promise.all([
        sb.from("colony_units").select("id,unit_number,unit_size,status").eq("listing_id", f.townshipId).in("status", ["available", "sold"]).order("unit_number"),
        sb.from("token_submissions").select("unit_id").eq("listing_id", f.townshipId).in("status", ["approved", "pending"]),
      ]);
      const takenIds = new Set((taken || []).map((t) => t.unit_id));
      setUnits((us || []).filter((u) => !takenIds.has(u.id)));
    })();
  }, [f.townshipId]);

  const selectedUnit = units.find((u) => u.id === f.unitId);

  const plotOk = f.manualPlot ? f.manualPlotNo.trim() : f.unitId;
  const ready = f.clientName.trim() && f.associateId && plotOk && Number(f.amount) > 0 && f.commission !== "" && Number(f.commission) >= 0;

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setErr("");
    const { error } = await sb.rpc("admin_add_sale", {
      p_buyer_name: f.clientName,
      p_buyer_phone: f.clientPhone || null,
      p_associate_employee_id: f.associateId,
      p_unit_id: f.manualPlot ? null : f.unitId,
      p_manual_township: f.manualPlot ? f.manualTownship : null,
      p_manual_plot_no: f.manualPlot ? f.manualPlotNo : null,
      p_manual_plot_area: f.manualPlot ? f.manualPlotArea : null,
      p_sale_amount: Number(f.amount),
      p_commission_amount: Number(f.commission),
      p_sale_date: f.saleDate || null,
      p_notes: f.notes || null,
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
          <input className="field-input" value={f.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Client number">
          <input className="field-input" type="tel" value={f.clientPhone} onChange={(e) => set("clientPhone", e.target.value)} placeholder="Mobile number" />
        </Field>
        <Field label="Associate *">
          <select className="field-input" value={f.associateId} onChange={(e) => set("associateId", e.target.value)}>
            <option value="">Choose associate…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>
        </Field>

        {!f.manualPlot ? (
          <>
            <Field label="Township *">
              <select className="field-input" value={f.townshipId} onChange={(e) => set("townshipId", e.target.value)}>
                <option value="">Choose township…</option>
                {townships.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}{t.area ? ` — ${t.area}` : ""}</option>
                ))}
              </select>
            </Field>
            {f.townshipId && (
              <Field label="Plot no *">
                <select className="field-input" value={f.unitId} onChange={(e) => set("unitId", e.target.value)}>
                  <option value="">Choose plot…</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.unit_number}{u.unit_size ? ` — ${u.unit_size}` : ""}</option>
                  ))}
                </select>
                {units.length === 0 && <p className="mt-1.5 text-xs text-ink/40">No open plots here — all already have a sale or a pending token.</p>}
              </Field>
            )}
            {selectedUnit && (
              <div className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/60">
                Plot area: <span className="font-semibold text-ink">{selectedUnit.unit_size || "—"}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Township">
              <input className="field-input" value={f.manualTownship} onChange={(e) => set("manualTownship", e.target.value)} placeholder="e.g. Kailash Dham" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plot no *">
                <input className="field-input" value={f.manualPlotNo} onChange={(e) => set("manualPlotNo", e.target.value)} placeholder="e.g. 42" />
              </Field>
              <Field label="Plot area">
                <input className="field-input" value={f.manualPlotArea} onChange={(e) => set("manualPlotArea", e.target.value)} placeholder="e.g. 200 Gaj" />
              </Field>
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => set("manualPlot", !f.manualPlot)}
          className="text-xs font-medium text-stone-600 underline-offset-2 hover:underline"
        >
          {f.manualPlot ? "← Pick the plot from the system instead" : "Plot isn't in the system? Type the details instead"}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount received (₹) *">
            <input className="field-input" type="number" inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="e.g. 4500000" />
          </Field>
          <Field label="Commission (₹) *">
            <input className="field-input" type="number" inputMode="decimal" value={f.commission} onChange={(e) => set("commission", e.target.value)} placeholder="e.g. 45000" />
          </Field>
        </div>
        <Field label="Sale date">
          <input className="field-input" type="date" value={f.saleDate} max={todayLocal()} onChange={(e) => set("saleDate", e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className="field-input min-h-[64px]" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Payment mode, reference, anything to remember" />
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
