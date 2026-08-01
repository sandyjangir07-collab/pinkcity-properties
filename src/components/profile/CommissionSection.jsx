import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { computeCommission } from "../../lib/commission";
import { formatDate } from "../../lib/utils";
import { Modal, ModalHero } from "../ui/Modal";
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
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Commission
        </h2>
        {isAdmin && (
          <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setAssignOpen(true)}>
            Assign New Slab
          </button>
        )}
      </div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Rate / Gaj</div>
          <div className="stat-value">{stats.currentRate != null ? `₹${stats.currentRate.toLocaleString("en-IN")}` : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Deals</div>
          <div className="stat-value">{stats.totalDeals}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">₹{stats.totalSales.toLocaleString("en-IN")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value">₹{stats.thisMonthCommission.toLocaleString("en-IN")}</div>
        </div>
      </div>
      {stats.assignments.length > 0 && (
        <>
          <div className="divider" />
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>
            Slab History
          </div>
          {[...stats.assignments]
            .sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
            .map((a) => {
              const slab = stats.slabs.find((s) => s.id === a.commission_slab_id);
              return (
                <div key={a.id} className="info-row" style={{ padding: "6px 0" }}>
                  <div>
                    <div className="info-row-value">
                      {slab?.name || "—"} · ₹{Number(slab?.commission_per_gaj || 0).toLocaleString("en-IN")}/Gaj
                    </div>
                    <div className="info-row-label">From {formatDate(a.effective_date)}</div>
                  </div>
                </div>
              );
            })}
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
    </div>
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
    <Modal open={open} onClose={onClose}>
      <ModalHero title="Assign Commission Slab" sub="Old slabs remain in the history and still apply to deals approved while they were active." />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field">
            <label className="fl">Slab *</label>
            <select className="fsel" value={slabId} onChange={(e) => setSlabId(e.target.value)}>
              <option value="">Select…</option>
              {slabs.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ₹{Number(s.commission_per_gaj).toLocaleString("en-IN")}/Gaj
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fl">Effective Date</label>
            <input className="fi" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Remarks</label>
            <textarea className="fi" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Assigning…" : "Assign Slab"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
