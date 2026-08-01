import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Modal, ModalHero } from "../ui/Modal";

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function today() {
  return new Date().toISOString().split("T")[0];
}

// target: { leadId, name, phone, editId?, existing? } | null
export default function ScheduleVisitModal({ target, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState({ client: "", phone: "", listing: "", date: tomorrow(), time: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!target) return;
    setErr("");
    const e = target.existing;
    setForm({
      client: e?.client_name || target.name || "",
      phone: e?.client_phone || target.phone || "",
      listing: e?.listing_title || "",
      date: e?.visit_date || tomorrow(),
      time: e?.visit_time || "",
      notes: e?.notes || "",
    });
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.client.trim() || !form.date) {
      setErr("Client name and date are required.");
      return;
    }
    setBusy(true);
    setErr("");
    const submitterName = profile?.full_name || profile?.email || user.email;
    const payload = {
      client_name: form.client.trim(),
      client_phone: form.phone.trim() || null,
      listing_title: form.listing.trim() || null,
      visit_date: form.date,
      visit_time: form.time,
      notes: form.notes.trim() || null,
      lead_id: target.leadId || null,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    };
    try {
      if (target.editId) {
        const { error } = await sb.from("scheduled_visits").update(payload).eq("id", target.editId);
        if (error) throw error;
        showToast("✓ Visit rescheduled!");
      } else {
        payload.created_by = user.id;
        payload.created_by_name = submitterName;
        payload.assigned_to = user.id;
        payload.assigned_name = submitterName;
        payload.created_at = new Date().toISOString();
        const { error } = await sb.from("scheduled_visits").insert(payload);
        if (error) throw error;
        showToast("✓ Visit scheduled!");
      }
      if (target.leadId) {
        await sb.from("leads").update({ status: "visit_scheduled", updated_at: new Date().toISOString() }).eq("id", target.leadId);
      }
      onSaved();
    } catch (e2) {
      setErr(e2.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!target} onClose={onClose}>
      <ModalHero title={target?.editId ? "Reschedule Site Visit" : "Schedule Site Visit"} />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field">
            <label className="fl">Client Name *</label>
            <input className="fi" value={form.client} onChange={(e) => set("client", e.target.value)} />
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Phone</label>
              <input className="fi" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Property</label>
              <input className="fi" value={form.listing} onChange={(e) => set("listing", e.target.value)} />
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field" style={{ minWidth: 0 }}>
              <label className="fl">Date *</label>
              <input className="fi" type="date" style={{ minWidth: 0 }} min={today()} value={form.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="field" style={{ minWidth: 0 }}>
              <label className="fl">Time</label>
              <input className="fi" type="time" style={{ minWidth: 0 }} value={form.time} onChange={(e) => set("time", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="fl">Notes</label>
            <textarea className="fi" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : target?.editId ? "Save New Date & Time" : "Schedule Visit"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
