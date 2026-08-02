import { useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { Card } from "../components/ui/primitives";
import { Button } from "../components/ui/button";

const GENDERS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function CreateProfile() {
  const { user, refreshEmployee } = useAuth();
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
    mobile: "",
    alternate_mobile: "",
    dob: "",
    gender: "",
    blood_group: "",
    designation: "",
    department: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
  });

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!form.full_name.trim() || !form.emergency_contact_name.trim() || !form.emergency_contact_number.trim()) {
      setErr("Full name and an emergency contact (name + number) are required.");
      return;
    }
    setBusy(true);
    const { error } = await sb.from("employees").insert({
      user_id: user.id,
      email: user.email,
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim() || null,
      alternate_mobile: form.alternate_mobile.trim() || null,
      dob: form.dob || null,
      gender: form.gender || null,
      blood_group: form.blood_group || null,
      designation: form.designation.trim() || null,
      department: form.department.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_number: form.emergency_contact_number.trim(),
      profile_status: "pending_review",
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    showToast("Profile submitted — waiting for admin approval.");
    await refreshEmployee();
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Welcome to PinkCity</div>
      <h1 className="font-display text-3xl text-ink mb-2">Create Your Profile</h1>
      <p className="text-ink/50 text-sm mb-8">Fill in your details below. An admin will review and approve your profile before you can access the team directory.</p>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Full Name *</span>
            <input className="field-input" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Mobile</span>
              <input className="field-input" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Alternate Mobile</span>
              <input className="field-input" value={form.alternate_mobile} onChange={(e) => set("alternate_mobile", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Date of Birth</span>
              <input className="field-input" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Gender</span>
              <select className="field-input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Blood Group</span>
              <select className="field-input" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)}>
                <option value="">Select…</option>
                {BLOOD_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Designation</span>
              <input className="field-input" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
            </div>
          </div>
          <div>
            <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Department</span>
            <input className="field-input" value={form.department} onChange={(e) => set("department", e.target.value)} />
          </div>

          <div className="h-px bg-ink/[0.06]" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Emergency Contact Name *</span>
              <input className="field-input" value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} required />
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Emergency Contact Number *</span>
              <input className="field-input" value={form.emergency_contact_number} onChange={(e) => set("emergency_contact_number", e.target.value)} required />
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Submitting…" : "Submit for Approval"}</Button>
        </form>
      </Card>
    </div>
  );
}
