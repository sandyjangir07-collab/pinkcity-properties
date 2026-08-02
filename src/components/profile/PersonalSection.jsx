import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { Card, SectionTitle } from "../ui/primitives";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/useToast";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function PersonalSection({ employee, canEdit, onUpdated }) {
  const [addresses, setAddresses] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const showToast = useToast();

  async function load() {
    const { data } = await sb.from("employee_addresses").select("*").eq("employee_id", employee.id);
    setAddresses(data || []);
  }

  useEffect(() => {
    load();
  }, [employee.id]);

  const current = addresses.find((a) => a.address_type === "current");
  const permanent = addresses.find((a) => a.address_type === "permanent");

  return (
    <Card>
      <SectionTitle
        action={
          canEdit && <button onClick={() => setEditOpen(true)} className="text-xs font-medium text-stone-600 hover:text-stone-700">Edit</button>
        }
      >
        Personal Information
      </SectionTitle>
      <div className="space-y-4">
        <Row label="Date of Birth" value={employee.dob ? formatDate(employee.dob) : "—"} />
        <Row label="Blood Group" value={employee.blood_group || "—"} />
        <Row label="Mobile" value={employee.mobile || "—"} />
        {employee.alternate_mobile && <Row label="Alternate Mobile" value={employee.alternate_mobile} />}
        <Row label="Email" value={employee.email || "—"} />
        <Row label="Emergency Contact" value={employee.emergency_contact_name ? `${employee.emergency_contact_name} · ${employee.emergency_contact_number}` : "—"} />
        <Row label="Current Address" value={formatAddress(current)} />
        <Row label="Permanent Address" value={formatAddress(permanent)} />
      </div>

      <EditPersonalModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        employee={employee}
        addresses={addresses}
        onSaved={() => {
          setEditOpen(false);
          showToast("Details updated.");
          load();
          onUpdated && onUpdated();
        }}
      />
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs text-ink/40 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function formatAddress(a) {
  if (!a) return "Not added";
  return [a.house_no, a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(", ") || "Not added";
}

function EditPersonalModal({ open, onClose, employee, addresses, onSaved }) {
  const [form, setForm] = useState(() => ({
    dob: employee.dob || "",
    gender: employee.gender || "",
    blood_group: employee.blood_group || "",
    mobile: employee.mobile || "",
    alternate_mobile: employee.alternate_mobile || "",
    emergency_contact_name: employee.emergency_contact_name || "",
    emergency_contact_number: employee.emergency_contact_number || "",
  }));
  const currentA = addresses.find((a) => a.address_type === "current") || {};
  const permanentA = addresses.find((a) => a.address_type === "permanent") || {};
  const [curAddr, setCurAddr] = useState(currentA);
  const [sameAsCurrent, setSameAsCurrent] = useState(permanentA.same_as_current || false);
  const [permAddr, setPermAddr] = useState(permanentA);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error: empErr } = await sb
      .from("employees")
      .update({
        dob: form.dob || null,
        gender: form.gender || null,
        blood_group: form.blood_group || null,
        mobile: form.mobile.trim() || null,
        alternate_mobile: form.alternate_mobile.trim() || null,
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_number: form.emergency_contact_number.trim() || null,
      })
      .eq("id", employee.id);
    if (empErr) {
      setBusy(false);
      setErr(empErr.message);
      return;
    }

    const finalPerm = sameAsCurrent ? { ...curAddr, same_as_current: true } : { ...permAddr, same_as_current: false };
    for (const [type, addr] of [
      ["current", curAddr],
      ["permanent", finalPerm],
    ]) {
      await sb.from("employee_addresses").upsert(
        {
          employee_id: employee.id,
          address_type: type,
          house_no: addr.house_no || null,
          street: addr.street || null,
          area: addr.area || null,
          city: addr.city || null,
          state: addr.state || null,
          pincode: addr.pincode || null,
          same_as_current: type === "permanent" ? !!sameAsCurrent : false,
        },
        { onConflict: "employee_id,address_type" }
      );
    }
    setBusy(false);
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Edit Personal Information" />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth"><input className="field-input" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
          <Field label="Gender">
            <select className="field-input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select…</option>
              {GENDERS.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Blood Group">
            <select className="field-input" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)}>
              <option value="">Select…</option>
              {BLOOD_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
          </Field>
          <Field label="Mobile"><input className="field-input" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /></Field>
        </div>
        <Field label="Alternate Mobile"><input className="field-input" value={form.alternate_mobile} onChange={(e) => set("alternate_mobile", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Emergency Contact Name *"><input className="field-input" value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} /></Field>
          <Field label="Emergency Contact Number *"><input className="field-input" value={form.emergency_contact_number} onChange={(e) => set("emergency_contact_number", e.target.value)} /></Field>
        </div>

        <div className="h-px bg-ink/[0.06] my-2" />
        <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35">Current Address</div>
        <AddressFields addr={curAddr} setAddr={setCurAddr} />

        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={sameAsCurrent} onChange={(e) => setSameAsCurrent(e.target.checked)} />
          Permanent address same as current
        </label>
        {!sameAsCurrent && (
          <>
            <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35">Permanent Address</div>
            <AddressFields addr={permAddr} setAddr={setPermAddr} />
          </>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : "Save Changes"}</Button>
      </form>
    </Sheet>
  );
}

function AddressFields({ addr, setAddr }) {
  function set(k, v) {
    setAddr((a) => ({ ...a, [k]: v }));
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="House No."><input className="field-input" value={addr.house_no || ""} onChange={(e) => set("house_no", e.target.value)} /></Field>
        <Field label="Street"><input className="field-input" value={addr.street || ""} onChange={(e) => set("street", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Area"><input className="field-input" value={addr.area || ""} onChange={(e) => set("area", e.target.value)} /></Field>
        <Field label="City"><input className="field-input" value={addr.city || ""} onChange={(e) => set("city", e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="State"><input className="field-input" value={addr.state || ""} onChange={(e) => set("state", e.target.value)} /></Field>
        <Field label="Pincode"><input className="field-input" value={addr.pincode || ""} onChange={(e) => set("pincode", e.target.value)} /></Field>
      </div>
    </div>
  );
}
