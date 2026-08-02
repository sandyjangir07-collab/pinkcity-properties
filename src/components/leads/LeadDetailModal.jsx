import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, STATUS_TEXT } from "../../lib/leadConstants";
import { Sheet } from "../ui/Sheet";
import { Pill } from "../ui/primitives";

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
        { note: leadRow.notes, status_change: null, created_by_name: leadRow.created_by_name || "Initial note", created_at: leadRow.created_at },
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

  if (!leadId || !lead) return <Sheet open={!!leadId} onClose={onClose}>{null}</Sheet>;

  const hasLoanInfo = lead.occupation || lead.company_name || lead.monthly_salary || lead.loan_amount_required;

  return (
    <Sheet open={!!leadId} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-2">
        <div className="font-display text-xl text-ink">
          {lead.name} <span className="font-sans text-sm font-medium text-stone-600">PC{lead.lead_number}</span>
        </div>
        <Pill tone="stone">{STATUS_LABELS[lead.status] || lead.status}</Pill>
      </div>
      <div className="flex gap-3 flex-wrap text-sm text-ink/50 mb-4">
        {lead.phone && <a href={`tel:${lead.phone}`} className="text-inherit no-underline">📞 {lead.phone}</a>}
        {lead.budget && <span>₹ {lead.budget}</span>}
        {lead.preferred_location && <span>📍 {lead.preferred_location}</span>}
      </div>

      {hasLoanInfo && (
        <div className="bg-stone-50/60 rounded-2xl p-4 mb-3 text-sm">
          <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Loan Offer Details</div>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Occupation:</strong> {lead.occupation || "—"}</div>
            <div><strong>Company:</strong> {lead.company_name || "—"}</div>
            <div><strong>Salary:</strong> {lead.monthly_salary ? `₹${lead.monthly_salary}` : "—"}</div>
            <div><strong>Loan Amount:</strong> {lead.loan_amount_required ? `₹${lead.loan_amount_required}` : "—"}</div>
          </div>
        </div>
      )}

      <div className="bg-stone-50/60 rounded-2xl p-4 mb-3">
        <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Site Visit</div>
        {visit && visit.status === "scheduled" ? (
          <div className="text-sm text-ink">
            {new Date(visit.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {visit.visit_time || "—"}
            {visit.listing_title ? ` · ${visit.listing_title}` : ""}
          </div>
        ) : (
          <div className="text-sm text-ink/40">No visit scheduled.</div>
        )}
        <button
          onClick={() => onScheduleVisit({ leadId, name: lead.name, phone: lead.phone, editId: visit?.status === "scheduled" ? visit.id : null, existing: visit?.status === "scheduled" ? visit : null })}
          className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5 mt-2.5"
        >
          {visit && visit.status === "scheduled" ? "Reschedule" : "Schedule Visit"}
        </button>
      </div>

      <div className="bg-stone-50/60 rounded-2xl p-4 mb-4">
        <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Call</div>
        {call && call.status === "scheduled" ? (
          <div className="text-sm text-ink">
            {new Date(call.call_datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
            {new Date(call.call_datetime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </div>
        ) : (
          <div className="text-sm text-ink/40">No call scheduled.</div>
        )}
        <button
          onClick={() => onScheduleCall({ leadId, name: lead.name, phone: lead.phone, editId: call?.status === "scheduled" ? call.id : null, existing: call?.status === "scheduled" ? call : null })}
          className="text-xs font-medium text-stone-600 border border-stone-200 rounded-full px-3 py-1.5 mt-2.5"
        >
          📞 {call && call.status === "scheduled" ? "Reschedule" : "Schedule Call"}
        </button>
      </div>

      <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Status</div>
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.keys(STATUS_TEXT).map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${lead.status === s ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}
          >
            {STATUS_TEXT[s]}
          </button>
        ))}
      </div>

      <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Activity</div>
      <div className="flex gap-2 mb-4">
        <input className="field-input" placeholder="Add a note…" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
        <button onClick={addNote} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-xl px-4 shrink-0">Add</button>
      </div>
      {timeline.length === 0 ? (
        <div className="text-sm text-ink/40 py-2">No activity yet. Add a note above.</div>
      ) : (
        <div className="space-y-3 mb-5">
          {timeline.map((n, i) => {
            const d = new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
            return (
              <div key={i} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-stone-500 mt-1.5 shrink-0" />
                <div>
                  {n.status_change && <div className="text-xs font-semibold text-stone-600 mb-0.5">Status → {n.status_change}</div>}
                  <div className="text-sm text-ink">{n.note}</div>
                  <div className="text-xs text-ink/35 mt-0.5">{n.created_by_name} · {d}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={() => onEdit(leadId)} className="flex-1 rounded-full border border-ink/10 text-ink/70 text-sm font-medium py-3">Edit Lead</button>
        <button onClick={handleDelete} className="flex-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-sm font-medium py-3">Delete</button>
      </div>
    </Sheet>
  );
}
