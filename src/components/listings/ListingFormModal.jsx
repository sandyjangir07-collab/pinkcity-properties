import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { APPROVAL_TYPES, ROAD_WIDTHS, FACINGS, PLOT_SIZE_UNITS, COLONY_ROAD_WIDTHS, APPROACH_ROADS } from "../../lib/listingConstants";
import { Modal, ModalHero } from "../ui/Modal";
import { IconPlus } from "../ui/Icons";

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
    <Modal open={!!target} onClose={onClose}>
      <ModalHero title={isEdit ? "Edit & Verify" : "Add New Listing"} />
      <div className="modal-body">
        <form onSubmit={submit}>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Title *</label>
              <input className="fi" placeholder="e.g. 200 sq yd Corner Plot" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Category *</label>
              <select className="fsel" value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="colony">Colony</option>
                <option value="plot">Plot</option>
                <option value="apartment">Flat</option>
                <option value="villa">Villa</option>
              </select>
            </div>
          </div>
          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Area / Locality *</label>
              <input className="fi" placeholder="e.g. Mansarovar, Jaipur" value={form.area} onChange={(e) => set("area", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Price *</label>
              <input className="fi" placeholder="e.g. ₹68 Lakh" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="fl">Approval</label>
            <select className="fsel" value={form.approval_type} onChange={(e) => set("approval_type", e.target.value)}>
              <option value="">Select</option>
              {APPROVAL_TYPES.map((a) => (<option key={a} value={a}>{a}</option>))}
            </select>
          </div>

          <div className="field">
            <label className="fl">Site Map (PDF)</label>
            <input type="file" accept="application/pdf" style={{ display: "none" }} id="listing-map-pdf" onChange={(e) => setPendingMapPdf(e.target.files[0] || null)} />
            {pendingMapPdf || savedMapPdfUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--secondary)", borderRadius: 12, padding: "10px 14px", marginTop: 4 }}>
                <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pendingMapPdf ? pendingMapPdf.name : "Site map on file"}
                </span>
                <button type="button" onClick={() => { setPendingMapPdf(null); setSavedMapPdfUrl(null); }} style={{ border: "none", background: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary" style={{ width: "100%", marginTop: 4 }} onClick={() => document.getElementById("listing-map-pdf").click()}>📄 Choose PDF…</button>
            )}
          </div>

          <div className="field-grid-2">
            <div className="field">
              <label className="fl">Latitude</label>
              <input className="fi" type="number" step="any" placeholder="e.g. 26.8112" value={form.lat} onChange={(e) => set("lat", e.target.value)} />
            </div>
            <div className="field">
              <label className="fl">Longitude</label>
              <input className="fi" type="number" step="any" placeholder="e.g. 75.7832" value={form.lng} onChange={(e) => set("lng", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="fl">Highlights</label>
            <input className="fi" placeholder="e.g. Ring Road Nearby, 100 Ft Road, Gated Colony" value={form.highlights} onChange={(e) => set("highlights", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Nearby Landmarks</label>
            <input className="fi" placeholder="e.g. Ring Road - 4 min, Airport - 25 min" value={form.landmarks} onChange={(e) => set("landmarks", e.target.value)} />
            <p style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted-foreground)" }}>Format: Name - time or distance, separated by commas.</p>
          </div>

          {!isColony && (
            <>
              <div className="field-grid-2">
                <div className="field">
                  <label className="fl">Plot Size</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="fi" type="number" placeholder="e.g. 200" value={form.plot_size} onChange={(e) => set("plot_size", e.target.value)} />
                    <select className="fsel" style={{ flex: "0 0 auto", width: "auto", minWidth: 96 }} value={form.plot_size_unit} onChange={(e) => set("plot_size_unit", e.target.value)}>
                      {PLOT_SIZE_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label className="fl">Plot Dimensions</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input className="fi" type="number" placeholder="Length" value={form.plot_length} onChange={(e) => set("plot_length", e.target.value)} />
                    <span style={{ color: "var(--muted-foreground)", fontWeight: 600 }}>×</span>
                    <input className="fi" type="number" placeholder="Width" value={form.plot_width} onChange={(e) => set("plot_width", e.target.value)} />
                    <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Ft</span>
                  </div>
                </div>
              </div>
              <div className="field-grid-2">
                <div className="field">
                  <label className="fl">Road Width</label>
                  <select className="fsel" value={form.road_width} onChange={(e) => set("road_width", e.target.value)}>
                    <option value="">Select</option>
                    {ROAD_WIDTHS.map((r) => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label className="fl">Facing</label>
                  <select className="fsel" value={form.facing} onChange={(e) => set("facing", e.target.value)}>
                    <option value="">Select</option>
                    {FACINGS.map((f) => (<option key={f} value={f}>{f}</option>))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="fl">Agreement Value</label>
                <input className="fi" placeholder="e.g. ₹55 Lakh" value={form.agreement_value} onChange={(e) => set("agreement_value", e.target.value)} />
              </div>
              <div className="field-grid-2">
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.corner_plot} onChange={(e) => set("corner_plot", e.target.checked)} /> Corner Plot
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                  <input type="checkbox" checked={form.park_facing} onChange={(e) => set("park_facing", e.target.checked)} /> Park Facing
                </label>
              </div>
            </>
          )}

          {isColony && (
            <>
              <div className="field-grid-2">
                <div className="field">
                  <label className="fl">No. of Units</label>
                  <input className="fi" type="number" placeholder="e.g. 120" value={form.no_of_units} onChange={(e) => set("no_of_units", e.target.value)} />
                </div>
                <div className="field">
                  <label className="fl">Total Project Area</label>
                  <input className="fi" placeholder="e.g. 25 Acres" value={form.total_project_area} onChange={(e) => set("total_project_area", e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label className="fl">Internal Roads (select all that apply)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {COLONY_ROAD_WIDTHS.map((w) => (
                    <label key={w} className={"pill " + (form.colony_road_type.includes(w) ? "pill-primary" : "pill-neutral")} style={{ cursor: "pointer" }}>
                      <input type="checkbox" style={{ display: "none" }} checked={form.colony_road_type.includes(w)} onChange={() => toggleColonyRoad(w)} /> {w}
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label className="fl">Approach Road</label>
                <select className="fsel" value={form.approach_road} onChange={(e) => set("approach_road", e.target.value)}>
                  <option value="">Select</option>
                  {APPROACH_ROADS.map((r) => (<option key={r} value={r}>{r}</option>))}
                </select>
              </div>
              <div className="field">
                <label className="fl">Amenities</label>
                <input className="fi" placeholder="e.g. Clubhouse, Park, 24x7 Security" value={form.amenities} onChange={(e) => set("amenities", e.target.value)} />
              </div>
              <div className="field">
                <label className="fl">Project Map (image URL)</label>
                <input className="fi" placeholder="Paste a link to the layout/map image" value={form.project_map_url} onChange={(e) => set("project_map_url", e.target.value)} />
              </div>
            </>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "6px 0 14px" }}>
            <input type="checkbox" checked={form.rera_approved} onChange={(e) => set("rera_approved", e.target.checked)} /> RERA Approved
          </label>

          <div className="field">
            <label className="fl">Description</label>
            <textarea className="fi" rows={3} placeholder="Key highlights — road access, floor, facing, landmarks…" value={form.desc} onChange={(e) => set("desc", e.target.value)} />
          </div>

          <div className="field">
            <label className="fl">Your Contact Number</label>
            <input className="fi" type="tel" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <p style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted-foreground)" }}>Visible to admin only — never shown on the website</p>
          </div>

          <div className="field">
            <label className="fl">Property Photos (up to 8)</label>
            <input type="file" accept="image/*" multiple style={{ display: "none" }} id="listing-images" onChange={(e) => pickImages(e.target.files)} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {savedUrls.map((url, i) => (
                <ImgThumb key={"s" + i} src={url} onRemove={() => setSavedUrls((u) => u.filter((_, idx) => idx !== i))} />
              ))}
              {pendingFiles.map((file, i) => (
                <ImgThumb key={"p" + i} src={URL.createObjectURL(file)} onRemove={() => setPendingFiles((f) => f.filter((_, idx) => idx !== i))} />
              ))}
              {savedUrls.length + pendingFiles.length < 8 && (
                <div
                  onClick={() => document.getElementById("listing-images").click()}
                  style={{ width: 72, height: 72, borderRadius: 12, border: "1.5px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}
                >
                  <IconPlus size={18} />
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "14px 0" }}>
              <input type="checkbox" checked={form.verified} onChange={(e) => set("verified", e.target.checked)} /> Mark as PinkCity Verified™
            </label>
          )}

          {err && <div className="form-err show" style={{ margin: "10px 0" }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit" style={{ marginTop: 10 }}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Submit for approval"}
          </button>
        </form>
      </div>
    </Modal>
  );
}

function ImgThumb({ src, onRemove }) {
  return (
    <div style={{ position: "relative", width: 72, height: 72, borderRadius: 12, overflow: "hidden" }}>
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <button
        type="button"
        onClick={onRemove}
        style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "white", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
