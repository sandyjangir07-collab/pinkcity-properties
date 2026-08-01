import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, STATUS_TEXT, STATUS_DOT } from "../../lib/leadConstants";
import { Modal } from "../ui/Modal";
import { IconPhone, IconRupee, IconMapPin } from "../ui/Icons";

export default function LeadDetailModal({ leadId, onClose, onChanged, onEdit, onScheduleVisit, onScheduleCall, onDeleted }) {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [lead, setLead] = useState(null);
  const [visit, setVisit] = useState(null);
  const [call, setCall] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [noteInput, setNoteInput] = useState("");

  async function load() {
    const { data: l } = await sb.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (!l) return;
    setLead(l);

    const { data: visits } = await sb
      .from("scheduled_visits")
      .select("*")
      .eq("lead_id", leadId)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false });
    setVisit((visits && visits.find((v) => v.status === "scheduled")) || (visits && visits[0]) || null);

    const { data: calls } = await sb
      .from("scheduled_calls")
      .select("*")
      .eq("lead_id", leadId)
      .order("call_datetime", { ascending: false });
    setCall((calls && calls.find((c) => c.status === "scheduled")) || (calls && calls[0]) || null);

    await loadTimeline(l);
  }

  async function loadTimeline(leadRow) {
    const { data } = await sb.from("lead_notes").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
    let entries = data || [];
    if (leadRow && leadRow.notes) {
      entries = entries.concat([
        {
          note: leadRow.notes,
          status_change: null,
          created_by_name: leadRow.created_by_name || "Initial note",
          created_at: leadRow.created_at,
        },
      ]);
      entries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    setTimeline(entries);
  }

  useEffect(() => {
    if (leadId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  async function updateStatus(status) {
    const submitterName = profile?.full_name || profile?.email || user.email;
    await sb.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
    await sb.from("lead_notes").insert({
      lead_id: leadId,
      note: "Status changed to " + (STATUS_LABELS[status] || status),
      status_change: STATUS_LABELS[status] || status,
      created_by: user.id,
      created_by_name: submitterName,
      created_at: new Date().toISOString(),
    });
    showToast("✓ Status updated!");
    await load();
    onChanged();
  }

  async function addNote() {
    const note = noteInput.trim();
    if (!note) return;
    const submitterName = profile?.full_name || profile?.email || user.email;
    await sb.from("lead_notes").insert({
      lead_id: leadId,
      note,
      created_by: user.id,
      created_by_name: submitterName,
      created_at: new Date().toISOString(),
    });
    setNoteInput("");
    showToast("✓ Note saved!");
    await loadTimeline(lead);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this lead and all its notes?")) return;
    await sb.from("lead_notes").delete().eq("lead_id", leadId);
    await sb.from("leads").delete().eq("id", leadId);
    showToast("Lead deleted.");
    onDeleted();
  }

  if (!leadId || !lead) return <Modal open={!!leadId} onClose={onClose}>{null}</Modal>;

  const hasLoanInfo = lead.occupation || lead.company_name || lead.monthly_salary || lead.loan_amount_required;

  return (
    <Modal open={!!leadId} onClose={onClose}>
      <div className="modal-body" style={{ paddingTop: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
            {lead.name} <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 500, color: "var(--primary)" }}>PC{lead.lead_number}</span>
          </div>
          <span className="badge">{STATUS_LABELS[lead.status] || lead.status}</span>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 13, color: "var(--muted-foreground)" }}>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", textDecoration: "none" }}>
              <IconPhone size={12} /> {lead.phone}
            </a>
          )}
          {lead.budget && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconRupee size={12} /> {lead.budget}
            </span>
          )}
          {lead.preferred_location && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <IconMapPin size={12} /> {lead.preferred_location}
            </span>
          )}
        </div>

        {hasLoanInfo && (
          <div className="card" style={{ marginTop: 14, padding: 14 }}>
            <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Loan Offer Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
              <div><strong>Occupation:</strong> {lead.occupation || "—"}</div>
              <div><strong>Company:</strong> {lead.company_name || "—"}</div>
              <div><strong>Salary:</strong> {lead.monthly_salary ? `₹${lead.monthly_salary}` : "—"}</div>
              <div><strong>Loan Amount:</strong> {lead.loan_amount_required ? `₹${lead.loan_amount_required}` : "—"}</div>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 14, padding: 14 }}>
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Site Visit</div>
          {visit && visit.status === "scheduled" ? (
            <div style={{ fontSize: 13.5 }}>
              {new Date(visit.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {visit.visit_time || "—"}
              {visit.listing_title ? ` · ${visit.listing_title}` : ""}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No visit scheduled.</div>
          )}
          <button
            className="btn btn-secondary"
            style={{ marginTop: 10, fontSize: 13 }}
            onClick={() => onScheduleVisit({ leadId, name: lead.name, phone: lead.phone, editId: visit?.status === "scheduled" ? visit.id : null, existing: visit?.status === "scheduled" ? visit : null })}
          >
            {visit && visit.status === "scheduled" ? "Reschedule" : "Schedule Visit"}
          </button>
        </div>

        <div className="card" style={{ marginTop: 14, padding: 14 }}>
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Call</div>
          {call && call.status === "scheduled" ? (
            <div style={{ fontSize: 13.5 }}>
              {new Date(call.call_datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
              {new Date(call.call_datetime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No call scheduled.</div>
          )}
          <button
            className="btn btn-secondary"
            style={{ marginTop: 10, fontSize: 13 }}
            onClick={() => onScheduleCall({ leadId, name: lead.name, phone: lead.phone, editId: call?.status === "scheduled" ? call.id : null, existing: call?.status === "scheduled" ? call : null })}
          >
            📞 {call && call.status === "scheduled" ? "Reschedule" : "Schedule Call"}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Status</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(STATUS_TEXT).map((s) => (
              <button
                key={s}
                className={"status-pill" + (lead.status === s ? " active" : "")}
                onClick={() => updateStatus(s)}
              >
                <span className="status-dot" style={{ background: lead.status === s ? "white" : STATUS_DOT[s] }} />
                {STATUS_TEXT[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Activity</div>
          <div className="field" style={{ display: "flex", gap: 8 }}>
            <input className="fi" placeholder="Add a note…" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
            <button className="btn btn-secondary" style={{ width: "auto" }} onClick={addNote}>Add</button>
          </div>
          {timeline.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "8px 0" }}>No activity yet. Add a note above.</div>
          ) : (
            timeline.map((n, i) => {
              const d = new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    {n.status_change && <div className="timeline-status-change">Status → {n.status_change}</div>}
                    <div className="timeline-note">{n.note}</div>
                    <div className="timeline-meta">{n.created_by_name} · {d}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onEdit(leadId)}>Edit Lead</button>
          <button className="btn-reject" style={{ flex: 1 }} onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </Modal>
  );
}
