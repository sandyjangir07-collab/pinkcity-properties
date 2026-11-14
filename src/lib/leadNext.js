// "What needs you now": plain rules that turn a lead's stage, age and visit into one suggested
// next step. No AI here: every line is computed from fields the lead already has.
import { SOURCE_LABELS } from "./leadConstants";

export const JOURNEY = ["New", "Contacted", "Visit", "Token", "Closed"];
export const HOT_SCORE = 70;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// How far along the 5-step journey a lead is (0 = lost, no bar).
export function journeyStep(status) {
  return { new: 1, contacted: 2, visit_scheduled: 3, visit_done: 3, negotiating: 4, closed: 5 }[status] || 0;
}
export function isOpenLead(lead) {
  return lead.status !== "closed" && lead.status !== "lost";
}
export function isHot(lead, score) {
  return isOpenLead(lead) && score >= HOT_SCORE;
}

function daysSince(dateStr, now) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((now - new Date(dateStr).getTime()) / DAY));
}
function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
function visitLabel(visit) {
  if (!visit?.visit_date) return "";
  const d = new Date(visit.visit_date + "T00:00:00");
  const day = d.toLocaleDateString("en-IN", { weekday: "short" });
  return `${day}${visit.visit_time ? ` ${visit.visit_time}` : ""}`;
}
export { visitLabel };

// Returns { key, kind, label, reason, urgency } or null for closed / lost leads.
//   kind: "call" (dial them), "visit" (open the visit scheduler), "open" (open the lead)
//   urgency: 0-100, used to order the "Call next" queue (50 and above is queue-worthy)
export function nextAction(lead, visit, now = Date.now()) {
  if (!isOpenLead(lead)) return null;
  const quiet = daysSince(lead.updated_at || lead.created_at, now);

  if (lead.status === "new") {
    const ageMs = now - new Date(lead.created_at).getTime();
    const src = SOURCE_LABELS[lead.source];
    const prefix = src && lead.source !== "manual" ? `New ${src.toLowerCase()} enquiry` : "New lead";
    const days = Math.floor(ageMs / DAY);
    let reason;
    if (ageMs < HOUR) reason = `${prefix}, just now`;
    else if (ageMs < DAY) reason = `${prefix}, ${Math.floor(ageMs / HOUR)}h ago`;
    else reason = `${prefix}, not contacted for ${plural(days, "day")}`;
    return { key: "new", kind: "call", label: "Call now", reason, urgency: 90 + Math.min(days, 5) * 2 };
  }

  if (lead.status === "visit_scheduled") {
    if (!visit?.visit_date) {
      return { key: "schedule", kind: "visit", label: "Schedule visit", reason: "Marked as visit scheduled, but no date is set", urgency: 55 };
    }
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const vDay = new Date(visit.visit_date + "T00:00:00");
    const diff = Math.round((vDay.getTime() - today.getTime()) / DAY);
    if (diff < 0) {
      return { key: "overdue_visit", kind: "open", label: "Update visit", reason: `Visit was on ${visitLabel(visit)}. Record how it went`, urgency: 88 };
    }
    if (diff <= 1) {
      return { key: "confirm", kind: "call", label: "Confirm visit", reason: `Visit ${diff === 0 ? "today" : "tomorrow"}, ${visitLabel(visit)}. Confirm with them`, urgency: diff === 0 ? 85 : 80 };
    }
    return { key: "waiting", kind: "open", label: "View", reason: `Visit ${visitLabel(visit)}`, urgency: 20 };
  }

  if (lead.status === "contacted") {
    if (quiet >= 3) {
      return { key: "reengage", kind: "call", label: "Re-engage", reason: `Quiet for ${plural(quiet, "day")}`, urgency: 60 + Math.min(quiet, 10) * 2 };
    }
    return { key: "schedule", kind: "visit", label: "Schedule visit", reason: "Spoke recently. Suggest a site visit", urgency: 45 };
  }

  if (lead.status === "visit_done") {
    if (quiet >= 2) {
      return { key: "followup", kind: "call", label: "Follow up", reason: `Quiet for ${plural(quiet, "day")} after the site visit`, urgency: 62 + Math.min(quiet, 10) * 2 };
    }
    return { key: "followup", kind: "call", label: "Ask how it went", reason: "Visited recently. Ask how it felt", urgency: 55 };
  }

  if (lead.status === "negotiating") {
    if (quiet >= 2) {
      return { key: "closeout", kind: "call", label: "Push to close", reason: `Negotiation quiet for ${plural(quiet, "day")}`, urgency: 76 + Math.min(quiet, 10) };
    }
    return { key: "closeout", kind: "call", label: "Keep momentum", reason: "In negotiation. Keep the conversation going", urgency: 56 };
  }

  return null;
}

// The follow-up bucket: leads that have gone quiet or need their next touch.
export function needsFollowUp(action) {
  return !!action && ["reengage", "followup", "closeout", "overdue_visit"].includes(action.key);
}

// The "Call next" queue: most urgent first, skipping snoozed leads.
export function buildQueue(leads, visits, snoozed, now = Date.now(), limit = 4) {
  return leads
    .map((l) => ({ lead: l, action: nextAction(l, visits[l.id], now) }))
    .filter((x) => x.action && x.action.urgency >= 50 && !(snoozed[x.lead.id] > now))
    .sort((a, b) => b.action.urgency - a.action.urgency || (b.lead._score || 0) - (a.lead._score || 0))
    .slice(0, limit);
}

// "Later" brings a lead back at 9 AM the next morning.
export function tomorrowMorning(now = Date.now()) {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}
