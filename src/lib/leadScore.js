const SOURCE_SCORE = {
  visit_form: 35,
  loan_calculator: 35,
  referral: 28,
  whatsapp: 22,
  consultation: 22,
  manual: 12,
};

const STATUS_SCORE = {
  new: 8,
  contacted: 15,
  visit_scheduled: 26,
  visit_done: 30,
  negotiating: 32,
  closed: 40,
  lost: 0,
};

export function leadScore(lead) {
  const sourcePts = SOURCE_SCORE[lead.source] ?? 12;
  const statusPts = STATUS_SCORE[lead.status] ?? 8;
  const lastTouch = lead.updated_at || lead.created_at;
  const days = lastTouch ? (Date.now() - new Date(lastTouch).getTime()) / (24 * 60 * 60 * 1000) : 999;
  const recencyPts = days <= 3 ? 28 : days <= 7 ? 20 : days <= 14 ? 10 : days <= 30 ? 4 : 0;
  return Math.max(0, Math.min(100, Math.round(sourcePts + statusPts + recencyPts)));
}
