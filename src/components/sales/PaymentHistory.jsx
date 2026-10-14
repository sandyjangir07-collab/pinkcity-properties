import { formatINR, formatDate } from "../../lib/utils";
import { plotLabel } from "../../lib/sales";

// Read-only payment history for a sale, plot by plot. Used on the associate's
// Home card and profile so they can see what has been received on each plot.
export default function PaymentHistory({ sale }) {
  const anyPayments = sale.plots.some((p) => (p.payments || []).length > 0);
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
      {!anyPayments && <div className="text-[12px] text-ink/45">No payments recorded yet.</div>}
      {sale.plots.map((p, i) => (
        <div key={p.rowId || i}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-semibold text-ink">{plotLabel(p)}</span>
            <span className="shrink-0 text-[12px] font-bold text-violet-700">{formatINR(p.received || 0)} received</span>
          </div>
          {(p.payments || []).map((pay) => (
            <div key={pay.id} className="mt-1 flex items-baseline justify-between gap-3 text-[11.5px] text-ink/55">
              <span>
                {formatDate(pay.received_on)}
                {pay.note ? ` · ${pay.note}` : ""}
              </span>
              <span className="shrink-0 font-medium text-ink/70">{formatINR(pay.amount)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
