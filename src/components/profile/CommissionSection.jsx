import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { computeCommission } from "../../lib/commission";
import { formatDate } from "../../lib/utils";
import { BadgeIndianRupee } from "lucide-react";
import { Card, SectionTitle, StatCard } from "../ui/primitives";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/useToast";

export default function CommissionSection({ employee, isAdmin, refreshKey }) {
  const [stats, setStats] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const showToast = useToast();

  async function load() {
    const [{ data: slabs }, { data: assignments }, { data: deals }] = await Promise.all([
      sb.from("commission_slabs").select("*"),
      sb.from("employee_commission_assignments").select("*").eq("employee_id", employee.id),
      sb
        .from("token_submissions")
        .select("sale_amount, reviewed_at, colony_units(unit_size)")
        .eq("associate_employee_id", employee.id)
        .eq("status", "approved"),
    ]);
    const slabsById = Object.fromEntries((slabs || []).map((s) => [s.id, s]));
    setStats({
      ...computeCommission({ deals: deals || [], assignments: assignments || [], slabsById }),
      assignments: assignments || [],
      slabs: slabs || [],
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  if (!stats) return null;

  return (
    <Card>
      <SectionTitle
        action={
          isAdmin && (
            <button onClick={() => setAssignOpen(true)} className="text-xs font-medium text-stone-600 hover:text-stone-700">
              Assign New Slab
            </button>
          )
        }
      >
        Commission
      </SectionTitle>
      {stats.assignments.length > 0 && (
        <div className="flex items-center gap-2 mb-3.5 -mt-1">
          <BadgeIndianRupee className="w-4 h-4 text-stone-600" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
            {stats.slabs.find((s) => s.id === [...stats.assignments].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0]?.commission_slab_id)?.name || "No"} slab
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Rate / Gaj" value={stats.currentRate != null ? `₹${stats.currentRate.toLocaleString("en-IN")}` : "—"} tone="brass" />
        <StatCard label="Total Deals" value={stats.totalDeals} tone="stone" />
        <StatCard label="Total Sales" value={`₹${stats.totalSales.toLocaleString("en-IN")}`} tone="jali" />
        <StatCard label="This Month" value={`₹${stats.thisMonthCommission.toLocaleString("en-IN")}`} tone="emerald" />
      </div>
      {stats.assignments.length > 0 && (
        <>
          <div className="h-px bg-ink/[0.06] my-5" />
          <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Slab History</div>
          <div className="space-y-2.5">
            {[...stats.assignments]
              .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
              .map((a) => {
                const slab = stats.slabs.find((s) => s.id === a.commission_slab_id);
                return (
                  <div key={a.id}>
                    <div className="text-sm font-medium text-ink">
                      {slab?.name || "—"} · ₹{Number(slab?.commission_per_gaj || 0).toLocaleString("en-IN")}/Gaj
                    </div>
                    <div className="text-xs text-ink/40">From {formatDate(a.effective_date)}</div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      <AssignSlabModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        slabs={stats.slabs}
        employeeId={employee.id}
        onAssigned={() => {
          setAssignOpen(false);
          showToast("Commission slab assigned.");
          load();
        }}
      />
    </Card>
  );
}


function AssignSlabModal({ open, onClose, slabs, employeeId, onAssigned }) {
  const [slabId, setSlabId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!slabId) {
      setErr("Please choose a slab.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await sb.rpc("assign_commission_slab", {
      p_employee_id: employeeId,
      p_slab_id: slabId,
      p_effective_date: effectiveDate,
      p_remarks: remarks.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onAssigned();
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Assign Commission Slab" sub="Old slabs remain in the history and still apply to deals approved while they were active." />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Slab *">
          <select className="field-input" value={slabId} onChange={(e) => setSlabId(e.target.value)}>
            <option value="">Select…</option>
            {slabs.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — ₹{Number(s.commission_per_gaj).toLocaleString("en-IN")}/Gaj
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effective Date">
          <input className="field-input" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </Field>
        <Field label="Remarks">
          <textarea className="field-input min-h-[80px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Assigning…" : "Assign Slab"}</Button>
      </form>
    </Sheet>
  );
}
