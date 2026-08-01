export const STATUS_LABELS = {
  new: "🔵 New",
  contacted: "🟡 Contacted",
  visit_scheduled: "🟠 Visit Sched.",
  visit_done: "🟣 Visit Done",
  negotiating: "🔴 Negotiating",
  closed: "🟢 Closed",
  lost: "⚫ Lost",
};
export const STATUS_TEXT = {
  new: "New",
  contacted: "Contacted",
  visit_scheduled: "Visit Sched.",
  visit_done: "Visit Done",
  negotiating: "Negotiating",
  closed: "Closed",
  lost: "Lost",
};
export const STATUS_DOT = {
  new: "#3b82f6",
  contacted: "#eab308",
  visit_scheduled: "#f97316",
  visit_done: "#a855f7",
  negotiating: "#ef4444",
  closed: "#22c55e",
  lost: "#1a1414",
};
export const SOURCE_LABELS = {
  whatsapp: "WhatsApp",
  visit_form: "Visit Form",
  consultation: "Consultation",
  manual: "Manual",
  referral: "Referral",
  loan_calculator: "Loan Offer",
};

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return days + "d ago";
  return Math.floor(days / 30) + "mo ago";
}

export function isStaleLead(lead) {
  return (
    ["contacted", "visit_scheduled", "visit_done", "negotiating"].includes(lead.status) &&
    lead.updated_at &&
    Date.now() - new Date(lead.updated_at).getTime() > 3 * 24 * 60 * 60 * 1000
  );
}

export function waNumberFor(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 10 ? "91" + digits : digits;
}
