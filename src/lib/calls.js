import { sb } from "./supabase";

// A "call" is one tap on a lead's Call button. The server keeps the count (one row per call,
// repeat taps on the same lead within 2 minutes count once) and the day is the Indian day.
// Daily goal for every associate. (The reminders in the database use the same number.)
export const DAILY_CALL_TARGET = 50;

export const CALLS_EVENT = "pc:calls-changed";
export const NOTES_EVENT = "pc:call-note-logged";

export const OUTCOMES = {
  interested: { label: "Interested", tone: "green" },
  call_back: { label: "Call back", tone: "yellow" },
  not_interested: { label: "Not interested", tone: "red" },
  no_answer: { label: "No answer", tone: "neutral" },
  other: { label: "Noted", tone: "stone" },
};

export function notifyCallsChanged() {
  window.dispatchEvent(new Event(CALLS_EVENT));
}

// "2026-11-27" for the Indian calendar day of a moment (default: now).
export function istDate(d = new Date()) {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}
export function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function dayLabel(iso, today = istDate()) {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export async function logCall(leadId) {
  try {
    const { data, error } = await sb.rpc("log_call", { p_lead_id: leadId || null });
    if (error) throw error;
    notifyCallsChanged();
    return data;
  } catch (e) {
    console.error("Call log failed:", e);
    return null;
  }
}

export async function setCallOutcome(callId, outcome) {
  if (!callId || !outcome) return;
  try {
    const { error } = await sb.rpc("set_call_outcome", { p_call_id: callId, p_outcome: outcome });
    if (error) throw error;
    notifyCallsChanged();
  } catch (e) {
    console.error("Call outcome save failed:", e);
  }
}

// Rows of { user_id, user_name, call_date, calls, leads_called, spoke, no_answer, logged }.
// Admin gets everyone; anyone else gets only their own.
export async function fetchCallStats(from, to) {
  const { data, error } = await sb.rpc("call_stats", { p_from: from, p_to: to });
  if (error) throw error;
  return data || [];
}

export async function fetchCallsOn(date, userId) {
  const { data, error } = await sb
    .from("call_logs")
    .select("id,user_id,lead_id,lead_name,called_at,outcome")
    .eq("user_id", userId)
    .eq("call_date", date)
    .order("called_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data || [];
}

export function sumStats(rows) {
  return rows.reduce(
    (a, r) => ({ calls: a.calls + r.calls, spoke: a.spoke + r.spoke, no_answer: a.no_answer + r.no_answer, logged: a.logged + r.logged, leads: a.leads + r.leads_called }),
    { calls: 0, spoke: 0, no_answer: 0, logged: 0, leads: 0 }
  );
}
