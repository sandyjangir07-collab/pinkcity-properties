import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { DOCUMENT_TYPES } from "../lib/constants";
import { initials } from "../lib/utils";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/useToast";

const EASE = [0.22, 1, 0.36, 1];

export default function Directory() {
  const [employees, setEmployees] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [docStatusByEmployee, setDocStatusByEmployee] = useState({});
  const [totalSales, setTotalSales] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const showToast = useToast();

  async function load() {
    setErrorMsg(null);
    try {
      const [{ data: emps, error: e1 }, { data: hier, error: e2 }, { data: docs, error: e3 }, { data: approvedTokens, error: e4 }] = await Promise.all([
        sb.from("employees").select("*").order("full_name"),
        sb.from("employee_hierarchy").select("*").eq("status", "approved"),
        sb.from("employee_documents").select("employee_id, document_type, status"),
        sb.from("token_submissions").select("sale_amount").eq("status", "approved"),
      ]);
      const firstError = e1 || e2 || e3 || e4;
      if (firstError) throw firstError;
      setEmployees(emps || []);
      setHierarchy(hier || []);
      setTotalSales((approvedTokens || []).reduce((sum, t) => sum + (Number(t.sale_amount) || 0), 0));

      const byEmp = {};
      (docs || []).forEach((d) => {
        byEmp[d.employee_id] = byEmp[d.employee_id] || {};
        byEmp[d.employee_id][d.document_type] = d.status;
      });
      setDocStatusByEmployee(byEmp);
    } catch (e) {
      console.error("Directory load failed:", e);
      setErrorMsg(e.message || "Something went wrong loading the directory.");
      setEmployees([]);
    }
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
      <div className="max-w-3xl mx-auto px-5 py-20 flex justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Team Directory</h1>
      <p className="text-ink/50 text-sm mb-8">Employees, hierarchy, documents and commission — all in one place.</p>

      {errorMsg && <div className="mb-6 rounded-2xl bg-red-50 text-red-600 text-sm px-5 py-4">{errorMsg}</div>}

      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat label="Members" value={employees.length} />
        <Stat label="Fully Verified" value={fullyVerifiedCount} />
        <Stat label="Total Sales" value={`₹${totalSales.toLocaleString("en-IN")}`} />
      </div>

      <div className="bg-white rounded-3xl p-3">
        {tree.length === 0 && (
          <div className="text-center py-16 text-ink/40">
            <div className="font-display text-lg text-ink mb-1">No team members yet</div>
            <p className="text-sm">Add your first team member to get started.</p>
          </div>
        )}
        {tree.map(({ employee, children }, i) => (
          <motion.div
            key={employee.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
          >
            <PersonRow employee={employee} verified={isFullyVerified(employee.id)} />
            {children.length > 0 && (
              <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 px-4 pt-3 pb-1">
                Reports to {employee.full_name}
              </div>
            )}
            {children.map((c) => (
              <PersonRow key={c.id} employee={c} verified={isFullyVerified(c.id)} indent />
            ))}
          </motion.div>
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/15 text-ink/50 hover:text-stone-600 hover:border-stone-300 py-3.5 text-sm font-medium transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
          Add team member
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

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/35 mb-1">{label}</div>
      <div className="font-display text-2xl text-ink">{value}</div>
    </div>
  );
}

function PersonRow({ employee, verified, indent }) {
  return (
    <Link
      to={`/employees/${employee.id}`}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-ink/[0.03] transition-colors ${indent ? "ml-6" : ""}`}
    >
      <div className="w-10 h-10 rounded-full bg-stone-50 text-stone-600 flex items-center justify-center font-medium text-sm overflow-hidden shrink-0">
        {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" /> : initials(employee.full_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink truncate">{employee.full_name}</div>
        <div className="text-xs text-ink/45 truncate">{employee.designation || "—"}</div>
      </div>
      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${verified ? "bg-emerald-50 text-emerald-700" : "bg-ink/[0.05] text-ink/45"}`}>
        {verified ? "Verified" : "Unverified"}
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/25 shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="w-full sm:max-w-sm bg-sand rounded-t-3xl sm:rounded-3xl p-7"
          >
            <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto -mt-3 mb-5 sm:hidden" />
            <h3 className="font-display text-2xl text-ink mb-1.5">Add Team Member</h3>
            <p className="text-sm text-ink/50 mb-6">They&apos;ll be auto-linked the first time they log in with this email.</p>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Full Name *"><input className="field-input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
              <Field label="Email"><input className="field-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mobile"><input className="field-input" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /></Field>
                <Field label="Designation"><input className="field-input" value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
              </div>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <Button disabled={busy} type="submit" className="w-full">{busy ? "Adding…" : "Add Team Member"}</Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
