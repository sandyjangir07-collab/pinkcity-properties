import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

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
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title={target?.editId ? "Reschedule Site Visit" : "Schedule Site Visit"} />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Client Name *"><input className="field-input" value={form.client} onChange={(e) => set("client", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Property"><input className="field-input" value={form.listing} onChange={(e) => set("listing", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *"><input className="field-input" type="date" min={today()} value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Time"><input className="field-input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea className="field-input min-h-[60px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : target?.editId ? "Save New Date & Time" : "Schedule Visit"}</Button>
      </form>
    </Sheet>
  );
}
