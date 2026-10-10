import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../../lib/constants";
import { Image, Camera, MapPin } from "lucide-react";

// Shown when a lead moves to "Closed". Lets the team member pick which real
// plot the deal was for (Township -> Plot No, with Plot Area auto-filled),
// then submits it through the exact same submit_token_request pipeline the
// Plots & Tokens page uses — so it needs the same admin review + sale amount
// before it counts toward anyone's monthly earnings, same as today.
export default function CloseDealPanel({ lead, onClosed, onSkip, onCancel }) {
  const { profile, user } = useAuth();
  const [townships, setTownships] = useState([]);
  const [townshipId, setTownshipId] = useState("");
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    sb.from("listings")
      .select("id,title,area")
      .eq("status", "active")
      .eq("type", "colony")
      .order("title")
      .then(({ data }) => setTownships(data || []));
  }, []);

  useEffect(() => {
    setUnitId("");
    if (!townshipId) {
      setUnits([]);
      return;
    }
    sb.from("colony_units")
      .select("id,unit_number,unit_size,status")
      .eq("listing_id", townshipId)
      .eq("status", "available")
      .order("unit_number")
      .then(({ data }) => setUnits(data || []));
  }, [townshipId]);

  const selectedUnit = units.find((u) => u.id === unitId);
  const selectedTownship = townships.find((t) => t.id === townshipId);
  const ready = townshipId && unitId && photoFile;

  function pickPhoto(file) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!ready) return;
    setBusy(true);
    setErr("");
    try {
      const compressed = await compressImageFile(photoFile);
      const buffer = await fileToUploadableBuffer(compressed);
      const ext = compressed.name.split(".").pop();
      const path = `tokens/${unitId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(PROPERTY_IMAGES_BUCKET)
        .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);

      const submitterName = profile?.full_name || profile?.email || user.email;
      const { error: rpcErr } = await sb.rpc("submit_token_request", {
        p_unit_id: unitId,
        p_submitted_by_name: submitterName,
        p_buyer_name: lead.name,
        p_buyer_phone: lead.phone || null,
        p_token_amount: null,
        p_photo_url: pub.publicUrl,
        p_notes: `Closed from lead PC${lead.lead_number}`,
        p_associate_name: submitterName,
      });
      if (rpcErr) throw rpcErr;

      onClosed(selectedUnit, selectedTownship?.title || "");
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-[22px] border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-[16px] w-[16px] text-emerald-700" />
        <span className="text-[13px] font-semibold text-emerald-800">Which plot closed?</span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-emerald-800/70">
        This submits a token for admin review, same as Plots &amp; Tokens — so the deal counts toward monthly earnings.
      </p>

      <div className="mt-3 space-y-2.5">
        <select className="field-input" value={townshipId} onChange={(e) => setTownshipId(e.target.value)}>
          <option value="">Township…</option>
          {townships.map((t) => (
            <option key={t.id} value={t.id}>{t.title}{t.area ? ` — ${t.area}` : ""}</option>
          ))}
        </select>

        {townshipId && (
          <select className="field-input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Plot No…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_number}{u.unit_size ? ` — ${u.unit_size}` : ""}</option>
            ))}
          </select>
        )}

        {townshipId && units.length === 0 && (
          <p className="text-[11.5px] text-ink/40">No available plots left in this township — all are already token'd or sold.</p>
        )}

        {selectedUnit && (
          <div className="rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 text-[12.5px] text-ink/70">
            Plot area: <span className="font-semibold text-ink">{selectedUnit.unit_size || "—"}</span>
          </div>
        )}

        <div>
          <input id="close-deal-photo" type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files[0])} />
          <input id="close-deal-photo-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(e.target.files[0])} />
          <div
            onClick={() => document.getElementById("close-deal-photo").click()}
            className="relative rounded-2xl border border-dashed border-emerald-300 bg-white overflow-hidden flex flex-col items-center justify-center gap-1 py-6 cursor-pointer"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <span className="text-[13px] font-semibold text-ink">Add payment proof</span>
                <span className="text-[11px] text-ink/40">Token/booking amount screenshot</span>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" onClick={() => document.getElementById("close-deal-photo").click()} className="text-[12px] font-medium text-ink/70 border border-ink/10 rounded-full py-2 inline-flex items-center justify-center gap-1.5">
              <Image className="h-3.5 w-3.5" /> Gallery
            </button>
            <button type="button" onClick={() => document.getElementById("close-deal-photo-camera").click()} className="text-[12px] font-medium text-ink/70 border border-ink/10 rounded-full py-2 inline-flex items-center justify-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Camera
            </button>
          </div>
        </div>
      </div>

      {err && <p className="mt-2.5 text-[12px] text-red-600">{err}</p>}

      <div className="mt-3.5 flex gap-2">
        <button
          onClick={submit}
          disabled={!ready || busy}
          className="flex-1 rounded-full bg-emerald-600 py-2.5 text-[12.5px] font-semibold text-white active:scale-95 transition-transform disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
        <button onClick={onCancel} className="rounded-full border border-ink/10 px-4 py-2.5 text-[12.5px] font-medium text-ink/60 active:scale-95 transition-transform">
          Cancel
        </button>
      </div>
      <button onClick={onSkip} className="mt-2.5 w-full text-center text-[11.5px] font-medium text-ink/40 underline-offset-2 hover:underline">
        Skip — just mark closed, no plot
      </button>
    </div>
  );
}
