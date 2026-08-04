import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer, formatDateTime, formatINR } from "../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../lib/constants";
import { User, Users, Image, Camera } from "lucide-react";
import { Sheet, SheetHeader, Field } from "../components/ui/Sheet";
import { Button } from "../components/ui/button";
import { BrandedLoader } from "../components/ui/BrandedLoader";

const STATUS_STYLE = {
  available: "bg-emerald-50 border-emerald-200 text-emerald-700",
  token: "bg-amber-50 border-amber-200 text-amber-700",
  sold: "bg-red-50 border-red-200 text-red-700",
};
const STATUS_LABEL = { available: "Available", token: "Token Received", sold: "Sold" };

export default function Plots() {
  const { isAdmin, profile } = useAuth();
  const showToast = useToast();
  const [listings, setListings] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [units, setUnits] = useState([]);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    sb.from("colony_units")
      .select("listing_id, listings!inner(id,title,area,status)")
      .eq("listings.status", "active")
      .then(({ data }) => {
        const byId = {};
        (data || []).forEach((row) => {
          if (row.listings) byId[row.listings.id] = row.listings;
        });
        const list = Object.values(byId);
        setListings(list);
        if (list.length && !selectedListingId) setSelectedListingId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUnits(listingId) {
    const { data } = await sb.from("colony_units").select("*").eq("listing_id", listingId).order("created_at", { ascending: true });
    setUnits(data || []);
  }

  useEffect(() => {
    if (selectedListingId) loadUnits(selectedListingId);
  }, [selectedListingId]);

  if (listings === null) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Plots &amp; Tokens</h1>
      <p className="text-ink/50 text-sm mb-8">
        {isAdmin ? "Tap a green plot to submit a token, or a yellow plot to review one." : "Tap a green plot to submit a token for it."}
      </p>

      {listings.length === 0 ? (
        <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
          <div className="font-display text-lg text-ink mb-1">No plotted listings yet</div>
          <p className="text-sm">Colony-style listings with individual plots will show up here.</p>
        </div>
      ) : (
        <>
          <div className="max-w-xs mb-5">
            <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Project</span>
            <select className="field-input" value={selectedListingId || ""} onChange={(e) => setSelectedListingId(e.target.value)}>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title} {l.area ? `— ${l.area}` : ""}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-3xl p-5">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {units.map((u) => {
                const tappable = (u.status === "available") || (isAdmin && u.status === "token");
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      if (!tappable) return;
                      if (u.status === "available") setSubmitTarget({ unitId: u.id, unitNumber: u.unit_number });
                      else setReviewTarget(u.id);
                    }}
                    title={STATUS_LABEL[u.status] || u.status}
                    className={`rounded-xl border p-2.5 text-center ${STATUS_STYLE[u.status] || "bg-stone-50 border-ink/10 text-ink"} ${tappable ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <div className="text-xs font-bold">{u.unit_number || "—"}</div>
                    {u.unit_size && <div className="text-[10px] opacity-75 mt-0.5">{u.unit_size}</div>}
                    {tappable && <div className="text-[9px] font-semibold mt-1 opacity-80">{u.status === "available" ? "Tap to submit" : "Tap to review"}</div>}
                  </div>
                );
              })}
            </div>
            {units.length === 0 && (
              <div className="text-center py-16 text-ink/40">
                <div className="font-display text-lg text-ink mb-1">No plots yet</div>
                <p className="text-sm">This project has no individual plots configured.</p>
              </div>
            )}
          </div>
        </>
      )}

      <SubmitTokenModal
        target={submitTarget}
        onClose={() => setSubmitTarget(null)}
        profile={profile}
        onSubmitted={() => {
          setSubmitTarget(null);
          loadUnits(selectedListingId);
          showToast("✓ Token submitted — waiting for admin approval.");
        }}
      />
      <ReviewTokenModal
        unitId={reviewTarget}
        onClose={() => setReviewTarget(null)}
        profile={profile}
        onDecided={(approved) => {
          setReviewTarget(null);
          loadUnits(selectedListingId);
          showToast(approved ? "✓ Token approved — plot marked Sold." : "Submission rejected — plot is Available again.");
        }}
      />
    </div>
  );
}

function submitterName(profile) {
  return profile?.full_name || profile?.email || "Team member";
}

function SubmitTokenModal({ target, onClose, profile, onSubmitted }) {
  const [clientName, setClientName] = useState("");
  const [associateName, setAssociateName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setClientName("");
    setAssociateName("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setErr("");
  }, [target]);

  const ready = clientName.trim() && associateName.trim() && photoFile;

  function pickPhoto(file) {
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!ready || !target) return;
    setBusy(true);
    setErr("");
    try {
      const compressed = await compressImageFile(photoFile);
      const buffer = await fileToUploadableBuffer(compressed);
      const ext = compressed.name.split(".").pop();
      const path = `tokens/${target.unitId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(PROPERTY_IMAGES_BUCKET)
        .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);

      const { error: rpcErr } = await sb.rpc("submit_token_request", {
        p_unit_id: target.unitId,
        p_submitted_by_name: submitterName(profile),
        p_buyer_name: clientName.trim(),
        p_buyer_phone: null,
        p_token_amount: null,
        p_photo_url: pub.publicUrl,
        p_notes: null,
        p_associate_name: associateName.trim(),
      });
      if (rpcErr) throw rpcErr;
      onSubmitted();
    } catch (e) {
      setErr(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center mb-5">
        <div className="w-20 h-20 mx-auto rounded-[26px] bg-stone-600 shadow-[0_10px_24px_-8px_rgba(196,56,104,0.45)] flex items-center justify-center">
          <img src="/logo.png" alt="" width={44} height={44} className="object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <div className="mt-3.5 text-[11px] font-semibold tracking-widest2 uppercase text-stone-500">PinkCity Properties</div>
        <div className="font-display text-2xl text-ink mt-1.5">Token Submission</div>
        <div className="text-sm text-ink/50 mt-1">Share the Client &amp; Associate Name and Payment Proof</div>
      </div>

      <div className="flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 rounded-full py-2.5 px-4 mb-5">
        <span className="text-xs font-medium text-emerald-800">Encrypted &amp; Verified by PinkCity</span>
      </div>

      <div className="space-y-4">
        <Field label={<span className="normal-case text-sm font-semibold text-ink flex items-center gap-1.5"><User className="w-4 h-4" /> Client Name</span>}>
          <input className="field-input" placeholder="e.g. Rohit Agarwal" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </Field>
        <Field label={<span className="normal-case text-sm font-semibold text-ink flex items-center gap-1.5"><Users className="w-4 h-4" /> Associate Name</span>}>
          <input className="field-input" placeholder="e.g. Meenal Sharma" value={associateName} onChange={(e) => setAssociateName(e.target.value)} />
          <p className="text-xs text-ink/40 mt-1.5">PinkCity associate handling this deal</p>
        </Field>
        <Field label="Payment Screenshot">
          <input id="plot-photo-input" type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files[0])} />
          <input id="plot-photo-camera-input" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pickPhoto(e.target.files[0])} />
          <div onClick={() => document.getElementById("plot-photo-input").click()} className="relative rounded-2xl border border-dashed border-stone-300 bg-stone-50/60 overflow-hidden flex flex-col items-center justify-center gap-1.5 py-8 cursor-pointer">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <span className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C43868" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>
                </span>
                <span className="text-sm font-semibold text-ink">Add a photo</span>
                <span className="text-xs text-ink/40">Upload from gallery</span>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            <button type="button" onClick={() => document.getElementById("plot-photo-input").click()} className="text-sm font-medium text-ink/70 border border-ink/10 rounded-full py-2.5 inline-flex items-center justify-center gap-1.5"><Image className="w-4 h-4" /> Gallery</button>
            <button type="button" onClick={() => document.getElementById("plot-photo-camera-input").click()} className="text-sm font-medium text-ink/70 border border-ink/10 rounded-full py-2.5 inline-flex items-center justify-center gap-1.5"><Camera className="w-4 h-4" /> Camera</button>
          </div>
          <p className="text-xs text-ink/40 mt-2">JPG or PNG, clearly showing UTR / transaction ID</p>
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>

      <p className="text-center text-xs text-ink/35 mt-4">Details are shared only with PinkCity&apos;s verification desk</p>

      <Button disabled={!ready || busy} onClick={submit} className="w-full mt-4">{busy ? "Submitting…" : "Submit Token"}</Button>
    </Sheet>
  );
}

