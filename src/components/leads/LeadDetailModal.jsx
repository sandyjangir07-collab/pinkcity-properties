import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, STATUS_TEXT, SOURCE_LABELS, waNumberFor } from "../../lib/leadConstants";
import { JOURNEY, journeyStep, nextAction } from "../../lib/leadNext";
import { leadScore } from "../../lib/leadScore";
import { Phone, MessageCircle, CalendarDays, CalendarClock, Send, UserRound, Trash2, AlertTriangle, Share2, Pencil, Lightbulb } from "lucide-react";
import { Sheet } from "../ui/Sheet";
import AiAssistPanel from "./AiAssistPanel";
import VoiceMic, { appendSpoken } from "./VoiceMic";
import CloseDealPanel from "./CloseDealPanel";
import TransferLeadSheet from "./TransferLeadSheet";

const NOTE_TEMPLATES = [
  "Called - no answer",
  "Interested, will visit this weekend",
  "Asked for more photos",
  "Negotiating on price",
  "Not interested right now",
  "Requested loan/EMI details",
];

const STATUS_TONE = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  visit_scheduled: "bg-orange-100 text-orange-700",
  visit_done: "bg-purple-100 text-purple-700",
  negotiating: "bg-red-100 text-red-700",
  closed: "bg-emerald-100 text-emerald-700",
  lost: "bg-ink/[0.08] text-ink/50",
};

