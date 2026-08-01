import { useState } from "react";
import { sb } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { IconBriefcase, IconCalendar } from "../ui/Icons";
import { Modal, ModalHero } from "../ui/Modal";
import { useToast } from "../../hooks/useToast";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const STATUSES = ["active", "inactive", "terminated"];

function experienceLabel(joiningDate) {
  if (!joiningDate) return null;
  const start = new Date(joiningDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} mo`;
  return remMonths ? `${years} yr ${remMonths} mo` : `${years} yr`;
}

export default function EmploymentSection({ employee, isAdmin, onUpdated }) {
  const [editOpen, setEditOpen] = useState(false);
  const showToast = useToast();
  const exp = experienceLabel(employee.joining_date);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Employment
        </h2>
        {isAdmin && (
          <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setEditOpen(true)}>
            Edit
          </button>
        )}
      </div>
      <div className="info-row">
        <div className="info-row-icon">
          <IconBriefcase size={16} />
        </div>
        <div>
          <div className="info-row-label">Designation &amp; Department</div>
          <div className="info-row-value">
            {employee.designation || "—"}
            {employee.department ? ` · ${employee.department}` : ""}
          </div>
        </div>
      </div>
      <div className="info-row">
        <div className="info-row-icon">
          <IconBriefcase size={16} />
        </div>
        <div>
          <div className="info-row-label">Type &amp; Status</div>
          <div className="info-row-value" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {(employee.employment_type || "full_time").replace("_", " ")}
            <StatusPill status={employee.status} />
          </div>
        </div>
      </div>
      <div className="info-row">
        <div className="info-row-icon">
          <IconCalendar size={16} />
        </div>
        <div>
          <div className="info-row-label">Joined &amp; Experience</div>
          <div className="info-row-value">
            {formatDate(employee.joining_date)}
            {exp ? ` · ${exp}` : ""}
          </div>
        </div>
      </div>

      <EditEmploymentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={employee}
        onSaved={() => {
          setEditOpen(false);
          showToast("Employment details updated.");
          onUpdated && onUpdated();
        }}
      />
    </div>
  );
}

function StatusPill({ status }) {
  const cls = status === "active" ? "pill-green" : status === "inactive" ? "pill-yellow" : "pill-red";
  return <span className={"pill " + cls}>{status || "active"}</span>;
}

function EditEmploymentModal({ open, onClose, employee, onSaved }) {
  const [form, setForm] = useState({
    designation: employee.designation || "",
    department: employee.department || "",
    employment_type: employee.employment_type || "full_time",
    status: employee.status || "active",
    joining_date: employee.joining_date || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await sb
      .from("employees")
      .update({
        designation: form.designation.trim() || null,
        department: form.department.trim() || null,
        employment_type: form.employment_type,
        status: form.status,
        joining_date: form.joining_date || null,
      })
      .eq("id", employee.id);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHero title="Edit Employment" />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Designation</label>
              <input className="fi" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Department</label>
              <input className="fi" value={form.department} onChange={(e) => set("department", e.target.value)} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Employment Type</label>
              <select className="fsel" value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="fl">Status</label>
              <select className="fsel" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field" style={{ minWidth: 0 }}>
            <label className="fl">Joining Date</label>
            <input className="fi" type="date" style={{ minWidth: 0 }} value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
