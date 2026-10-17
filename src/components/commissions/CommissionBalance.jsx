import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { formatINR, formatDate } from "../../lib/utils";
import { summarize } from "../../lib/payouts";

// Read-only for the associate (and for admin viewing a profile): commission
// earned, paid and still due, plus the payout history.
export default function CommissionBalance({ employeeId, earned, monthEarned }) {
  const [payouts, setPayouts] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    sb.from("commission_payouts")
      .select("id,amount,paid_on,note")
      .eq("employee_id", employeeId)
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => !cancelled && setPayouts(data || []));
    return () => {
      cancelled = true;
    };
  }, [employeeId, earned]);

  if (payouts === null) return null;
  const { paid, due } = summarize([{ commission_amount: earned }], payouts);
  const advance = due < 0;

  return (
    <div className="mt-3">
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="font-display text-[18px] font-semibold leading-tight text-ink">{formatINR(earned)}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Earned</div>
        </div>
        <div className="rounded-[20px] border border-stone-200 bg-stone-50 p-3.5">
          <div className="font-display text-[18px] font-semibold leading-tight text-ink">{formatINR(paid)}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Paid to you</div>
        </div>
        <div className={`rounded-[20px] border p-3.5 ${due > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50/60"}`}>
          <div className={`font-display text-[18px] font-semibold leading-tight ${due > 0 ? "text-amber-800" : "text-ink"}`}>{formatINR(Math.abs(due))}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">{advance ? "Advance paid" : "Still due"}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px]">
        <span className="font-medium text-emerald-700">{formatINR(monthEarned || 0)} earned this month</span>
        {payouts.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className="min-h-[36px] font-semibold text-stone-600">
            {open ? "Hide payouts ▴" : `Payout history (${payouts.length}) ▾`}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-1 divide-y divide-ink/[0.06] rounded-2xl border border-ink/[0.06] bg-surface px-4">
          {payouts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]">
              <span className="text-ink/60">
                <span className="font-medium text-ink/80">{formatDate(p.paid_on)}</span>
                {p.note ? ` · ${p.note}` : ""}
              </span>
              <span className="shrink-0 font-semibold text-ink">{formatINR(p.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
