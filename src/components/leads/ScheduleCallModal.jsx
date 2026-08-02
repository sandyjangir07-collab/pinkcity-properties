import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

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
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title={target?.editId ? "Reschedule Call" : "Schedule Call"} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Client Name *"><input className="field-input" value={form.client} onChange={(e) => set("client", e.target.value)} /></Field>
        <Field label="Phone"><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Date & Time *"><input className="field-input" type="datetime-local" value={form.datetime} onChange={(e) => set("datetime", e.target.value)} /></Field>
        <Field label="Notes"><textarea className="field-input min-h-[60px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : target?.editId ? "Save New Date & Time" : "Schedule Call"}</Button>
      </form>
    </Sheet>
  );
}
