import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_TEXT, STATUS_DOT, SOURCE_LABELS } from "../../lib/leadConstants";
import { Modal, ModalHero } from "../ui/Modal";

const PROPERTY_TYPES = ["Plot", "House", "Apartment", "Commercial", "Farmhouse"];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  budget: "",
  preferred_location: "",
  follow_up_date: "",
  notes: "",
  source: "manual",
  property_type: "",
};

// target: "new" | leadId (string) | null
export default function LeadFormModal({ target, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("new");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = target && target !== "new";

  useEffect(() => {
    if (!target) return;
    setErr("");
    if (target === "new") {
      setForm(emptyForm);
      setStatus("new");
      return;
    }
    sb.from("leads").select("*").eq("id", target).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        budget: data.budget || "",
        preferred_location: data.preferred_location || "",
        follow_up_date: data.follow_up_date || "",
        notes: data.notes || "",
        source: data.source || "manual",
        property_type: data.property_type || "",
      });
      setStatus(data.status || "new");
    });
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setErr("Name and phone are required.");
      return;
    }
    setBusy(true);
    setErr("");
    const submitterName = profile?.full_name || profile?.email || user.email;
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      budget: form.budget.trim() || null,
      preferred_location: form.preferred_location.trim() || null,
      follow_up_date: form.follow_up_date || null,
      notes: form.notes.trim() || null,
      source: form.source,
      property_type: form.property_type || null,
      status,
      updated_at: new Date().toISOString(),
      created_by: user.id,
      created_by_name: submitterName,
    };
    try {
      if (isEdit) {
        const { error } = await sb.from("leads").update(payload).eq("id", target);
        if (error) throw error;
        showToast("✓ Lead updated!");
        onSaved({ isNew: false });
      } else {
        payload.created_at = new Date().toISOString();
        const { data, error } = await sb.from("leads").insert(payload).select().single();
        if (error) throw error;
        showToast("✓ Lead added!");
        onSaved({ isNew: true, lead: data });
      }
    } catch (e2) {
      setErr(e2.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!target} onClose={onClose}>
      <ModalHero title={isEdit ? "Edit Lead" : "Add Lead"} />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Name *</label>
              <input className="fi" value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Phone *</label>
              <input className="fi" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Email</label>
              <input className="fi" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Budget</label>
              <input className="fi" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Preferred Location</label>
              <input className="fi" value={form.preferred_location} onChange={(e) => set("preferred_location", e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 0 }}>
              <label className="fl">Follow-up Date</label>
              <input className="fi" type="date" style={{ minWidth: 0 }} value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Source</label>
              <select className="fsel" value={form.source} onChange={(e) => set("source", e.target.value)}>
                {Object.keys(SOURCE_LABELS).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="fl">Property Type</label>
              <select className="fsel" value={form.property_type} onChange={(e) => set("property_type", e.target.value)}>
                <option value="">Select…</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="fl">Notes</label>
            <textarea className="fi" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Status</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(STATUS_TEXT).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"status-pill" + (status === s ? " active" : "")}
                  onClick={() => setStatus(s)}
                >
                  <span className="status-dot" style={{ background: status === s ? "white" : STATUS_DOT[s] }} />
                  {STATUS_TEXT[s]}
                </button>
              ))}
            </div>
          </div>
          {err && <div className="form-err show" style={{ margin: "10px 0" }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit" style={{ marginTop: 10 }}>
            {busy ? "Saving…" : "Save Lead"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