export default function LeadDetailModal({ leadId, onClose, onChanged, onEdit, onOpenLead, onScheduleVisit, onScheduleCall, onDeleted }) {
  const { user, profile, isAdmin } = useAuth();
  const showToast = useToast();
  const [lead, setLead] = useState(null);
  const [visit, setVisit] = useState(null);
  const [call, setCall] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [dupLead, setDupLead] = useState(null);
  const [closingFlow, setClosingFlow] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [confirmHandBack, setConfirmHandBack] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // { id, text }

  async function handleDealClosed(unit, townshipTitle) {
    const submitterName = profile?.full_name || profile?.email || user.email;
    await sb.from("leads").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", leadId);
    await sb.from("lead_notes").insert({
      lead_id: leadId,
      note: `Closed — token submitted for ${townshipTitle}, Plot ${unit?.unit_number || "—"}${unit?.unit_size ? ` (${unit.unit_size})` : ""}. Pending admin approval.`,
      status_change: STATUS_LABELS.closed,
      created_by: user.id,
      created_by_name: submitterName,
      created_at: new Date().toISOString(),
    });
    setClosingFlow(false);
    showToast("✓ Token submitted — lead marked closed, pending approval.");
    await load();
    onChanged();
  }
  async function load() {
    const { data: l } = await sb.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (!l) return;
    setLead(l);

    if (l.possible_duplicate_of) {
      const { data: d } = await sb
        .from("leads")
        .select("id,name,phone,lead_number,status,created_at,created_by_name")
        .eq("id", l.possible_duplicate_of)
        .maybeSingle();
      setDupLead(d || null);
    } else {
      setDupLead(null);
    }

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

  async function handBack() {
    if (!confirmHandBack) return setConfirmHandBack(true);
    const { error } = await sb.rpc("end_lead_transfer", { p_lead_id: leadId });
    setConfirmHandBack(false);
    if (error) return showToast(error.message);
    showToast("✓ Handed back to the owner.");
    onChanged();
    onClose();
  }

  async function saveNoteEdit() {
    if (!editingNote || !editingNote.text.trim()) return;
    const { error } = await sb.from("lead_notes").update({ note: editingNote.text.trim() }).eq("id", editingNote.id);
    if (error) return showToast(error.message);
    setEditingNote(null);
    showToast("✓ Note updated.");
    load();
  }

  async function dismissDuplicate() {
    await sb.from("leads").update({ possible_duplicate_of: null }).eq("id", leadId);
    setDupLead(null);
    showToast("✓ Marked as not a duplicate.");
  }

  async function handleDelete() {
    if (!window.confirm("Delete this lead? It'll be hidden from lists but can be recovered by an admin if needed.")) return;
    const submitterName = profile?.full_name || profile?.email || user.email;
    await sb
      .from("leads")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user.id, deleted_by_name: submitterName })
      .eq("id", leadId);
    showToast("Lead deleted.");
    onDeleted();
  }

  if (!leadId || !lead) return <Sheet open={!!leadId} onClose={onClose}>{null}</Sheet>;

  const hasLoanInfo = lead.occupation || lead.company_name || lead.monthly_salary || lead.loan_amount_required;
  const score = leadScore(lead);
  const step = journeyStep(lead.status);
  const suggestion = nextAction(lead, visit && visit.status === "scheduled" ? visit : null);
  const canTransferTop = lead.created_by === user.id || isAdmin;
  function openVisitScheduler() {
    const booked = visit && visit.status === "scheduled" ? visit : null;
    onScheduleVisit({ leadId, name: lead.name, phone: lead.phone, editId: booked ? booked.id : null, existing: booked });
  }
  function scrollToStage() {
    document.getElementById("lead-stage")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  // A real synthesis of what they're actually looking for, from real fields — not invented copy.
  const interestLine = [
    `${lead.property_type || "Property"}`,
    lead.preferred_location && `in ${lead.preferred_location}`,
    lead.budget && `around ₹${String(lead.budget).replace(/^₹/, "")}`,
  ].filter(Boolean).join(" ");

  return (
    <>
    <Sheet open={!!leadId} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A6620]">
            PC{lead.lead_number} · {SOURCE_LABELS[lead.source] || (lead.source === "manual" ? "Manual entry" : "Lead")}
          </div>
          <h1 className="mt-1.5 font-display text-[32px] font-medium leading-[1.04] tracking-tight text-ink break-words">{lead.name}</h1>
          <p className="mt-2 text-[13px] text-ink/60">
            {[lead.budget && `₹${String(lead.budget).replace(/^₹/, "")}`, lead.preferred_location, lead.phone].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="relative mt-1 h-[58px] w-[58px] shrink-0" role="img" aria-label={`Lead score ${score}`}>
          <svg viewBox="0 0 58 58" className="h-full w-full -rotate-90">
            <circle cx="29" cy="29" r="25" fill="none" stroke="#EADFCB" strokeWidth="5" />
            <circle cx="29" cy="29" r="25" fill="none" stroke="#B01F4F" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 157.1} 157.1`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-semibold text-ink">{score}</span>
        </div>
      </div>

      <div className="mt-5 mb-5 flex items-start justify-between gap-3 px-1">
        {[
          { key: "call", label: "Call", Icon: Phone, href: `tel:${lead.phone}`, primary: true, attrs: { "data-lead-id": lead.id, "data-lead-name": lead.name || "" } },
          { key: "wa", label: "WhatsApp", Icon: MessageCircle, href: `https://wa.me/${waNumberFor(lead.phone)}`, external: true },
          { key: "visit", label: "Visit", Icon: CalendarDays, onClick: openVisitScheduler },
          ...(canTransferTop ? [{ key: "share", label: "Share", Icon: Share2, onClick: () => setTransferOpen(true) }] : []),
        ].map((b) => {
          const cls = `flex h-[54px] w-[54px] items-center justify-center rounded-full transition-transform active:scale-90 ${b.primary ? "bg-crimson text-white shadow-[0_12px_22px_-10px_rgba(176,31,79,0.7)]" : "border border-[#E0D3BE] bg-[#FEFCFA] text-ink"}`;
          return (
            <div key={b.key} className="flex flex-1 flex-col items-center gap-1.5">
              {b.href ? (
                <a href={b.href} {...(b.external ? { target: "_blank", rel: "noreferrer" } : {})} {...(b.attrs || {})} aria-label={`${b.label} ${lead.name}`} className={cls}>
                  <b.Icon className="h-[19px] w-[19px]" />
                </a>
              ) : (
                <button onClick={b.onClick} aria-label={b.label} className={cls}><b.Icon className="h-[19px] w-[19px]" /></button>
              )}
              <span className="text-[11px] font-medium text-ink/60">{b.label}</span>
            </div>
          );
        })}
      </div>

      {lead && (() => {
        const isOwner = lead.created_by === user.id;
        const isAssignee = lead.assigned_to === user.id;
        const canTransfer = isOwner || isAdmin;
        if (isAssignee) {
          return (
            <div className="mb-3.5 rounded-[22px] border border-ochre/35 bg-ochre/10 p-4">
              <div className="flex items-start gap-3">
                <Share2 className="mt-0.5 h-[16px] w-[16px] shrink-0 text-[#7A5714]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug text-ink">Shared with you by {lead.created_by_name || "the owner"}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/60">{lead.created_by_name || "They"} stays the primary owner. You can both see all the notes, add notes and update this lead.</p>
                  <button onClick={handBack} className={`mt-2.5 min-h-[40px] rounded-full border px-3.5 text-[12px] font-semibold ${confirmHandBack ? "border-red-300 bg-red-500 text-white" : "border-ink/10 bg-white text-ink/65"}`}>
                    {confirmHandBack ? "Tap again to hand it back" : "Hand back to owner"}
                  </button>
                </div>
              </div>
            </div>
          );
        }
        if (lead.assigned_to) {
          return (
            <div className="mb-3.5 flex items-center gap-3 rounded-[22px] border border-ochre/35 bg-ochre/10 p-4">
              <Share2 className="h-[16px] w-[16px] shrink-0 text-[#7A5714]" />
              <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink/65">
                Owner <b className="font-semibold text-ink">{lead.created_by_name || "—"}</b> · shared with <b className="font-semibold text-ink">{lead.assigned_to_name}</b>
              </p>
              {canTransfer && (
                <button onClick={() => setTransferOpen(true)} className="min-h-[40px] shrink-0 rounded-full border border-ink/10 bg-white px-3.5 text-[12px] font-semibold text-ink/70">Change</button>
              )}
            </div>
          );
        }
        return canTransfer ? (
          <button onClick={() => setTransferOpen(true)} className="mb-3.5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[22px] border border-dashed border-ochre/50 bg-ochre/[0.06] text-[13.5px] font-semibold text-[#7A5714] active:scale-[0.99]">
            <Share2 className="h-4 w-4" /> Transfer to another associate
          </button>
        ) : null;
      })()}

      {dupLead && (
        <div className="mb-3.5 rounded-[22px] border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-[16px] w-[16px] shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-snug text-rose-700">Possible duplicate</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-rose-700/80">
                Same phone number as <span className="font-semibold">{dupLead.name}</span> (PC{dupLead.lead_number}), {STATUS_TEXT[dupLead.status] || dupLead.status} · added {new Date(dupLead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                {dupLead.created_by_name ? ` by ${dupLead.created_by_name}` : ""}.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  onClick={() => onOpenLead && onOpenLead(dupLead.id)}
                  className="rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-[11.5px] font-semibold text-rose-700 active:scale-95 transition-transform"
                >
                  View that lead
                </button>
                <button
                  onClick={dismissDuplicate}
                  className="rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-rose-700/70 active:scale-95 transition-transform"
                >
                  Not a duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journey */}
      <div className="rounded-[26px] border border-[#EADFCB] bg-[#FEFCFA] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] font-medium text-ink">Journey</h2>
          <span className="text-xs font-semibold text-crimson">{step ? `${step} of 5 · ${JOURNEY[step - 1]}` : "Lost"}</span>
        </div>
        <div className="mt-3.5 grid grid-cols-5 gap-1">
          {JOURNEY.map((j, i) => <span key={j} className={`h-[5px] rounded-full ${i < step ? "bg-crimson" : "bg-[#E7DCC8]"}`} />)}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-[10.5px] font-medium text-ink/45">
          {JOURNEY.map((j, i) => <span key={j} className={`text-center ${i === step - 1 ? "font-semibold text-ink" : ""}`}>{j}</span>)}
        </div>
        {suggestion && (
          <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-[#F7F0E1] p-3.5">
            <Lightbulb className="h-[18px] w-[18px] shrink-0 text-[#8A6620]" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A6620]">Suggested next step</div>
              <div className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{suggestion.reason}</div>
            </div>
            {suggestion.kind === "call" ? (
              <a href={`tel:${lead.phone}`} data-lead-id={lead.id} data-lead-name={lead.name || ""} className="shrink-0 rounded-full bg-crimson px-3.5 py-2.5 text-xs font-semibold text-white active:scale-95 transition-transform">{suggestion.label}</a>
            ) : (
              <button onClick={suggestion.kind === "visit" ? openVisitScheduler : scrollToStage} className="shrink-0 rounded-full bg-crimson px-3.5 py-2.5 text-xs font-semibold text-white active:scale-95 transition-transform">{suggestion.label}</button>
            )}
          </div>
        )}
      </div>

      {/* Owner + what they want */}
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-[#EADFCB] bg-[#FEFCFA] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">Owner</div>
          <div className="mt-1.5 truncate text-sm font-semibold text-ink">{lead.created_by_name || "—"}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-ink/50">
            {lead.assigned_to ? `Shared with ${lead.assigned_to_name || "colleague"}` : `Added ${new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`}
          </div>
        </div>
        <div className="rounded-[22px] border border-[#EADFCB] bg-[#FEFCFA] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">Looking for</div>
          <div className="mt-1.5 text-[13px] font-medium leading-snug text-ink">{interestLine}</div>
        </div>
      </div>

      <AiAssistPanel leadId={leadId} />

      {hasLoanInfo && (
        <div className="bg-stone-50/60 rounded-2xl p-4 mt-3.5 text-sm">
          <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35 mb-2">Loan Offer Details</div>
          <div className="grid grid-cols-2 gap-2">
            <div><strong>Occupation:</strong> {lead.occupation || "—"}</div>
            <div><strong>Company:</strong> {lead.company_name || "—"}</div>
            <div><strong>Salary:</strong> {lead.monthly_salary ? `₹${lead.monthly_salary}` : "—"}</div>
            <div><strong>Loan Amount:</strong> {lead.loan_amount_required ? `₹${lead.loan_amount_required}` : "—"}</div>
          </div>
        </div>
      )}

      {/* Next actions */}
      <div className="mt-5 grid gap-3">
        <ActionCard
          label="Site visit" Icon={CalendarDays} tint="bg-brass/10 text-brass"
          value={visit && visit.status === "scheduled" ? `${new Date(visit.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${visit.visit_time || "—"}${visit.listing_title ? ` · ${visit.listing_title}` : ""}` : "No visit scheduled."}
          cta={visit && visit.status === "scheduled" ? "Reschedule visit" : "Schedule visit"}
          onClick={() => onScheduleVisit({ leadId, name: lead.name, phone: lead.phone, editId: visit?.status === "scheduled" ? visit.id : null, existing: visit?.status === "scheduled" ? visit : null })}
        />
        <ActionCard
          label="Call" Icon={CalendarClock} tint="bg-jali-50 text-jali"
          value={call && call.status === "scheduled" ? `${new Date(call.call_datetime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · ${new Date(call.call_datetime).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "No call scheduled."}
          cta={call && call.status === "scheduled" ? "Reschedule call" : "Schedule call"}
          onClick={() => onScheduleCall({ leadId, name: lead.name, phone: lead.phone, editId: call?.status === "scheduled" ? call.id : null, existing: call?.status === "scheduled" ? call : null })}
        />
      </div>

      {/* Stage */}
      <div className="mt-6" id="lead-stage">
        <h2 className="font-display text-[19px] font-medium text-ink">Stage</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(STATUS_TEXT).map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s === "closed" && lead.status !== "closed") {
                  setClosingFlow(true);
                } else {
                  setClosingFlow(false);
                  updateStatus(s);
                }
              }}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 ${lead.status === s ? `${STATUS_TONE[s]} shadow-soft` : "border border-ink/10 text-ink/50"}`}
            >
              {STATUS_TEXT[s]}
            </button>
          ))}
        </div>

        {closingFlow && (
          <CloseDealPanel
            lead={lead}
            onClosed={handleDealClosed}
            onSkip={() => { setClosingFlow(false); updateStatus("closed"); }}
            onCancel={() => setClosingFlow(false)}
          />
        )}
      </div>

      {/* Activity timeline */}
      <div className="mt-6">
        <h2 className="font-display text-[19px] font-medium text-ink">Activity</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {NOTE_TEMPLATES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setNoteInput((prev) => (prev.trim() ? prev.trim() + "\n" + t : t))}
              className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[11px] font-medium text-ink/60 active:scale-95 transition-transform"
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-end gap-2.5">
          <textarea
            rows={3}
            className="field-input flex-1 min-h-[92px] resize-none"
            placeholder="Add a note about the conversation…"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote(); }}
          />
          <button onClick={addNote} aria-label="Add note" className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-2xl bg-stone-600 text-sand shadow-lift active:scale-95 transition-transform">
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2.5">
          <VoiceMic onText={(chunk) => setNoteInput((prev) => appendSpoken(prev, chunk))} />
        </div>

        {timeline.length === 0 ? (
          <div className="text-sm text-ink/40 py-4">No activity yet. Add a note above.</div>
        ) : (
          <ol className="mt-4 space-y-4">
            {timeline.map((n, i) => {
              const d = new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
              return (
                <li key={i} className="relative flex gap-3">
                  <span className="mt-1.5 flex flex-col items-center">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-stone-600 ring-4 ring-stone-50" />
                    {i < timeline.length - 1 && <span className="mt-1 w-[2px] flex-1 rounded-full bg-ink/10" />}
                  </span>
                  <span className="min-w-0 flex-1 rounded-2xl border border-ink/[0.06] bg-white p-3.5 shadow-soft">
                    {n.status_change && <span className="block text-xs font-semibold text-stone-600 mb-0.5">Status → {n.status_change}</span>}
                    {editingNote && editingNote.id === n.id ? (
                      <span className="block space-y-2">
                        <textarea className="field-input min-h-[72px]" value={editingNote.text} onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })} />
                        <span className="flex gap-2">
                          <button onClick={saveNoteEdit} className="min-h-[40px] rounded-full bg-crimson px-4 text-[12.5px] font-semibold text-white">Save</button>
                          <button onClick={() => setEditingNote(null)} className="min-h-[40px] rounded-full border border-ink/10 px-4 text-[12.5px] font-medium text-ink/60">Cancel</button>
                        </span>
                      </span>
                    ) : (
                      <span className="block text-sm text-ink leading-relaxed">{n.note}</span>
                    )}
                    <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                      <UserRound className="h-3 w-3" />
                      {n.created_by_name} · {d}
                      {n.id && n.created_by === user.id && !n.status_change && !/^(Shared with|Sharing with) /.test(n.note || "") && !(editingNote && editingNote.id === n.id) && (
                        <button onClick={() => setEditingNote({ id: n.id, text: n.note })} className="ml-auto inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide text-stone-600 normal-case">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={() => onEdit(leadId)} className="rounded-2xl border border-ink/10 text-ink/70 text-sm font-semibold py-3.5 active:scale-95 transition-transform">Edit Lead</button>
        <button onClick={handleDelete} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold py-3.5 active:scale-95 transition-transform">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </Sheet>
    <TransferLeadSheet open={transferOpen} lead={lead} onClose={() => setTransferOpen(false)} onDone={() => { setTransferOpen(false); load(); onChanged(); }} />
    </>
  );
}

function ActionCard({ label, value, cta, Icon, tint, onClick }) {
  return (
    <div className="rounded-[22px] border border-ink/[0.06] bg-white p-4 shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tint}`}><Icon className="h-[15px] w-[15px]" /></span>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink/40">{label}</span>
      </div>
      <p className="mt-2.5 text-sm font-medium leading-tight text-ink">{value}</p>
      <button onClick={onClick} className="mt-3 rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-semibold text-stone-600 active:scale-95 transition-transform">
        {cta}
      </button>
    </div>
  );
}
