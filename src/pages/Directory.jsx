import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, ShieldCheck, TrendingUp, ChevronRight, UserPlus, Search, X } from "lucide-react";
import { sb } from "../lib/supabase";
import { DOCUMENT_TYPES } from "../lib/constants";
import { initials } from "../lib/utils";
import { Button } from "../components/ui/button";
import { StatCard } from "../components/ui/primitives";
import { Sheet, SheetHeader, Field } from "../components/ui/Sheet";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import MyTeamStats from "../components/sales/MyTeamStats";

const EASE = [0.22, 1, 0.36, 1];

export default function Directory() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState(null);
  const [hierarchy, setHierarchy] = useState([]);
  const [docStatusByEmployee, setDocStatusByEmployee] = useState({});
  // Same source as the Sales page: every approved sale row is one plot sold.
  const [plotsSold, setPlotsSold] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const showToast = useToast();

  async function load() {
    setErrorMsg(null);
    try {
      const [{ data: emps, error: e1 }, { data: hier, error: e2 }, { data: docs, error: e3 }, { count: soldCount, error: e4 }] = await Promise.all([
        sb.from("employees").select("*").order("full_name"),
        sb.from("employee_hierarchy").select("*").eq("status", "approved"),
        sb.from("employee_documents").select("employee_id, document_type, status"),
        sb.from("token_submissions").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      const firstError = e1 || e2 || e3 || e4;
      if (firstError) throw firstError;
      setEmployees(emps || []);
      setHierarchy(hier || []);
      setPlotsSold(soldCount || 0);

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

  // The full reporting tree, to any depth. Everyone appears: top-level people at
  // the root, and each person's subordinates nested under them (and theirs under
  // them). Only approved reporting lines count; a loop can never hide anyone.
  const tree = useMemo(() => {
    if (!employees) return [];
    const byId = new Map(employees.map((e) => [e.id, e]));
    const lines = hierarchy.filter((h) => byId.has(h.junior_id) && byId.has(h.senior_id) && h.junior_id !== h.senior_id);
    const kids = new Map();
    for (const h of lines) {
      if (!kids.has(h.senior_id)) kids.set(h.senior_id, []);
      kids.get(h.senior_id).push(byId.get(h.junior_id));
    }
    const juniorIds = new Set(lines.map((h) => h.junior_id));
    const seen = new Set();
    const build = (emp, path) => {
      seen.add(emp.id);
      const next = new Set(path).add(emp.id);
      return { employee: emp, children: (kids.get(emp.id) || []).filter((c) => !next.has(c.id)).map((c) => build(c, next)) };
    };
    const roots = employees.filter((e) => !juniorIds.has(e.id)).map((r) => build(r, new Set()));
    // Anyone still unplaced (e.g. people who report to each other in a loop) is shown once, one at a time
    const left = [];
    for (const e of employees) if (!seen.has(e.id)) left.push(build(e, new Set()));
    return [...roots, ...left];
  }, [employees, hierarchy]);

  const searchTerm = search.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!employees || !searchTerm) return null;
    return employees.filter(
      (e) =>
        (e.full_name || "").toLowerCase().includes(searchTerm) ||
        (e.employee_code || "").toLowerCase().includes(searchTerm)
    );
  }, [employees, searchTerm]);

  function isFullyVerified(empId) {
    const statuses = docStatusByEmployee[empId] || {};
    return DOCUMENT_TYPES.every((d) => statuses[d.type] === "approved");
  }

  const fullyVerifiedCount = employees ? employees.filter((e) => isFullyVerified(e.id)).length : 0;

  if (employees === null) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-[11px] font-semibold tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-[32px] leading-[1.05] text-ink mb-2">Team Directory</h1>
      <p className="text-[13.5px] text-ink/50 mb-8">Employees, hierarchy, documents and commission — all in one place.</p>

      {errorMsg && <div className="mb-6 rounded-2xl bg-red-50 text-red-600 text-sm px-5 py-4">{errorMsg}</div>}

      {!isAdmin && <MyTeamStats />}

      <div className={`grid ${isAdmin ? "grid-cols-3" : "grid-cols-2"} gap-2.5 mb-8`}>
        <StatCard value={String(employees.length)} label="Members" Icon={Users} tone="stone" />
        <StatCard value={`${fullyVerifiedCount}/${employees.length}`} label="Fully verified" Icon={ShieldCheck} tone="emerald" />
        {isAdmin && <StatCard value={String(plotsSold)} label="Total plots sold" Icon={TrendingUp} tone="brass" />}
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 text-ink/35 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          className="field-input pl-11 pr-10"
          placeholder="Search by name or employee ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <div className="bg-surface border border-ink/[0.06] shadow-soft rounded-3xl text-center py-16 text-ink/40">
              <div className="font-display text-[19px] text-ink mb-1">No employees found</div>
              <p className="text-sm">Try a different name or employee ID.</p>
            </div>
          ) : (
            searchResults.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}>
                <PersonRow employee={e} verified={isFullyVerified(e.id)} />
              </motion.div>
            ))
          )
        ) : (
          <>
            {tree.length === 0 && (
              <div className="bg-surface border border-ink/[0.06] shadow-soft rounded-3xl text-center py-16 text-ink/40">
                <img src="/logo.png" alt="" className="w-12 h-12 object-contain mx-auto mb-3 opacity-25" />
            <div className="font-display text-[19px] text-ink mb-1">No team members yet</div>
                <p className="text-sm">Add your first team member to get started.</p>
              </div>
            )}
            {tree.map((node, i) => (
              <motion.div
                key={node.employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
              >
                <TreeNode node={node} depth={0} isFullyVerified={isFullyVerified} />
              </motion.div>
            ))}
          </>
        )}

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

// One person, then their subordinates nested beneath (recursively).
function TreeNode({ node, depth, isFullyVerified }) {
  const { employee, children } = node;
  return (
    <div className="space-y-2.5">
      <PersonRow employee={employee} verified={isFullyVerified(employee.id)} junior={depth > 0} subCount={children.length} />
      {children.length > 0 && (
        <>
          <div className="pl-4 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/35">
            Subordinates of {employee.full_name} · {children.length}
          </div>
          <div className={`space-y-2.5 border-l border-ink/[0.08] ${depth >= 2 ? "ml-2 pl-2.5" : "ml-4 pl-3.5"}`}>
            {children.map((c) => (
              <TreeNode key={c.employee.id} node={c} depth={depth + 1} isFullyVerified={isFullyVerified} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PersonRow({ employee, verified, junior, subCount = 0 }) {
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
        <span className="mt-0.5 block truncate text-[11.5px] text-ink/45">
          {employee.designation || "—"}
          {subCount > 0 && <span className="text-ink/35"> · {subCount} subordinate{subCount === 1 ? "" : "s"}</span>}
        </span>
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
