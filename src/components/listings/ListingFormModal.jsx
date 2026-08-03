import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { APPROVAL_TYPES, ROAD_WIDTHS, FACINGS, PLOT_SIZE_UNITS, COLONY_ROAD_WIDTHS, APPROACH_ROADS } from "../../lib/listingConstants";
import { FileText } from "lucide-react";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

const emptyForm = {
  title: "",
  type: "colony",
  area: "",
  price: "",
  desc: "",
  phone: "",
  approval_type: "",
  lat: "",
  lng: "",
  highlights: "",
  landmarks: "",
  plot_size: "",
  plot_size_unit: "Gaj",
  plot_length: "",
  plot_width: "",
  road_width: "",
  facing: "",
  agreement_value: "",
  corner_plot: false,
  park_facing: false,
  no_of_units: "",
  total_project_area: "",
  colony_road_type: [],
  approach_road: "",
  amenities: "",
  project_map_url: "",
  rera_approved: false,
  verified: false,
};

// target: "new" | listingId | null
export default function ListingFormModal({ target, isAdmin, onClose, onSaved }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [savedUrls, setSavedUrls] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingMapPdf, setPendingMapPdf] = useState(null);
  const [savedMapPdfUrl, setSavedMapPdfUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = target && target !== "new";

  useEffect(() => {
    if (!target) return;
    setErr("");
    setPendingFiles([]);
    setPendingMapPdf(null);
    if (target === "new") {
      setForm(emptyForm);
      setSavedUrls([]);
      setSavedMapPdfUrl(null);
      return;
    }
    sb.from("listings").select("*").eq("id", target).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm({
        title: data.title || "",
        type: data.type || "plot",
        area: data.area || "",
        price: data.price || "",
        desc: data.desc || "",
        phone: data.submitter_phone || "",
        approval_type: data.approval_type || "",
        lat: data.latitude ?? "",
        lng: data.longitude ?? "",
        highlights: data.highlights || "",
        landmarks: data.nearby_landmarks || "",
        plot_size: data.plot_size || "",
        plot_size_unit: data.plot_size_unit || "Gaj",
        plot_length: data.plot_length || "",
        plot_width: data.plot_width || "",
        road_width: data.road_width || "",
        facing: data.facing || "",
        agreement_value: data.agreement_value || "",
        corner_plot: !!data.corner_plot,
        park_facing: !!data.park_facing,
        no_of_units: data.no_of_units || "",
        total_project_area: data.total_project_area || "",
        colony_road_type: (data.colony_road_type || "").split(",").map((s) => s.trim()).filter(Boolean),
        approach_road: data.approach_road || "",
        amenities: data.amenities || "",
        project_map_url: data.project_map_url || "",
        rera_approved: !!data.rera_approved,
        verified: !!data.verified,
      });
      setSavedUrls(data.images && data.images.length ? [...data.images] : data.image_url ? [data.image_url] : []);
      setSavedMapPdfUrl(data.location_map_url || null);
    });
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function toggleColonyRoad(width) {
    setForm((f) => ({
      ...f,
      colony_road_type: f.colony_road_type.includes(width)
        ? f.colony_road_type.filter((w) => w !== width)
        : [...f.colony_road_type, width],
    }));
  }

  function pickImages(files) {
    const total = savedUrls.length + pendingFiles.length + files.length;
    if (total > 8) {
      showToast("Up to 8 photos only.");
      return;
    }
    setPendingFiles((f) => [...f, ...Array.from(files)]);
  }

  async function uploadAllImages() {
    const uploaded = [...savedUrls];
    const failed = [];
    for (const rawFile of pendingFiles) {
      const compressed = await compressImageFile(rawFile);
      const ext = compressed.name.split(".").pop();
      const path = `listings/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      try {
        const buffer = await fileToUploadableBuffer(compressed);
        const { error } = await sb.storage.from("property-images").upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
        if (error) throw error;
        const { data } = sb.storage.from("property-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } catch (e) {
        failed.push(`${compressed.name}: ${e.message || "unknown error"}`);
      }
    }
    if (failed.length) throw new Error(`Failed to upload ${failed.length} photo(s) — ${failed.join("; ")}`);
    return uploaded;
  }

  async function uploadMapPdf() {
    if (!pendingMapPdf) return savedMapPdfUrl;
    const path = `listings/${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const buffer = await pendingMapPdf.arrayBuffer();
    if (!buffer.byteLength) throw new Error("That PDF appears to be empty (0 bytes) — try selecting it again.");
    const { error } = await sb.storage.from("property-documents").upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
    if (error) throw new Error(`Failed to upload site map PDF: ${error.message || "unknown error"}`);
    const { data } = sb.storage.from("property-documents").getPublicUrl(path);
    return data.publicUrl;
  }

  const isColony = form.type === "colony";

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.area.trim() || !form.price.trim()) {
      setErr("Please fill in Title, Area and Price.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const imageUrls = await uploadAllImages();
      const mapPdfUrl = await uploadMapPdf();
      const size = !isColony && form.plot_size ? `${form.plot_size} ${form.plot_size_unit}` : "";
      const payload = {
        title: form.title.trim(),
        type: form.type,
        area: form.area.trim(),
        price: form.price.trim(),
        size,
        desc: form.desc.trim(),
        verified: form.verified,
        road_width: isColony ? "" : form.road_width,
        facing: isColony ? "" : form.facing,
        agreement_value: isColony ? "" : form.agreement_value.trim(),
        approval_type: form.approval_type,
        rera_approved: form.rera_approved,
        plot_size: isColony ? "" : form.plot_size,
        plot_size_unit: form.plot_size_unit,
        plot_length: isColony ? "" : form.plot_length,
        plot_width: isColony ? "" : form.plot_width,
        no_of_units: form.no_of_units ? Number(form.no_of_units) : null,
        total_project_area: form.total_project_area || null,
        amenities: form.amenities || null,
        project_map_url: form.project_map_url || null,
        colony_road_type: form.colony_road_type.join(", ") || null,
        approach_road: form.approach_road || null,
        location_map_url: mapPdfUrl || null,
        latitude: form.lat ? Number(form.lat) : null,
        longitude: form.lng ? Number(form.lng) : null,
        highlights: form.highlights || null,
        nearby_landmarks: form.landmarks || null,
        corner_plot: isColony ? false : form.corner_plot,
        park_facing: isColony ? false : form.park_facing,
        image_url: imageUrls[0] || "",
        images: imageUrls,
        submitter_phone: form.phone.trim(),
        updated_at: new Date().toISOString(),
      };
      if (isEdit) {
        const { error } = await sb.from("listings").update(payload).eq("id", target);
        if (error) throw error;
        showToast("✓ Listing updated!");
      } else {
        payload.status = "pending";
        payload.uid = user.id;
        payload.submitter_name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
        payload.submitter_email = user.email;
        payload.created_at = new Date().toISOString();
        const { error } = await sb.from("listings").insert(payload);
        if (error) throw error;
        showToast("✓ Submitted! Awaiting admin approval.");
      }
      onSaved();
    } catch (e2) {
      setErr(e2.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-lg">
      <SheetHeader title={isEdit ? "Edit & Verify" : "Add New Listing"} />
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title *"><input className="field-input" placeholder="e.g. 200 sq yd Corner Plot" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Category *">
            <select className="field-input" value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="colony">Colony</option>
              <option value="plot">Plot</option>
              <option value="apartment">Flat</option>
              <option value="villa">Villa</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area / Locality *"><input className="field-input" placeholder="e.g. Mansarovar, Jaipur" value={form.area} onChange={(e) => set("area", e.target.value)} /></Field>
          <Field label="Price *"><input className="field-input" placeholder="e.g. ₹68 Lakh" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
        </div>
        <Field label="Approval">
          <select className="field-input" value={form.approval_type} onChange={(e) => set("approval_type", e.target.value)}>
            <option value="">Select</option>
            {APPROVAL_TYPES.map((a) => (<option key={a} value={a}>{a}</option>))}
          </select>
        </Field>

        <Field label="Site Map (PDF)">
          <input type="file" accept="application/pdf" className="hidden" id="listing-map-pdf" onChange={(e) => setPendingMapPdf(e.target.files[0] || null)} />
          {pendingMapPdf || savedMapPdfUrl ? (
            <div className="flex items-center gap-2.5 bg-stone-50/60 rounded-xl px-3.5 py-2.5">
              <span className="flex-1 text-sm truncate">{pendingMapPdf ? pendingMapPdf.name : "Site map on file"}</span>
              <button type="button" onClick={() => { setPendingMapPdf(null); setSavedMapPdfUrl(null); }} className="text-ink/40">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => document.getElementById("listing-map-pdf").click()} className="w-full text-sm font-medium text-ink/60 border border-dashed border-ink/15 rounded-xl py-2.5">
              <FileText className="w-3.5 h-3.5 inline mr-1.5" />Choose PDF…
            </button>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"><input className="field-input" type="number" step="any" placeholder="e.g. 26.8112" value={form.lat} onChange={(e) => set("lat", e.target.value)} /></Field>
          <Field label="Longitude"><input className="field-input" type="number" step="any" placeholder="e.g. 75.7832" value={form.lng} onChange={(e) => set("lng", e.target.value)} /></Field>
        </div>
        <Field label="Highlights"><input className="field-input" placeholder="e.g. Ring Road Nearby, 100 Ft Road, Gated Colony" value={form.highlights} onChange={(e) => set("highlights", e.target.value)} /></Field>
        <Field label="Nearby Landmarks">
          <input className="field-input" placeholder="e.g. Ring Road - 4 min, Airport - 25 min" value={form.landmarks} onChange={(e) => set("landmarks", e.target.value)} />
          <p className="text-xs text-ink/40 mt-1.5">Format: Name - time or distance, separated by commas.</p>
        </Field>

        {!isColony && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plot Size">
                <div className="flex gap-1.5">
                  <input className="field-input" type="number" placeholder="e.g. 200" value={form.plot_size} onChange={(e) => set("plot_size", e.target.value)} />
                  <select className="field-input w-24 shrink-0" value={form.plot_size_unit} onChange={(e) => set("plot_size_unit", e.target.value)}>
                    {PLOT_SIZE_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </div>
              </Field>
              <Field label="Plot Dimensions">
                <div className="flex items-center gap-1.5">
                  <input className="field-input" type="number" placeholder="Length" value={form.plot_length} onChange={(e) => set("plot_length", e.target.value)} />
                  <span className="text-ink/40 font-semibold">×</span>
                  <input className="field-input" type="number" placeholder="Width" value={form.plot_width} onChange={(e) => set("plot_width", e.target.value)} />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Road Width">
                <select className="field-input" value={form.road_width} onChange={(e) => set("road_width", e.target.value)}>
                  <option value="">Select</option>
                  {ROAD_WIDTHS.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </Field>
              <Field label="Facing">
                <select className="field-input" value={form.facing} onChange={(e) => set("facing", e.target.value)}>
                  <option value="">Select</option>
                  {FACINGS.map((f) => (<option key={f} value={f}>{f}</option>))}
                </select>
              </Field>
            </div>
            <Field label="Agreement Value"><input className="field-input" placeholder="e.g. ₹55 Lakh" value={form.agreement_value} onChange={(e) => set("agreement_value", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.corner_plot} onChange={(e) => set("corner_plot", e.target.checked)} /> Corner Plot</label>
              <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.park_facing} onChange={(e) => set("park_facing", e.target.checked)} /> Park Facing</label>
            </div>
          </>
        )}

        {isColony && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="No. of Units"><input className="field-input" type="number" placeholder="e.g. 120" value={form.no_of_units} onChange={(e) => set("no_of_units", e.target.value)} /></Field>
              <Field label="Total Project Area"><input className="field-input" placeholder="e.g. 25 Acres" value={form.total_project_area} onChange={(e) => set("total_project_area", e.target.value)} /></Field>
            </div>
            <Field label="Internal Roads (select all that apply)">
              <div className="flex flex-wrap gap-2">
                {COLONY_ROAD_WIDTHS.map((w) => (
                  <label key={w} className={`text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer ${form.colony_road_type.includes(w) ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}>
                    <input type="checkbox" className="hidden" checked={form.colony_road_type.includes(w)} onChange={() => toggleColonyRoad(w)} /> {w}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Approach Road">
              <select className="field-input" value={form.approach_road} onChange={(e) => set("approach_road", e.target.value)}>
                <option value="">Select</option>
                {APPROACH_ROADS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </Field>
            <Field label="Amenities"><input className="field-input" placeholder="e.g. Clubhouse, Park, 24x7 Security" value={form.amenities} onChange={(e) => set("amenities", e.target.value)} /></Field>
            <Field label="Project Map (image URL)"><input className="field-input" placeholder="Paste a link to the layout/map image" value={form.project_map_url} onChange={(e) => set("project_map_url", e.target.value)} /></Field>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.rera_approved} onChange={(e) => set("rera_approved", e.target.checked)} /> RERA Approved</label>

        <Field label="Description"><textarea className="field-input min-h-[80px]" placeholder="Key highlights — road access, floor, facing, landmarks…" value={form.desc} onChange={(e) => set("desc", e.target.value)} /></Field>

        <Field label="Your Contact Number">
          <input className="field-input" type="tel" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <p className="text-xs text-ink/40 mt-1.5">Visible to admin only — never shown on the website</p>
        </Field>

        <Field label="Property Photos (up to 8)">
          <input type="file" accept="image/*" multiple className="hidden" id="listing-images" onChange={(e) => pickImages(e.target.files)} />
          <div className="flex flex-wrap gap-2.5">
            {savedUrls.map((url, i) => (
              <ImgThumb key={"s" + i} src={url} onRemove={() => setSavedUrls((u) => u.filter((_, idx) => idx !== i))} />
            ))}
            {pendingFiles.map((file, i) => (
              <ImgThumb key={"p" + i} src={URL.createObjectURL(file)} onRemove={() => setPendingFiles((f) => f.filter((_, idx) => idx !== i))} />
            ))}
            {savedUrls.length + pendingFiles.length < 8 && (
              <div onClick={() => document.getElementById("listing-images").click()} className="w-[72px] h-[72px] rounded-xl border border-dashed border-ink/15 flex items-center justify-center cursor-pointer text-ink/35">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </div>
            )}
          </div>
        </Field>

        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Mark as PinkCity Verified™</label>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">{busy ? "Saving…" : isEdit ? "Save changes" : "Submit for approval"}</Button>
      </form>
    </Sheet>
  );
}

function ImgThumb({ src, onRemove }) {
  return (
    <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden">
      <img src={src} alt="" className="w-full h-full object-cover" />
      <button type="button" onClick={onRemove} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none">×</button>
    </div>
  );
}
