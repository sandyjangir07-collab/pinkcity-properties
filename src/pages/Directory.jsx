import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../lib/supabase";
import { DOCUMENT_TYPES } from "../lib/constants";
import { initials } from "../lib/utils";
import { IconChevronRight, IconPlus } from "../components/ui/Icons";
import { Modal, ModalHero } from "../components/ui/Modal";
import { useToast } from "../hooks/useToast";

export default function Directory() {
  const [employees, setEmployees] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [docStatusByEmployee, setDocStatusByEmployee] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const showToast = useToast();

  async function load() {
    const [{ data: emps }, { data: hier }, { data: docs }, { data: approvedTokens }] = await Promise.all([
      sb.from("employees").select("*").order("full_name"),
      sb.from("employee_hierarchy").select("*").eq("status", "approved"),
      sb.from("employee_documents").select("employee_id, document_type, status"),
      sb.from("token_submissions").select("sale_amount").eq("status", "approved"),
    ]);
    setEmployees(emps || []);
    setHierarchy(hier || []);
    setTotalSales((approvedTokens || []).reduce((sum, t) => sum + (Number(t.sale_amount) || 0), 0));

    const byEmp = {};
    (docs || []).forEach((d) => {
      byEmp[d.employee_id] = byEmp[d.employee_id] || {};
      byEmp[d.employee_id][d.document_type] = d.status;
    });
    setDocStatusByEmployee(byEmp);
  }

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => {
    if (!employees) return [];
    const juniorIds = new Set(hierarchy.map((h) => h.junior_id));
    const childrenOf = (empId) =>
      hierarchy.filter((h) => h.senior_id === empId).map((h) => employees.find((e) => e.id === h.junior_id)).filter(Boolean);
    const roots = employees.filter((e) => !juniorIds.has(e.id));
    return roots.map((r) => ({ employee: r, children: childrenOf(r.id) }));
  }, [employees, hierarchy]);

  function isFullyVerified(empId) {
    const statuses = docStatusByEmployee[empId] || {};
    return DOCUMENT_TYPES.every((d) => statuses[d.type] === "approved");
  }

  const fullyVerifiedCount = employees ? employees.filter((e) => isFullyVerified(e.id)).length : 0;

  if (employees === null) {
    return (
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Team Directory</h1>
      <p className="page-sub">Employees, hierarchy, documents and commission — all in one place.</p>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Members</div>
          <div className="stat-value">{employees.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fully Verified</div>
          <div className="stat-value">{fullyVerifiedCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value">₹{totalSales.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="card">
        {tree.length === 0 && (
          <div className="empty-state">
            <div className="empty-title">No team members yet</div>
            <p>Add your first team member to get started.</p>
          </div>
        )}
        {tree.map(({ employee, children }) => (
          <div key={employee.id}>
            <PersonRow employee={employee} verified={isFullyVerified(employee.id)} />
            {children.length > 0 && <div className="hierarchy-group-label">Reports to {employee.full_name}</div>}
            {children.map((c) => (
              <PersonRow key={c.id} employee={c} verified={isFullyVerified(c.id)} indent />
            ))}
          </div>
        ))}

        <button
          className="btn btn-secondary"
          style={{ width: "100%", marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          onClick={() => setAddOpen(true)}
        >
          <IconPlus size={15} /> Add team member
        </button>
      </div>

      <AddEmployeeModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          setAddOpen(false);
          showToast("Team member added.");
          load();
        }}
      />
    </div>
  );
}

function PersonRow({ employee, verified, indent }) {
  return (
    <Link to={`/employees/${employee.id}`} className="person-row" style={indent ? { paddingLeft: 24 } : undefined}>
      <div className="avatar">
        {employee.photo_url ? <img src={employee.photo_url} alt="" /> : initials(employee.full_name)}
      </div>
      <div>
        <div className="person-row-name">{employee.full_name}</div>
        <div className="person-row-meta">{employee.designation || "—"}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <span className={"pill " + (verified ? "pill-green" : "pill-neutral")}>
          {verified ? "Verified" : "Unverified"}
        </span>
        <span className="person-row-chevron">
          <IconChevronRight size={16} />
        </span>
      </div>
    </Link>
  );
}

function AddEmployeeModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: "", email: "", mobile: "", designation: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setErr("Full name is required.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await sb.from("employees").insert({
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
      designation: form.designation.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setForm({ full_name: "", email: "", mobile: "", designation: "" });
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHero title="Add Team Member" sub="They'll be auto-linked the first time they log in with this email." />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field">
            <label className="fl">Full Name *</label>
            <input className="fi" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Email</label>
            <input className="fi" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Mobile</label>
              <input className="fi" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Designation</label>
              <input className="fi" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </div>
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Adding…" : "Add Team Member"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
