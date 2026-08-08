import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { STATUS_LABELS, STATUS_TEXT } from "../../lib/leadConstants";
import { leadScore } from "../../lib/leadScore";
import { Phone, MapPin, IndianRupee, CalendarDays, CalendarClock, Send, UserRound, Trash2, Sparkles } from "lucide-react";
import { Sheet } from "../ui/Sheet";

const STATUS_TONE = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  visit_scheduled: "bg-orange-100 text-orange-700",
  visit_done: "bg-purple-100 text-purple-700",
  negotiating: "bg-red-100 text-red-700",
  closed: "bg-emerald-100 text-emerald-700",
  lost: "bg-ink/[0.08] text-ink/50",
};

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
  const tone = STATUS_TONE[lead.status] || STATUS_TONE.new;
  // A real synthesis of what they're actually looking for, from real fields — not invented copy.
  const interestLine = [
    lead.property_type && `Looking for a ${lead.property_type.toLowerCase()}`,
    lead.preferred_location && `in ${lead.preferred_location}`,
    lead.budget && `around ₹${lead.budget}`,
  ].filter(Boolean).join(" ") || "No specific preferences recorded yet.";

  return (
    <Sheet open={!!leadId} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-3.5 mb-5">
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-stone-50 font-display text-lg font-semibold text-stone-600">
          {(lead.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[21px] font-semibold leading-tight text-ink truncate">{lead.name}</h1>
          <p className="mt-1 text-xs font-medium text-ink/45">
            PC{lead.lead_number} · {lead.created_by_name || "—"} · Added {new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      {/* Score card */}
      <div className="rounded-[26px] border border-ink/[0.06] bg-white p-5 shadow-soft">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-ink/40">Lead score</div>
            <div className="mt-1 font-display text-3xl font-semibold leading-none text-ink">
              {score}<span className="text-sm text-ink/40">/100</span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {STATUS_TEXT[lead.status] || lead.status}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
          <div className="h-full rounded-full bg-stone-600 transition-[width] duration-500" style={{ width: `${score}%` }} />
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { Icon: Phone, label: "Mobile", v: lead.phone || "—", tint: "bg-emerald-50 text-emerald-600" },
            { Icon: IndianRupee, label: "Budget", v: lead.budget || "—", tint: "bg-brass/10 text-brass" },
            { Icon: MapPin, label: "Locality", v: lead.preferred_location || "—", tint: "bg-jali-50 text-jali" },
          ].map((s) => (
            <div key={s.label} className="rounded-[18px] border border-ink/[0.06] bg-stone-50/50 p-3">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${s.tint}`}><s.Icon className="h-3.5 w-3.5" /></span>
              <div className="mt-2 truncate text-xs font-semibold text-ink">{s.v}</div>
              <div className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-ink/40">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interest callout */}
      <div className="mt-3.5 flex items-start gap-3 rounded-[22px] border border-stone-200 bg-stone-50 p-4">
        <Sparkles className="mt-0.5 h-[16px] w-[16px] shrink-0 text-stone-600" />
        <p className="text-[13px] font-medium leading-relaxed text-stone-700">{interestLine}</p>
      </div>

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
      <div className="mt-6">
        <h2 className="font-display text-[19px] font-medium text-ink">Stage</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.keys(STATUS_TEXT).map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className={`rounded-full px-4 py-2.5 text-xs font-semibold transition-all active:scale-95 ${lead.status === s ? `${STATUS_TONE[s]} shadow-soft` : "border border-ink/10 text-ink/50"}`}
            >
              {STATUS_TEXT[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Activity timeline */}
      <div className="mt-6">
        <h2 className="font-display text-[19px] font-medium text-ink">Activity</h2>
        <div className="mt-3 flex items-center gap-2.5">
          <input className="field-input flex-1" placeholder="Add a note…" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
          <button onClick={addNote} aria-label="Add note" className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-stone-600 text-sand shadow-lift active:scale-95 transition-transform">
            <Send className="h-4 w-4" />
          </button>
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
                    <span className="block text-sm text-ink leading-relaxed">{n.note}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/35">
                      <UserRound className="h-3 w-3" />
                      {n.created_by_name} · {d}
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
