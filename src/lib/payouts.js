// Commission earned (from approved sales) vs commission actually paid out.
const pad = (n) => String(n).padStart(2, "0");

export function summarize(deals, payouts) {
  const earned = (deals || []).reduce((s, d) => s + (Number(d.commission_amount) || 0), 0);
  const paid = (payouts || []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return { earned, paid, due: earned - paid };
}

export function monthKeyOfTimestamp(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export const monthKeyOfDate = (dateStr) => String(dateStr).slice(0, 7);

export function monthLabel(key) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Month-by-month: earned that month, paid that month, and what was still owed at month end.
export function statement(deals, payouts) {
  const map = new Map();
  const row = (k) => {
    if (!map.has(k)) map.set(k, { key: k, earned: 0, paid: 0 });
    return map.get(k);
  };
  for (const d of deals || []) if (d.reviewed_at) row(monthKeyOfTimestamp(d.reviewed_at)).earned += Number(d.commission_amount) || 0;
  for (const p of payouts || []) row(monthKeyOfDate(p.paid_on)).paid += Number(p.amount) || 0;
  const asc = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  let running = 0;
  for (const r of asc) {
    running += r.earned - r.paid;
    r.balance = running;
  }
  return asc.reverse();
}
