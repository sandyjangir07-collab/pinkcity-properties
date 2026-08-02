import { useEffect, useRef, useState } from "react";
import { sb } from "../../lib/supabase";
import { DOCUMENT_TYPES, EMPLOYEE_DOCUMENTS_BUCKET } from "../../lib/constants";
import { compressImageFile, fileToUploadableBuffer } from "../../lib/utils";
import { Card, SectionTitle, Pill } from "../ui/primitives";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
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
    <Card>
      <SectionTitle>Compliance</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {DOCUMENT_TYPES.map(({ type, label }) => {
          const doc = docs.find((d) => d.document_type === type);
          const status = doc?.status;
          return (
            <div key={type} className="bg-stone-50/60 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C43868" strokeWidth="1.8">
                  <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8M8 11h8M8 15h5" />
                </svg>
                <StatusPill status={status} />
              </div>
              <div className="text-sm font-medium text-ink">{label}</div>
              {doc && signedUrls[type] && (
                <a href={signedUrls[type]} target="_blank" rel="noreferrer" className="text-xs text-stone-600">View file</a>
              )}
              {doc?.admin_remarks && status === "rejected" && <div className="text-xs text-red-600">{doc.admin_remarks}</div>}
              <div className="flex gap-2 mt-0.5">
                {canEdit && (status !== "approved" || !doc) && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => (fileInputs.current[type] = el)}
                      onChange={(e) => handleUpload(type, e.target.files[0])}
                    />
                    <button
                      onClick={() => fileInputs.current[type].click()}
                      className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5"
                    >
                      {doc ? "Re-upload" : "Upload"}
                    </button>
                  </>
                )}
                {isAdmin && doc && status === "pending" && (
                  <button onClick={() => setReviewTarget(doc)} className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5">
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
    </Card>
  );
}

function StatusPill({ status }) {
  if (status === "approved") return <Pill tone="green">Approved</Pill>;
  if (status === "rejected") return <Pill tone="red">Rejected</Pill>;
  if (status === "pending") return <Pill tone="yellow">Pending</Pill>;
  return <Pill>Not Uploaded</Pill>;
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
    <Sheet open={!!doc} onClose={onClose}>
      <SheetHeader title="Review Document" />
      {signedUrl && <img src={signedUrl} alt="" className="w-full rounded-2xl mb-4 max-h-80 object-cover" />}
      <Field label="Remarks (required if rejecting)">
        <textarea className="field-input min-h-[80px]" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </Field>
      <div className="flex gap-3 mt-4">
        <button
          disabled={busy}
          onClick={() => decide("approved")}
          className="flex-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 py-3 text-sm font-semibold disabled:opacity-50"
        >
          ✓ Approve
        </button>
        <button
          disabled={busy || !remarks.trim()}
          onClick={() => decide("rejected")}
          className="flex-1 rounded-full bg-red-50 text-red-600 border border-red-200 py-3 text-sm font-semibold disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </Sheet>
  );
}
