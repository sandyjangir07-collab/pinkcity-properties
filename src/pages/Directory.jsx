import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ShieldCheck, TrendingUp, ChevronRight, UserPlus } from "lucide-react";
import { sb } from "../lib/supabase";
import { DOCUMENT_TYPES } from "../lib/constants";
import { initials } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Sheet, SheetHeader, Field } from "../components/ui/Sheet";
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
      <div className="text-[11px] font-semibold tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-[32px] leading-[1.05] text-ink mb-2">Team Directory</h1>
      <p className="text-[13.5px] text-ink/50 mb-8">Employees, hierarchy, documents and commission — all in one place.</p>

      {errorMsg && <div className="mb-6 rounded-2xl bg-red-50 text-red-600 text-sm px-5 py-4">{errorMsg}</div>}

      <div className="grid grid-cols-3 gap-2.5 mb-8">
        <Stat n={String(employees.length)} label="Members" Icon={Users} />
        <Stat n={`${fullyVerifiedCount}/${employees.length}`} label="Fully verified" Icon={ShieldCheck} />
        <Stat n={`₹${totalSales.toLocaleString("en-IN")}`} label="Total Sales" Icon={TrendingUp} />
      </div>

      <div className="space-y-2.5">
        {tree.length === 0 && (
          <div className="bg-surface border border-ink/[0.06] shadow-soft rounded-3xl text-center py-16 text-ink/40">
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
            className="space-y-2.5"
          >
            <PersonRow employee={employee} verified={isFullyVerified(employee.id)} />
            {children.length > 0 && (
              <div className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-ink/35 pl-4 pt-1">
                Reports to {employee.full_name}
              </div>
            )}
            {children.length > 0 && (
              <div className="ml-4 space-y-2 border-l border-ink/[0.08] pl-3.5">
                {children.map((c) => (
                  <PersonRow key={c.id} employee={c} verified={isFullyVerified(c.id)} junior />
                ))}
              </div>
            )}
          </motion.div>
        ))}

        <button
          onClick={() => setAddOpen(true)}
          className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/15 text-ink/50 hover:text-stone-600 hover:border-stone-300 py-3.5 text-[13.5px] font-medium transition-colors active:scale-[0.99]"
        >
          <UserPlus className="w-4 h-4" />
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

function Stat({ n, label, Icon }) {
  return (
    <div className="rounded-[22px] border border-ink/[0.06] bg-surface p-3.5 shadow-soft">
      <Icon className="w-4 h-4 text-stone-600" />
      <div className="mt-2 font-display text-[20px] leading-none text-ink">{n}</div>
      <div className="mt-1.5 text-[10.5px] leading-tight text-ink/45">{label}</div>
    </div>
  );
}

function PersonRow({ employee, verified, junior }) {
  return (
    <Link
      to={`/employees/${employee.id}`}
      className={`flex items-center gap-3 rounded-[22px] border border-ink/[0.06] bg-surface px-3.5 py-3.5 transition-transform active:scale-[0.99] ${junior ? "shadow-none" : "shadow-soft"}`}
    >
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-600 font-display overflow-hidden"
        style={{ height: junior ? 38 : 46, width: junior ? 38 : 46, fontSize: (junior ? 38 : 46) * 0.36 }}
      >
        {employee.photo_url ? <img src={employee.photo_url} alt="" className="w-full h-full object-cover" /> : initials(employee.full_name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold text-ink">{employee.full_name}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink/45">{employee.designation || "—"}</span>
      </span>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-ink/[0.05] text-ink/45"}`}>
        {verified ? "Verified" : "Unverified"}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-ink/30" />
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
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Add Team Member" sub="They'll be auto-linked the first time they log in with this email." />
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
    </Sheet>
  );
}
