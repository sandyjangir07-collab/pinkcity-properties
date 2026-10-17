import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatINR, formatDate } from "../../lib/utils";
import { summarize, statement, monthLabel } from "../../lib/payouts";
import { Sheet, SheetHeader } from "../ui/Sheet";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const MODES = ["Cash", "UPI", "Bank transfer", "Cheque"];

// Admin: record what you've paid an associate, see the balance, and read the
// month-by-month statement.
export default function PayoutSheet({ open, row, onClose, onChanged }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const due = row ? row.due : 0;
  useEffect(() => {
    if (open) {
      setAmount(due > 0 ? String(due) : "");
      setDate(todayLocal());
      setNote("");
      setConfirmId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  if (!row) return <Sheet open={false} onClose={onClose} />;
  const { paid, earned } = summarize(row.deals, row.payouts);
  const over = Number(amount) > Math.max(due, 0) && Number(amount) > 0;
  const months = statement(row.deals, row.payouts);

  async function pay() {
    if (!(Number(amount) > 0)) return;
    setBusy(true);
    const { error } = await sb.rpc("admin_add_commission_payout", {
      p_employee_id: row.id,
      p_amount: Number(amount),
      p_paid_on: date || null,
      p_note: note || null,
      p_admin_name: profile?.full_name || profile?.email || user?.email || "Admin",
    });
    setBusy(false);
    if (error) return showToast(error.message);
    showToast("✓ Payout recorded. The associate has been notified.");
    onChanged();
  }

  async function remove(id) {
    if (confirmId !== id) return setConfirmId(id);
    const { error } = await sb.rpc("admin_delete_commission_payout", { p_id: id });
    setConfirmId(null);
    if (error) return showToast(error.message);
    showToast("✓ Payout deleted.");
    onChanged();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title={row.name} sub="Commission paid vs still due" />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-stone-500 to-stone-700 p-3 text-white"><div className="font-display text-[17px] font-semibold leading-tight">{formatINR(earned)}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">Earned</div></div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-3 text-white"><div className="font-display text-[17px] font-semibold leading-tight">{formatINR(paid)}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/70">Paid</div></div>
        <div className={`rounded-2xl p-3 text-white ${due > 0 ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}><div className="font-display text-[17px] font-semibold leading-tight">{formatINR(Math.abs(due))}</div><div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/75">{due < 0 ? "Advance" : "Still due"}</div></div>
      </div>

      <div className="mt-4 space-y-2.5 rounded-2xl border border-ink/10 bg-white p-3.5">
        <div className="text-[13px] font-semibold text-ink">Record a payout</div>
        <div className="grid grid-cols-2 gap-2.5">
          <input className="field-input" type="number" inputMode="decimal" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="field-input" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </div>
        <input className="field-input" placeholder="Note (optional) — mode, reference…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button key={m} type="button" onClick={() => setNote(m)} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-medium ${note === m ? "border-stone-600 bg-stone-50 text-stone-700" : "border-ink/10 text-ink/50"}`}>{m}</button>
          ))}
        </div>
        {over && <p className="text-[12px] text-amber-700">This is more than the {formatINR(Math.max(due, 0))} currently due. It will be recorded as an advance.</p>}
        <button onClick={pay} disabled={busy || !(Number(amount) > 0)} className="min-h-[48px] w-full rounded-full bg-emerald-600 text-[14px] font-semibold text-white disabled:opacity-40">
          {busy ? "Saving…" : "Save payout"}
        </button>
      </div>

      {row.payouts.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Payouts made</div>
          <div className="divide-y divide-ink/[0.06] rounded-2xl border border-ink/[0.06] bg-surface px-3.5">
            {row.payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 text-[12.5px] text-ink/60"><span className="font-medium text-ink/80">{formatDate(p.paid_on)}</span>{p.note ? ` · ${p.note}` : ""}</div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-semibold text-ink">{formatINR(p.amount)}</span>
                  <button onClick={() => remove(p.id)} aria-label="Delete payout" className={`flex h-7 items-center justify-center rounded-full text-[10.5px] font-semibold ${confirmId === p.id ? "bg-red-500 px-2.5 text-white" : "w-7 text-ink/35 hover:text-red-500"}`}>
                    {confirmId === p.id ? "Delete?" : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {months.length > 0 && (
        <div className="mt-4">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Month by month</div>
          <div className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-surface text-[12px]">
            <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 bg-stone-50 px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink/40">
              <span>Month</span><span className="text-right">Earned</span><span className="text-right">Paid</span><span className="text-right">Due</span>
            </div>
            {months.map((m) => (
              <div key={m.key} className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 border-t border-ink/[0.05] px-3.5 py-2">
                <span className="font-medium text-ink/80">{monthLabel(m.key)}</span>
                <span className="text-right text-ink/70">{formatINR(m.earned)}</span>
                <span className="text-right text-emerald-700">{formatINR(m.paid)}</span>
                <span className={`text-right font-semibold ${m.balance > 0 ? "text-amber-700" : "text-ink/50"}`}>{formatINR(Math.abs(m.balance))}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink/35">"Due" is what was still owed at the end of that month.</p>
        </div>
      )}
    </Sheet>
  );
}
