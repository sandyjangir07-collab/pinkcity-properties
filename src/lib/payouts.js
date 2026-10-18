// Commission earned (from approved sales) vs commission actually paid out.
const pad = (n) => String(n).padStart(2, "0");

// Paid = payouts you recorded, except any the associate says they did NOT receive.
// `awaiting` = recorded but not yet confirmed; `disputed` = reported as not received.
export function summarize(deals, payouts) {
  const earned = (deals || []).reduce((s, d) => s + (Number(d.commission_amount) || 0), 0);
  let paid = 0;
  let awaiting = 0;
  let disputed = 0;
  for (const p of payouts || []) {
    const a = Number(p.amount) || 0;
    const st = p.status || "pending";
    if (st === "disputed") disputed += a;
    else {
      paid += a;
      if (st === "pending") awaiting += a;
    }
  }
  return { earned, paid, due: earned - paid, awaiting, disputed };
}

export const PAYOUT_STATUS = {
  pending: { label: "Awaiting confirmation", cls: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800" },
  disputed: { label: "Not received", cls: "bg-red-100 text-red-700" },
};

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
  for (const p of payouts || []) if (p.status !== "disputed") row(monthKeyOfDate(p.paid_on)).paid += Number(p.amount) || 0;
  const asc = [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  let running = 0;
  for (const r of asc) {
    running += r.earned - r.paid;
    r.balance = running;
  }
  return asc.reverse();
}
