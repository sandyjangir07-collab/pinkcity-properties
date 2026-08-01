import { useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";

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
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="page-eyebrow">Welcome to PinkCity</div>
      <h1 className="page-title">Create Your Profile</h1>
      <p className="page-sub">
        Fill in your details below. An admin will review and approve your profile before you can access the team
        directory.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="field">
          <label className="fl">Full Name *</label>
          <input className="fi" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        </div>

        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Mobile</label>
            <input className="fi" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Alternate Mobile</label>
            <input
              className="fi"
              value={form.alternate_mobile}
              onChange={(e) => set("alternate_mobile", e.target.value)}
            />
          </div>
        </div>

        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Date of Birth</label>
            <input
              className="fi"
              type="date"
              style={{ minWidth: 0 }}
              value={form.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
          </div>
          <div className="field" style={{ minWidth: 0 }}>
            <label className="fl">Gender</label>
            <select className="fsel" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select…</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Blood Group</label>
            <select className="fsel" value={form.blood_group} onChange={(e) => set("blood_group", e.target.value)}>
              <option value="">Select…</option>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="fl">Designation</label>
            <input className="fi" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="fl">Department</label>
          <input className="fi" value={form.department} onChange={(e) => set("department", e.target.value)} />
        </div>

        <div className="divider" />

        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Emergency Contact Name *</label>
            <input
              className="fi"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="fl">Emergency Contact Number *</label>
            <input
              className="fi"
              value={form.emergency_contact_number}
              onChange={(e) => set("emergency_contact_number", e.target.value)}
              required
            />
          </div>
        </div>

        {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? "Submitting…" : "Submit for Approval"}
        </button>
      </form>
    </div>
  );
}
