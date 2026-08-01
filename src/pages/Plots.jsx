import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { compressImageFile, fileToUploadableBuffer, formatDateTime, formatINR } from "../lib/utils";
import { PROPERTY_IMAGES_BUCKET } from "../lib/constants";
import { IconGallery, IconCamera, IconUser, IconUsers, IconTicket } from "../components/ui/Icons";
import { Modal, ModalHero } from "../components/ui/Modal";

const STATUS_STYLE = {
  available: { bg: "var(--status-available-bg)", border: "var(--status-available-border)", text: "var(--status-available-text)" },
  token: { bg: "var(--status-token-bg)", border: "var(--status-token-border)", text: "var(--status-token-text)" },
  sold: { bg: "var(--status-sold-bg)", border: "var(--status-sold-border)", text: "var(--status-sold-text)" },
};
const STATUS_LABEL = { available: "Available", token: "Token Received", sold: "Sold" };

export default function Plots() {
  const { isAdmin, profile } = useAuth();
  const showToast = useToast();
  const [listings, setListings] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [units, setUnits] = useState([]);
  const [submitTarget, setSubmitTarget] = useState(null); // { unitId, unitNumber }
  const [reviewTarget, setReviewTarget] = useState(null); // unit id

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
      <div className="page">
        <div className="center-loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Plots &amp; Tokens</h1>
      <p className="page-sub">
        {isAdmin
          ? "Tap a green plot to submit a token, or a yellow plot to review one."
          : "Tap a green plot to submit a token for it."}
      </p>

      {listings.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">No plotted listings yet</div>
          <p>Colony-style listings with individual plots will show up here.</p>
        </div>
      ) : (
        <>
          <div className="field" style={{ maxWidth: 360 }}>
            <label className="fl">Project</label>
            <select className="fsel" value={selectedListingId || ""} onChange={(e) => setSelectedListingId(e.target.value)}>
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} {l.area ? `— ${l.area}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="card">
            <div className="plot-grid">
              {units.map((u) => {
                const style = STATUS_STYLE[u.status] || { bg: "var(--secondary)", border: "var(--border)", text: "var(--foreground)" };
                const tappable = (u.status === "available") || (isAdmin && u.status === "token");
                return (
                  <div
                    key={u.id}
                    className={"plot-box" + (tappable ? " tappable" : "")}
                    style={{ border: `1px solid ${style.border}`, background: style.bg }}
                    title={STATUS_LABEL[u.status] || u.status}
                    onClick={() => {
                      if (!tappable) return;
                      if (u.status === "available") setSubmitTarget({ unitId: u.id, unitNumber: u.unit_number });
                      else setReviewTarget(u.id);
                    }}
                  >
                    <div className="plot-box-num" style={{ color: style.text }}>
                      {u.unit_number || "—"}
                    </div>
                    {u.unit_size && (
                      <div className="plot-box-size" style={{ color: style.text }}>
                        {u.unit_size}
                      </div>
                    )}
                    {tappable && (
                      <div className="plot-box-tap" style={{ color: style.text }}>
                        {u.status === "available" ? "Tap to submit" : "Tap to review"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {units.length === 0 && (
              <div className="empty-state">
                <div className="empty-title">No plots yet</div>
                <p>This project has no individual plots configured.</p>
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
    <Modal open={!!target} onClose={onClose}>
      <div className="modal-hero">
        <div
          style={{
            width: 80,
            height: 80,
            margin: "0 auto",
            borderRadius: 26,
            background: "var(--primary)",
            boxShadow: "0 10px 24px -8px rgba(157,29,76,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img src="/logo-mark.png" alt="" width={48} height={48} style={{ objectFit: "contain" }} onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in oklab, var(--primary) 80%, transparent)" }}>
          PinkCity Properties
        </div>
        <div className="modal-title" style={{ marginTop: 6 }}>Token Submission</div>
        <div className="modal-sub">Share the Client &amp; Associate Name and Payment Proof</div>
      </div>
      <div style={{ padding: "18px 22px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid rgba(74,222,128,0.25)", background: "rgba(74,222,128,0.12)", borderRadius: 999, padding: "10px 16px" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#166534" }}>Encrypted &amp; Verified by PinkCity</span>
        </div>
      </div>
      <div className="modal-divider" />
      <div className="modal-body">
        <div className="field">
          <label className="fl" style={{ display: "flex", alignItems: "center", gap: 7, textTransform: "none", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            <IconUser size={15} stroke="var(--primary)" /> Client Name
          </label>
          <input className="fi" placeholder="e.g. Rohit Agarwal" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field">
          <label className="fl" style={{ display: "flex", alignItems: "center", gap: 7, textTransform: "none", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            <IconUsers size={15} stroke="var(--primary)" /> Associate Name
          </label>
          <input className="fi" placeholder="e.g. Meenal Sharma" value={associateName} onChange={(e) => setAssociateName(e.target.value)} />
          <p style={{ marginTop: 6, fontSize: 11.5, color: "var(--muted-foreground)" }}>PinkCity associate handling this deal</p>
        </div>
        <div className="field">
          <label className="fl" style={{ display: "flex", alignItems: "center", gap: 7, textTransform: "none", fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
            Payment Screenshot
          </label>
          <input
            id="plot-photo-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => pickPhoto(e.target.files[0])}
          />
          <input
            id="plot-photo-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => pickPhoto(e.target.files[0])}
          />
          <div className="photo-drop" onClick={() => document.getElementById("plot-photo-input").click()}>
            {photoPreview ? (
              <img src={photoPreview} alt="" />
            ) : (
              <>
                <span className="photo-drop-icon">
                  <IconGallery size={20} stroke="var(--primary)" />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Add a photo</span>
                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Upload from gallery</span>
              </>
            )}
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => document.getElementById("plot-photo-input").click()}>
              <IconGallery size={15} stroke="var(--primary)" /> Gallery
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => document.getElementById("plot-photo-camera-input").click()}>
              <IconCamera size={15} stroke="var(--primary)" /> Camera
            </button>
          </div>
          <p style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted-foreground)" }}>JPG or PNG, clearly showing UTR / transaction ID</p>
        </div>
        {err && <div className="form-err show">{err}</div>}
      </div>
      <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, margin: "16px 22px 0", fontSize: 11, color: "var(--muted-foreground)" }}>
        Details are shared only with PinkCity's verification desk
      </p>
      <div style={{ padding: "20px 22px 4px" }}>
        <button className="btn btn-primary" disabled={!ready || busy} onClick={submit}>
          {busy ? "Submitting…" : "Submit Token"}
        </button>
      </div>
    </Modal>
  );
}

export function ReviewTokenModal({ unitId, onClose, profile, onDecided }) {
  const [submission, setSubmission] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [mode, setMode] = useState(null); // "approve" | "reject" | null
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
    <Modal open={!!unitId} onClose={onClose}>
      <ModalHero icon={<IconTicket size={22} stroke="var(--primary)" />} title="Review Token" sub="Check the photo and buyer details, then approve or reject." />
      <div className="modal-divider" />
      <div className="modal-body">
        {!submission ? (
          <div className="empty-state">
            <p>That submission is no longer pending.</p>
          </div>
        ) : (
          <>
            <img
              src={submission.photo_url}
              alt=""
              style={{ width: "100%", borderRadius: 14, maxHeight: 320, objectFit: "cover", cursor: "zoom-in" }}
              onClick={() => window.open(submission.photo_url, "_blank")}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, marginTop: 14 }}>
              <div>
                <strong>Client:</strong> {submission.buyer_name || "—"}
                {submission.buyer_phone ? ` · ${submission.buyer_phone}` : ""}
              </div>
              {submission.associate_name && (
                <div>
                  <strong>Associate:</strong> {submission.associate_name}
                </div>
              )}
              {submission.token_amount && (
                <div>
                  <strong>Token amount:</strong> {formatINR(submission.token_amount)}
                </div>
              )}
              <div>
                <strong>Submitted by:</strong> {submission.submitted_by_name || "—"} · {formatDateTime(submission.submitted_at)}
              </div>
              {submission.notes && (
                <div>
                  <strong>Notes:</strong> {submission.notes}
                </div>
              )}
            </div>

            {err && <div className="form-err show" style={{ marginTop: 10 }}>{err}</div>}

            {mode === "approve" && (
              <div style={{ marginTop: 14 }}>
                <label className="fl">Sale Amount (₹) *</label>
                <input className="fi" type="number" placeholder="e.g. 4500000" value={saleAmount} onChange={(e) => setSaleAmount(e.target.value)} />
                <label className="fl" style={{ marginTop: 12 }}>Associate credited for this deal</label>
                <select className="fsel" value={associateId} onChange={(e) => setAssociateId(e.target.value)}>
                  <option value="">— None —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
                <button className="btn-approve" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={() => decide(true)}>
                  Confirm Approve
                </button>
              </div>
            )}
            {mode === "reject" && (
              <div style={{ marginTop: 14 }}>
                <label className="fl">Reason for rejection</label>
                <textarea className="fi" style={{ minHeight: 72 }} placeholder="Let the team member know why" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <button className="btn-reject" style={{ width: "100%", marginTop: 10 }} disabled={busy} onClick={() => decide(false)}>
                  Confirm Reject
                </button>
              </div>
            )}
            {!mode && (
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button className="btn-approve" onClick={() => setMode("approve")}>✓ Approve</button>
                <button className="btn-reject" onClick={() => setMode("reject")}>✕ Reject</button>
              </div>
            )}
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: 14 }} onClick={onClose}>
              Close
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
