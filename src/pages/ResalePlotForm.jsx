import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, Upload, FileText, X, ArrowLeft } from "lucide-react";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { formatINR, compressImageFile, fileToUploadableBuffer } from "../lib/utils";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import { BUCKET_PLANS, BUCKET_OWNER_DOCS, RESALE_STATUS, FACINGS, fileExt, friendlyError } from "../lib/resale";

const EMPTY = { location: "", scheme: "", plot_number: "", area: "", facing: "", dimensions: "", rate: "", registration: "", notes: "", status: "available", allowDownload: true };

async function uploadFile(bucket, path, file, maxDim) {
  let f = file;
  if (file.type && file.type.startsWith("image/")) f = await compressImageFile(file, maxDim, 0.9);
  const buffer = await fileToUploadableBuffer(f);
  const { error } = await sb.storage.from(bucket).upload(path, buffer, { contentType: f.type || file.type || "application/octet-stream", upsert: false });
  if (error) throw error;
}

const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function Label({ text, children }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">{text}</span>
      {children}
    </label>
  );
}

// Admin: add or edit a listing. The owner section is a separate, admin-only
// record — it is saved to tables that associates cannot read at all.
export default function ResalePlotForm() {
  const { id } = useParams();
  const editing = !!id;
  const nav = useNavigate();
  const showToast = useToast();
  const [f, setF] = useState(EMPTY);
  const [owner, setOwner] = useState({ name: "", mobile: "", notes: "" });
  const [hadOwner, setHadOwner] = useState(false);
  const [planPath, setPlanPath] = useState(null);
  const [planFile, setPlanFile] = useState(null);
  const [removePlan, setRemovePlan] = useState(false);
  const [docs, setDocs] = useState([]);
  const [newDocs, setNewDocs] = useState([]);
  const [hints, setHints] = useState({ schemes: [], locations: [] });
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const total = Math.round((Number(f.area) || 0) * (Number(f.rate) || 0));

  useEffect(() => {
    sb.from("resale_plots").select("scheme,location").range(0, 2999).then(({ data }) => {
      setHints({
        schemes: [...new Set((data || []).map((r) => r.scheme))].sort(),
        locations: [...new Set((data || []).map((r) => r.location))].sort(),
      });
    });
    if (!editing) return;
    (async () => {
      const { data: p } = await sb.from("resale_plots").select("*").eq("id", id).maybeSingle();
      if (!p) {
        setErr("This listing couldn't be found.");
        setLoading(false);
        return;
      }
      setF({
        location: p.location || "", scheme: p.scheme || "", plot_number: p.plot_number || "", area: String(p.area_gaj ?? ""),
        facing: p.facing || "", dimensions: p.dimensions || "", rate: String(p.rate_per_gaj ?? ""),
        registration: p.registration_amount != null ? String(p.registration_amount) : "", notes: p.notes || "",
        status: p.status, allowDownload: p.plan_download_allowed,
      });
      setPlanPath(p.site_plan_path || null);
      const [{ data: o }, { data: d }] = await Promise.all([
        sb.from("resale_plot_owners").select("*").eq("plot_id", id).maybeSingle(),
        sb.from("resale_owner_documents").select("*").eq("plot_id", id).order("uploaded_at"),
      ]);
      if (o) {
        setHadOwner(true);
        setOwner({ name: o.owner_name || "", mobile: o.owner_mobile || "", notes: o.negotiation_notes || "" });
      }
      setDocs(d || []);
      setLoading(false);
    })();
  }, [id, editing]);

  async function removeDoc(d) {
    if (!window.confirm(`Delete "${d.file_name}"? This can't be undone.`)) return;
    await sb.storage.from(BUCKET_OWNER_DOCS).remove([d.file_path]);
    const { error } = await sb.from("resale_owner_documents").delete().eq("id", d.id);
    if (error) return showToast(error.message);
    setDocs((list) => list.filter((x) => x.id !== d.id));
  }

  async function save() {
    setErr("");
    const area = Number(f.area);
    const rate = Number(f.rate);
    if (!f.location.trim() || !f.scheme.trim() || !f.plot_number.trim()) return setErr("Please fill in the location, scheme and plot number.");
    if (!(area > 0)) return setErr("Please enter the plot area in Gaj.");
    if (f.rate === "" || !(rate >= 0)) return setErr("Please enter the demand rate per Gaj.");
    setBusy(true);

    let plotId = id;
    try {
      const row = {
        location: f.location.trim(), scheme: f.scheme.trim(), plot_number: f.plot_number.trim(), area_gaj: area,
        facing: f.facing || null, dimensions: f.dimensions.trim() || null, rate_per_gaj: rate,
        registration_amount: f.registration === "" ? null : Number(f.registration),
        notes: f.notes.trim() || null, status: f.status, plan_download_allowed: f.allowDownload,
      };
      if (editing) {
        const { error } = await sb.from("resale_plots").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("resale_plots").insert(row).select("id").single();
        if (error) throw error;
        plotId = data.id;
      }
    } catch (e) {
      setErr(friendlyError(e));
      setBusy(false);
      return;
    }

    try {
      if (planFile) {
        const path = `${plotId}/${Date.now()}.${fileExt(planFile.name)}`;
        await uploadFile(BUCKET_PLANS, path, planFile, 2400);
        const { error } = await sb.from("resale_plots").update({ site_plan_path: path }).eq("id", plotId);
        if (error) throw error;
        if (planPath) await sb.storage.from(BUCKET_PLANS).remove([planPath]);
      } else if (removePlan && planPath) {
        await sb.from("resale_plots").update({ site_plan_path: null }).eq("id", plotId);
        await sb.storage.from(BUCKET_PLANS).remove([planPath]);
      }
      if (owner.name.trim() || owner.mobile.trim() || owner.notes.trim() || hadOwner) {
        const { error } = await sb.from("resale_plot_owners").upsert({
          plot_id: plotId, owner_name: owner.name.trim() || null, owner_mobile: owner.mobile.trim() || null,
          negotiation_notes: owner.notes.trim() || null, updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      for (const file of newDocs) {
        const path = `${plotId}/${uid()}.${fileExt(file.name)}`;
        await uploadFile(BUCKET_OWNER_DOCS, path, file, 1600);
        const { error } = await sb.from("resale_owner_documents").insert({ plot_id: plotId, file_path: path, file_name: file.name });
        if (error) throw error;
      }
    } catch (e) {
      showToast(`Listing saved, but: ${friendlyError(e)}`);
      setBusy(false);
      nav(`/resale/${plotId}/edit`, { replace: true });
      return;
    }

    showToast("✓ Listing saved.");
    nav(`/resale/${plotId}`);
  }

  if (loading) {
    return <div className="mx-auto flex max-w-2xl justify-center px-5 py-24"><BrandedLoader size={24} /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link to={editing ? `/resale/${id}` : "/resale"} className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-semibold text-stone-700">
        <ArrowLeft className="h-4 w-4" /> {editing ? "Back to listing" : "Plots for Resale"}
      </Link>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Admin</div>
      <h1 className="mt-1.5 font-display text-[30px] font-semibold leading-tight tracking-tight text-ink">{editing ? "Edit Listing" : "Add Listing"}</h1>

      <datalist id="resale-schemes">{hints.schemes.map((s) => <option key={s} value={s} />)}</datalist>
      <datalist id="resale-locations">{hints.locations.map((s) => <option key={s} value={s} />)}</datalist>

      {/* Property information */}
      <div className="mt-5 rounded-[22px] border border-ink/[0.06] bg-surface p-5 shadow-soft">
        <div className="mb-4 text-[15px] font-semibold text-ink">Property Information</div>
        <Label text="Location"><input className="field-input" list="resale-locations" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Tonk Road, Jaipur" /></Label>
        <Label text="Scheme / Township"><input className="field-input" list="resale-schemes" value={f.scheme} onChange={(e) => set("scheme", e.target.value)} placeholder="e.g. Kailash Dham Township" /></Label>
        <Label text="Plot Number"><input className="field-input" value={f.plot_number} onChange={(e) => set("plot_number", e.target.value)} placeholder="e.g. 96" /></Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Area (Gaj)"><input className="field-input" type="number" inputMode="decimal" value={f.area} onChange={(e) => set("area", e.target.value)} placeholder="e.g. 102" /></Label>
          <Label text="Facing">
            <select className="field-input" value={f.facing} onChange={(e) => set("facing", e.target.value)}>
              <option value="">Select…</option>
              {FACINGS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Label>
        </div>
        <Label text="Plot Dimensions"><input className="field-input" value={f.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="e.g. 27 × 34 ft" /></Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Demand Rate per Gaj (₹)"><input className="field-input" type="number" inputMode="decimal" value={f.rate} onChange={(e) => set("rate", e.target.value)} placeholder="e.g. 18000" /></Label>
          <div className="mb-3.5">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Total Demand</span>
            <div className="flex min-h-[50px] items-center rounded-xl border border-stone-100 bg-stone-50 px-4 font-display text-[17px] font-semibold text-stone-700" aria-live="polite">
              {total > 0 ? formatINR(total) : "—"}
            </div>
          </div>
        </div>
        <p className="-mt-1.5 mb-3.5 text-[12px] text-ink/40">Calculated automatically: Area × Rate</p>
        <Label text="Registration Amount (₹)"><input className="field-input" type="number" inputMode="decimal" value={f.registration} onChange={(e) => set("registration", e.target.value)} placeholder="e.g. 110160" /></Label>

        <div className="mb-3.5">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Site Plan</span>
          {planPath && !planFile && !removePlan && (
            <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3 text-[13px] text-ink/70">
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">Site plan uploaded</span></span>
              <button type="button" onClick={() => setRemovePlan(true)} className="shrink-0 text-[12.5px] font-semibold text-red-600">Remove</button>
            </div>
          )}
          {removePlan && <p className="mb-2 text-[12.5px] text-red-600">The current plan will be removed when you save. <button type="button" className="font-semibold underline" onClick={() => setRemovePlan(false)}>Undo</button></p>}
          <label className="flex min-h-[72px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-100 bg-stone-50/50 px-4 text-center text-[13.5px] font-semibold text-stone-700">
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">{planFile ? planFile.name : planPath ? "Replace site plan (image or PDF)" : "Upload site plan (image or PDF)"}</span>
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { setPlanFile(e.target.files[0] || null); setRemovePlan(false); }} />
          </label>
          <label className="mt-2.5 flex items-center gap-2.5 text-[13px] text-ink/65">
            <input type="checkbox" className="h-4 w-4 accent-stone-600" checked={f.allowDownload} onChange={(e) => set("allowDownload", e.target.checked)} />
            Let associates download the site plan
          </label>
        </div>

        <Label text="Additional Notes"><textarea className="field-input min-h-[84px]" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything an associate should know about this plot" /></Label>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink/80">Availability Status</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RESALE_STATUS).map(([k, v]) => (
              <button key={k} type="button" onClick={() => set("status", k)} className={`min-h-[44px] rounded-full border px-4 text-[13px] font-semibold ${f.status === k ? "border-stone-600 bg-stone-600 text-white" : "border-ink/10 text-ink/60"}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Confidential owner information */}
      <div className="mt-5 rounded-[22px] border-[1.5px] border-stone-100 bg-stone-50/60 p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fc8eac] text-[#5a1530]"><Lock className="h-4 w-4" /></span>
          <div className="flex-1 text-[15px] font-semibold text-ink">Confidential Owner Information</div>
          <span className="rounded-full bg-stone-600 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wider text-white">ADMIN ONLY</span>
        </div>
        <p className="mb-4 mt-2.5 text-[12.5px] leading-relaxed text-ink/50">Associates can never see this section. It is protected by database permissions, not just hidden on screen.</p>
        <Label text="Plot Owner Name"><input className="field-input" value={owner.name} onChange={(e) => setOwner((o) => ({ ...o, name: e.target.value }))} /></Label>
        <Label text="Owner Mobile Number"><input className="field-input" type="tel" inputMode="tel" value={owner.mobile} onChange={(e) => setOwner((o) => ({ ...o, mobile: e.target.value }))} /></Label>
        <Label text="Private Negotiation Notes"><textarea className="field-input min-h-[84px]" value={owner.notes} onChange={(e) => setOwner((o) => ({ ...o, notes: e.target.value }))} /></Label>

        <div>
          <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Owner Documents <span className="font-normal text-ink/40">(if required)</span></span>
          {docs.map((d) => (
            <div key={d.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-[13px] text-ink/75">
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{d.file_name}</span></span>
              <button type="button" onClick={() => removeDoc(d)} className="shrink-0 text-[12.5px] font-semibold text-red-600">Delete</button>
            </div>
          ))}
          {newDocs.map((file, i) => (
            <div key={i} className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-[13px] text-ink/75">
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span></span>
              <button type="button" aria-label="Remove file" onClick={() => setNewDocs((l) => l.filter((_, j) => j !== i))} className="shrink-0 text-ink/40"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <label className="flex min-h-[60px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-stone-100 bg-white/60 px-4 text-[13.5px] font-semibold text-stone-700">
            <Upload className="h-4 w-4" /> Add documents (image or PDF)
            <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { setNewDocs((l) => [...l, ...Array.from(e.target.files)]); e.target.value = ""; }} />
          </label>
        </div>
      </div>

      {err && <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">{err}</div>}

      <div className="mt-5 flex gap-3">
        <button type="button" onClick={() => nav(editing ? `/resale/${id}` : "/resale")} disabled={busy} className="min-h-[52px] flex-1 rounded-full border border-ink/10 bg-white text-[14.5px] font-semibold text-ink/70">Cancel</button>
        <button type="button" onClick={save} disabled={busy} className="min-h-[52px] flex-[2] rounded-full bg-stone-600 text-[14.5px] font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save Listing"}
        </button>
      </div>
    </div>
  );
}
