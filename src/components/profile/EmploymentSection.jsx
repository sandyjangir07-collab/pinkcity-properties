import { useState } from "react";
import { BriefcaseBusiness, TrendingUp, Users } from "lucide-react";
import { sb } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { Card, SectionTitle, Pill } from "../ui/primitives";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";
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
    <Card>
      <SectionTitle
        action={
          isAdmin && (
            <button onClick={() => setEditOpen(true)} className="text-xs font-medium text-stone-600 hover:text-stone-700">Edit</button>
          )
        }
      >
        Employment
      </SectionTitle>
      <div className="space-y-4">
        <Row icon={BriefcaseBusiness} label="Designation & Department" value={`${employee.designation || "—"}${employee.department ? ` · ${employee.department}` : ""}`} />
        <Row
          icon={TrendingUp}
          label="Type & Status"
          value={
            <span className="flex items-center gap-2">
              {(employee.employment_type || "full_time").replace("_", " ")}
              <StatusPill status={employee.status} />
            </span>
          }
        />
        <Row icon={Users} label="Joined & Experience" value={`${formatDate(employee.joining_date)}${exp ? ` · ${exp}` : ""}`} />
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
    </Card>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      {Icon && (
        <span className="inline-flex w-9 h-9 shrink-0 items-center justify-center rounded-xl bg-stone-50">
          <Icon className="w-4 h-4 text-stone-600" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink/40 mb-0.5">{label}</div>
        <div className="text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = status === "active" ? "green" : status === "inactive" ? "yellow" : "red";
  return <Pill tone={tone}>{status || "active"}</Pill>;
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
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Edit Employment" />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Designation"><input className="field-input" value={form.designation} onChange={(e) => set("designation", e.target.value)} /></Field>
          <Field label="Department"><input className="field-input" value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employment Type">
            <select className="field-input" value={form.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => (<option key={t} value={t}>{t.replace("_", " ")}</option>))}
            </select>
          </Field>
          <Field label="Status">
            <select className="field-input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </Field>
        </div>
        <Field label="Joining Date">
          <input className="field-input" type="date" value={form.joining_date} onChange={(e) => set("joining_date", e.target.value)} />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : "Save Changes"}</Button>
      </form>
    </Sheet>
  );
}
