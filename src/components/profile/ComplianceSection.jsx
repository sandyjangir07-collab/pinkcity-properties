import { useEffect, useRef, useState } from "react";
import { sb } from "../../lib/supabase";
import { DOCUMENT_TYPES, EMPLOYEE_DOCUMENTS_BUCKET } from "../../lib/constants";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { IconFile, IconCheck, IconX } from "../ui/Icons";
import { Modal, ModalHero } from "../ui/Modal";
import { useToast } from "../../hooks/useToast";

export default function ComplianceSection({ employee, isAdmin, canEdit, refreshKey }) {
  const [docs, setDocs] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const [reviewTarget, setReviewTarget] = useState(null);
  const fileInputs = useRef({});
  const showToast = useToast();

  async function load() {
    const { data } = await sb.from("employee_documents").select("*").eq("employee_id", employee.id);
    setDocs(data || []);
    const urls = {};
    for (const d of data || []) {
      const { data: signed } = await sb.storage.from(EMPLOYEE_DOCUMENTS_BUCKET).createSignedUrl(d.file_url, 3600);
      if (signed) urls[d.document_type] = signed.signedUrl;
    }
    setSignedUrls(urls);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  async function handleUpload(docType, file) {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      const buffer = await fileToUploadableBuffer(compressed);
      const ext = compressed.name.split(".").pop();
      const path = `${employee.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(EMPLOYEE_DOCUMENTS_BUCKET)
        .upload(path, buffer, { cacheControl: "3600", upsert: false, contentType: compressed.type || `image/${ext}` });
      if (upErr) throw upErr;
      const { error: insErr } = await sb.from("employee_documents").insert({
        employee_id: employee.id,
        document_type: docType,
        file_url: path,
        status: "pending",
      });
      if (insErr) throw insErr;
      showToast("Document uploaded — pending review.");
      load();
    } catch (e) {
      showToast(e.message || "Upload failed.");
    }
  }

  if (!docs) return null;

  return (
    <div className="card">
      <h2 className="section-title">Compliance</h2>
      <div className="compliance-grid">
        {DOCUMENT_TYPES.map(({ type, label }) => {
          const doc = docs.find((d) => d.document_type === type);
          const status = doc?.status;
          return (
            <div key={type} className="compliance-card">
              <div className="cc-top">
                <IconFile size={18} stroke="var(--primary)" />
                <StatusPill status={status} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
              {doc && signedUrls[type] && (
                <a href={signedUrls[type]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--primary)" }}>
                  View file
                </a>
              )}
              {doc?.admin_remarks && status === "rejected" && (
                <div style={{ fontSize: 11.5, color: "#dc2626" }}>{doc.admin_remarks}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {canEdit && (status !== "approved" || !doc) && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      ref={(el) => (fileInputs.current[type] = el)}
                      onChange={(e) => handleUpload(type, e.target.files[0])}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: "8px 12px" }}
                      onClick={() => fileInputs.current[type].click()}
                    >
                      {doc ? "Re-upload" : "Upload"}
                    </button>
                  </>
                )}
                {isAdmin && doc && status === "pending" && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: "8px 12px" }}
                    onClick={() => setReviewTarget(doc)}
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ReviewDocumentModal
        doc={reviewTarget}
        signedUrl={reviewTarget ? signedUrls[reviewTarget.document_type] : null}
        onClose={() => setReviewTarget(null)}
        onReviewed={() => {
          setReviewTarget(null);
          load();
        }}
      />
    </div>
  );
}

function StatusPill({ status }) {
  if (status === "approved") return <span className="pill pill-green">Approved</span>;
  if (status === "rejected") return <span className="pill pill-red">Rejected</span>;
  if (status === "pending") return <span className="pill pill-yellow">Pending</span>;
  return <span className="pill pill-neutral">Not Uploaded</span>;
}

function ReviewDocumentModal({ doc, signedUrl, onClose, onReviewed }) {
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    setRemarks("");
  }, [doc]);

  async function decide(decision) {
    setBusy(true);
    const { error } = await sb.rpc("review_employee_document", {
      p_document_id: doc.id,
      p_decision: decision,
      p_remarks: remarks.trim() || null,
    });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(decision === "approved" ? "Document approved." : "Document rejected.");
    onReviewed();
  }

  return (
    <Modal open={!!doc} onClose={onClose}>
      <ModalHero title="Review Document" />
      <div className="modal-body">
        {signedUrl && (
          <img src={signedUrl} alt="" style={{ width: "100%", borderRadius: 14, marginBottom: 14, maxHeight: 320, objectFit: "cover" }} />
        )}
        <div className="field">
          <label className="fl">Remarks (required if rejecting)</label>
          <textarea className="fi" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-approve" disabled={busy} onClick={() => decide("approved")}>
            <IconCheck size={14} /> Approve
          </button>
          <button
            className="btn-reject"
            disabled={busy || !remarks.trim()}
            onClick={() => decide("rejected")}
          >
            <IconX size={14} /> Reject
          </button>
        </div>
      </div>
    </Modal>
  );
}