export function ReviewTokenModal({ unitId, onClose, profile, onDecided }) {
  const [submission, setSubmission] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [mode, setMode] = useState(null);
  const [saleAmount, setSaleAmount] = useState("");
  const [associateId, setAssociateId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!unitId) {
      setSubmission(null);
      setMode(null);
      setSaleAmount("");
      setAssociateId("");
      setRejectReason("");
      setErr("");
      return;
    }
    (async () => {
      const { data } = await sb
        .from("token_submissions")
        .select("*")
        .eq("unit_id", unitId)
        .eq("status", "pending")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setSubmission(data || null);
      const { data: emps } = await sb.from("employees").select("id,full_name").order("full_name");
      setEmployees(emps || []);
      if (data?.associate_name && emps) {
        const match = emps.find((e) => e.full_name.trim().toLowerCase() === data.associate_name.trim().toLowerCase());
        if (match) setAssociateId(match.id);
      }
    })();
  }, [unitId]);

  async function decide(approve) {
    if (!approve && !rejectReason.trim()) {
      setErr("Please add a reason for rejecting.");
      return;
    }
    if (approve && (!saleAmount || Number(saleAmount) <= 0)) {
      setErr("Please enter the sale amount before approving.");
      return;
    }
    setBusy(true);
    setErr("");
    const { error } = await sb.rpc("review_token_submission", {
      p_submission_id: submission.id,
      p_approve: approve,
      p_reviewer_name: submitterName(profile),
      p_rejection_reason: approve ? null : rejectReason.trim(),
      p_sale_amount: approve ? Number(saleAmount) : null,
      p_associate_employee_id: approve ? associateId || null : null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onDecided(approve);
  }

  return (
    <Sheet open={!!unitId} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Review Token" sub="Check the photo and buyer details, then approve or reject." />
      {!submission ? (
        <div className="text-center py-8 text-ink/40">
          <p>That submission is no longer pending.</p>
        </div>
      ) : (
        <>
          <img
            src={submission.photo_url}
            alt=""
            onClick={() => window.open(submission.photo_url, "_blank")}
            className="w-full rounded-2xl max-h-80 object-cover cursor-zoom-in"
          />
          <div className="flex flex-col gap-1.5 text-sm mt-3.5">
            <div><strong>Client:</strong> {submission.buyer_name || "—"}{submission.buyer_phone ? ` · ${submission.buyer_phone}` : ""}</div>
            {submission.associate_name && <div><strong>Associate:</strong> {submission.associate_name}</div>}
            {submission.token_amount && <div><strong>Token amount:</strong> {formatINR(submission.token_amount)}</div>}
            <div><strong>Submitted by:</strong> {submission.submitted_by_name || "—"} · {formatDateTime(submission.submitted_at)}</div>
            {submission.notes && <div><strong>Notes:</strong> {submission.notes}</div>}
          </div>

          {err && <p className="text-sm text-red-600 mt-2.5">{err}</p>}

          {mode === "approve" && (
            <div className="mt-3.5 space-y-3">
              <Field label="Sale Amount (₹) *"><input className="field-input" type="number" placeholder="e.g. 4500000" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} /></Field>
              <Field label="Associate credited for this deal">
                <select className="field-input" value={associateId} onChange={(e) => setAssociateId(e.target.value)}>
                  <option value="">— None —</option>
                  {employees.map((e) => (<option key={e.id} value={e.id}>{e.full_name}</option>))}
                </select>
              </Field>
              <button disabled={busy} onClick={() => decide(true)} className="w-full text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full py-3 disabled:opacity-50">
                Confirm Approve
              </button>
            </div>
          )}
          {mode === "reject" && (
            <div className="mt-3.5 space-y-3">
              <Field label="Reason for rejection"><textarea className="field-input min-h-[72px]" placeholder="Let the team member know why" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></Field>
              <button disabled={busy} onClick={() => decide(false)} className="w-full text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full py-3 disabled:opacity-50">
                Confirm Reject
              </button>
            </div>
          )}
          {!mode && (
            <div className="flex gap-2.5 mt-3.5">
              <button onClick={() => setMode("approve")} className="flex-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full py-3">✓ Approve</button>
              <button onClick={() => setMode("reject")} className="flex-1 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full py-3">✕ Reject</button>
            </div>
          )}
          <button onClick={onClose} className="w-full text-sm font-medium text-ink/60 border border-ink/10 rounded-full py-3 mt-3.5">Close</button>
        </>
      )}
    </Sheet>
  );
}
