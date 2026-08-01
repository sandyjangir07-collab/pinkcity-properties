import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Modal, ModalHero } from "../ui/Modal";

function toLocalInputValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// target: { leadId, name, phone, editId?, existing? } | null
export default function ScheduleCallModal({ target, onClose, onSaved }) {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState({ client: "", phone: "", datetime: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!target) return;
    setErr("");
    const c = target.existing;
    const now = new Date();
    const defaultDt = c?.call_datetime ? new Date(c.call_datetime) : new Date(now.getTime() + 60 * 60000);
    setForm({
      client: c?.client_name || target.name || "",
      phone: c?.client_phone || target.phone || "",
      datetime: toLocalInputValue(defaultDt),
      notes: c?.notes || "",
    });
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.client.trim() || !form.datetime) {
      setErr("Client name and date & time are required.");
      return;
    }
    setBusy(true);
    setErr("");
    const submitterName = profile?.full_name || profile?.email || user.email;
    const payload = {
      client_name: form.client.trim(),
      client_phone: form.phone.trim() || null,
      call_datetime: new Date(form.datetime).toISOString(),
      notes: form.notes.trim() || null,
      lead_id: target.leadId || null,
      status: "scheduled",
      reminder_sent: false,
      updated_at: new Date().toISOString(),
    };
    try {
      if (target.editId) {
        const { error } = await sb.from("scheduled_calls").update(payload).eq("id", target.editId);
        if (error) throw error;
        showToast("✓ Call rescheduled!");
      } else {
        payload.created_by = user.id;
        payload.created_by_name = submitterName;
        payload.assigned_to = user.id;
        payload.assigned_name = submitterName;
        payload.created_at = new Date().toISOString();
        const { error } = await sb.from("scheduled_calls").insert(payload);
        if (error) throw error;
        showToast("✓ Call scheduled!");
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
      <ModalHero title={target?.editId ? "Reschedule Call" : "Schedule Call"} />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field">
            <label className="fl">Client Name *</label>
            <input className="fi" value={form.client} onChange={(e) => set("client", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Phone</label>
            <input className="fi" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Date &amp; Time *</label>
            <input className="fi" type="datetime-local" value={form.datetime} onChange={(e) => set("datetime", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Notes</label>
            <textarea className="fi" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Saving…" : target?.editId ? "Save New Date & Time" : "Schedule Call"}
          </button>
        </form>
      </div>
    </Modal>
  );
}
