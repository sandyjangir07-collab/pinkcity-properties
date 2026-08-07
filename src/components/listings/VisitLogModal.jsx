import { useEffect, useState } from "react";
import { Camera, Phone } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../../lib/constants";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function VisitLogModal({ target, onClose, onSaved }) {
  // target: { listingId, listingTitle } | null
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [visits, setVisits] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", date: todayStr(), time: "", notes: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function loadVisits() {
    if (!target?.listingId) return;
    const { data } = await sb
      .from("visits")
      .select("*")
      .eq("listing_id", target.listingId)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false });
    setVisits(data || []);
  }

  useEffect(() => {
    if (target) {
      setForm({ name: "", phone: "", date: todayStr(), time: "", notes: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      setErr("");
      loadVisits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickPhoto(file) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.date) {
      setErr("Visitor name and date are required.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      let photoUrl = null;
      if (photoFile) {
        const compressed = await compressImageFile(photoFile);
        const buffer = await fileToUploadableBuffer(compressed);
        const ext = compressed.name.split(".").pop();
        const path = `visits/${target.listingId}-${Date.now()}.${ext}`;
        const { error: upErr } = await sb.storage
          .from(PROPERTY_IMAGES_BUCKET)
          .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
        if (upErr) throw upErr;
        const { data: pub } = sb.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);
        photoUrl = pub.publicUrl;
      }

      const submitterName = profile?.full_name || profile?.email || user.email;
      const { error } = await sb.from("visits").insert({
        listing_id: target.listingId,
        listing_title: target.listingTitle,
        visitor_name: form.name.trim(),
        visitor_phone: form.phone.trim() || null,
        visit_date: form.date,
        visit_time: form.time || null,
        notes: form.notes.trim() || null,
        photo_url: photoUrl,
        logged_by: user.id,
        logged_by_name: submitterName,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast("✓ Visit logged!");
      setForm({ name: "", phone: "", date: todayStr(), time: "", notes: "" });
      setPhotoFile(null);
      setPhotoPreview(null);
      loadVisits();
      onSaved && onSaved();
    } catch (e2) {
      setErr(e2.message || "Could not save the visit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Log a Visit" sub={target?.listingTitle} />

      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visitor Name *"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Verma" /></Field>
          <Field label="Phone"><input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXX XXXXX" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Visit Date *"><input className="field-input" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Visit Time"><input className="field-input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} /></Field>
        </div>
        <Field label="Notes"><textarea className="field-input min-h-[70px]" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Interest level, questions asked, next steps…" /></Field>

        <Field label="Photo (optional)">
          <input type="file" accept="image/*" className="hidden" id="visit-photo-input" onChange={(e) => pickPhoto(e.target.files[0])} />
          {photoPreview ? (
            <div className="relative w-full h-32 rounded-2xl overflow-hidden">
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs">✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => document.getElementById("visit-photo-input").click()}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-ink/60 border border-dashed border-ink/15 rounded-xl py-3"
            >
              <Camera className="w-4 h-4" /> Add a photo
            </button>
          )}
        </Field>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : "Log Visit"}</Button>
      </form>

      {visits && visits.length > 0 && (
        <div className="mt-7">
          <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-3">Recent Visits ({visits.length})</div>
          <div className="space-y-2.5">
            {visits.slice(0, 8).map((v) => (
              <div key={v.id} className="flex items-start gap-3 rounded-2xl border border-ink/[0.06] p-3">
                {v.photo_url ? (
                  <img src={v.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
                ) : (
                  <span className="w-11 h-11 rounded-xl bg-stone-50 text-stone-600 flex items-center justify-center shrink-0 text-xs font-semibold">
                    {v.visitor_name.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink truncate">{v.visitor_name}</div>
                  <div className="text-xs text-ink/45 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {v.visitor_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{v.visitor_phone}</span>}
                    <span>{new Date(v.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{v.visit_time ? ` · ${v.visit_time}` : ""}</span>
                  </div>
                  {v.notes && <div className="text-xs text-ink/55 mt-1">{v.notes}</div>}
                  <div className="text-[10px] text-ink/35 mt-1">Logged by {v.logged_by_name || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}
