import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { formatDate } from "../../lib/utils";
import { IconCalendar, IconDroplet, IconPhone, IconMail, IconMapPin } from "../ui/Icons";
import { Modal, ModalHero } from "../ui/Modal";
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
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Personal Information
        </h2>
        {canEdit && (
          <button className="btn btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setEditOpen(true)}>
            Edit
          </button>
        )}
      </div>

      <Row icon={<IconCalendar size={16} />} label="Date of Birth" value={employee.dob ? formatDate(employee.dob) : "—"} />
      <Row icon={<IconDroplet size={16} />} label="Blood Group" value={employee.blood_group || "—"} />
      <Row icon={<IconPhone size={16} />} label="Mobile" value={employee.mobile || "—"} />
      {employee.alternate_mobile && <Row icon={<IconPhone size={16} />} label="Alternate Mobile" value={employee.alternate_mobile} />}
      <Row icon={<IconMail size={16} />} label="Email" value={employee.email || "—"} />
      <Row
        icon={<IconPhone size={16} />}
        label="Emergency Contact"
        value={employee.emergency_contact_name ? `${employee.emergency_contact_name} · ${employee.emergency_contact_number}` : "—"}
      />
      <Row icon={<IconMapPin size={16} />} label="Current Address" value={formatAddress(current)} />
      <Row icon={<IconMapPin size={16} />} label="Permanent Address" value={formatAddress(permanent)} />

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
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="info-row">
      <div className="info-row-icon">{icon}</div>
      <div>
        <div className="info-row-label">{label}</div>
        <div className="info-row-value">{value}</div>
      </div>
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
    <Modal open={open} onClose={onClose}>
      <ModalHero title="Edit Personal Information" />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field-grid-2">
            <div className="field" style={{ minWidth: 0 }}>
              <label className="fl">Date of Birth</label>
              <input className="fi" type="date" style={{ minWidth: 0 }} value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 0 }}>
              <label className="fl">Gender</label>
              <select className="fsel" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
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
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="fl">Mobile</label>
              <input className="fi" value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="fl">Alternate Mobile</label>
            <input className="fi" value={form.alternate_mobile} onChange={(e) => set("alternate_mobile", e.target.value)} />
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Emergency Contact Name *</label>
              <input className="fi" value={form.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Emergency Contact Number *</label>
              <input className="fi" value={form.emergency_contact_number} onChange={(e) => set("emergency_contact_number", e.target.value)} />
            </div>
          </div>

          <div className="divider" />
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Current Address</div>
          <AddressFields addr={curAddr} setAddr={setCurAddr} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 10px" }}>
            <input
              type="checkbox"
              id="same-as-current"
              checked={sameAsCurrent}
              onChange={(e) => setSameAsCurrent(e.target.checked)}
            />
            <label htmlFor="same-as-current" style={{ fontSize: 13 }}>Permanent address same as current</label>
          </div>
          {!sameAsCurrent && (
            <>
              <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Permanent Address</div>
              <AddressFields addr={permAddr} setAddr={setPermAddr} />
            </>
          )}

          {err && <div className="form-err show" style={{ margin: "10px 0" }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit" style={{ marginTop: 16 }}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </Modal>
  );
}

function AddressFields({ addr, setAddr }) {
  function set(k, v) {
    setAddr((a) => ({ ...a, [k]: v }));
  }
  return (
    <>
      <div className="field-grid-2">
        <div className="field">
          <label className="fl">House No.</label>
          <input className="fi" value={addr.house_no || ""} onChange={(e) => set("house_no", e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">Street</label>
          <input className="fi" value={addr.street || ""} onChange={(e) => set("street", e.target.value)} />
        </div>
      </div>
      <div className="field-grid-2">
        <div className="field">
          <label className="fl">Area</label>
          <input className="fi" value={addr.area || ""} onChange={(e) => set("area", e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">City</label>
          <input className="fi" value={addr.city || ""} onChange={(e) => set("city", e.target.value)} />
        </div>
      </div>
      <div className="field-grid-2">
        <div className="field">
          <label className="fl">State</label>
          <input className="fi" value={addr.state || ""} onChange={(e) => set("state", e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">Pincode</label>
          <input className="fi" value={addr.pincode || ""} onChange={(e) => set("pincode", e.target.value)} />
        </div>
      </div>
    </>
  );
}
