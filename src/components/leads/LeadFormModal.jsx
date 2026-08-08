import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_TEXT, SOURCE_LABELS } from "../../lib/leadConstants";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";
import { Contact } from "lucide-react";

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
  const contactPickerSupported = typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

  async function pickFromContacts() {
    try {
      const [contact] = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (!contact) return;
      if (contact.name?.[0]) set("name", contact.name[0]);
      if (contact.tel?.[0]) set("phone", contact.tel[0].replace(/[^\d+]/g, ""));
    } catch (e) {
      // User cancelled the picker, or permission denied — nothing to do.
    }
  }

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
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title={isEdit ? "Edit Lead" : "Add Lead"} />
      <form onSubmit={submit} className="space-y-4">
        {!isEdit && contactPickerSupported && (
          <button
            type="button"
            onClick={pickFromContacts}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 text-stone-600 text-sm font-semibold py-3 active:scale-[0.98] transition-transform"
          >
            <Contact className="w-4 h-4" />
            Pick from Contacts
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Phone *"><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email"><input className="field-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Budget"><input className="field-input" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preferred Location"><input className="field-input" value={form.preferred_location} onChange={(e) => set("preferred_location", e.target.value)} /></Field>
          <Field label="Follow-up Date"><input className="field-input" type="date" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <select className="field-input" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {Object.keys(SOURCE_LABELS).map((s) => (<option key={s} value={s}>{SOURCE_LABELS[s]}</option>))}
            </select>
          </Field>
          <Field label="Property Type">
            <select className="field-input" value={form.property_type} onChange={(e) => set("property_type", e.target.value)}>
              <option value="">Select…</option>
              {PROPERTY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </Field>
        </div>
        <Field label="Notes"><textarea className="field-input min-h-[80px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Field label="Status">
          <div className="flex flex-wrap gap-2">
            {Object.keys(STATUS_TEXT).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${status === s ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}
              >
                {STATUS_TEXT[s]}
              </button>
            ))}
          </div>
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : "Save Lead"}</Button>
      </form>
    </Sheet>
  );
}
