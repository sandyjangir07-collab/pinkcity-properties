import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { formatINR, formatDate, fitFont } from "../../lib/utils";
import { summarize, PAYOUT_STATUS } from "../../lib/payouts";

// Commission earned, paid and still due, plus the payout history. When the
// viewer is the associate themselves (`canConfirm`), every payout the admin has
// recorded asks "Did you receive this?" until they answer.
export default function CommissionBalance({ employeeId, earned, monthEarned, canConfirm }) {
  const showToast = useToast();
  const [payouts, setPayouts] = useState(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [disputeId, setDisputeId] = useState(null);
  const [note, setNote] = useState("");

  async function load() {
    const { data } = await sb
      .from("commission_payouts")
      .select("id,amount,paid_on,note,status,responded_at,response_note")
      .eq("employee_id", employeeId)
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false });
    setPayouts(data || []);
  }

  useEffect(() => {
    if (!employeeId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, earned]);

  async function respond(id, received) {
    if (!received && !note.trim()) return;
    setBusyId(id);
    const { error } = await sb.rpc("respond_commission_payout", { p_id: id, p_received: received, p_note: received ? null : note });
    setBusyId(null);
    if (error) return showToast(error.message);
    showToast(received ? "✓ Thanks, confirmed." : "✓ Sent to the admin.");
    setDisputeId(null);
    setNote("");
    load();
  }

  if (payouts === null) return null;
  const { paid, due, awaiting, disputed } = summarize([{ commission_amount: earned }], payouts);
  const advance = due < 0;
  const toAnswer = canConfirm ? payouts.filter((p) => p.status !== "confirmed") : [];
  const tileNum = (v) => ({ fontSize: fitFont(formatINR(v), 18, 7) });

  return (
    <div className="mt-3">
      {toAnswer.map((p) => (
        <div key={p.id} className={`mb-3 rounded-[22px] border p-4 ${p.status === "disputed" ? "border-red-200 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
          <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${p.status === "disputed" ? "text-red-700" : "text-amber-800"}`}>
            {p.status === "disputed" ? "You reported this as not received" : "Please confirm"}
          </div>
          <div className="mt-1 text-[15px] font-semibold text-ink">
            {formatINR(p.amount)} paid on {formatDate(p.paid_on)}
            {p.note ? ` · ${p.note}` : ""}
          </div>
          {p.status === "disputed" && p.response_note && <div className="mt-0.5 text-[12.5px] text-red-700/80">"{p.response_note}"</div>}
          <div className="mt-0.5 text-[12.5px] text-ink/55">{p.status === "disputed" ? "Did it reach you after all?" : "Did this reach you?"}</div>

          {disputeId === p.id ? (
            <div className="mt-3 space-y-2.5">
              <textarea className="field-input min-h-[80px]" placeholder="What went wrong? e.g. Only ₹1,00,000 reached me" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => respond(p.id, false)} disabled={busyId === p.id || !note.trim()} className="min-h-[46px] flex-1 rounded-full bg-red-600 text-[13.5px] font-semibold text-white disabled:opacity-40">
                  {busyId === p.id ? "Sending…" : "Send to admin"}
                </button>
                <button onClick={() => { setDisputeId(null); setNote(""); }} className="min-h-[46px] rounded-full border border-ink/10 bg-white px-5 text-[13.5px] font-medium text-ink/60">Back</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button onClick={() => respond(p.id, true)} disabled={busyId === p.id} className="min-h-[46px] flex-[1.4] rounded-full bg-emerald-600 text-[13.5px] font-semibold text-white active:scale-[0.98] disabled:opacity-50">
                {busyId === p.id ? "Saving…" : "Yes, I received it"}
              </button>
              {p.status !== "disputed" && (
                <button onClick={() => { setDisputeId(p.id); setNote(""); }} className="min-h-[46px] flex-1 rounded-full border border-red-200 bg-white text-[13.5px] font-semibold text-red-600">
                  Not received
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="whitespace-nowrap font-display font-semibold leading-tight text-ink" style={tileNum(earned)}>{formatINR(earned)}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Earned</div>
        </div>
        <div className="rounded-[20px] border border-stone-200 bg-stone-50 p-3.5">
          <div className="whitespace-nowrap font-display font-semibold leading-tight text-ink" style={tileNum(paid)}>{formatINR(paid)}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Paid to you</div>
        </div>
        <div className={`rounded-[20px] border p-3.5 ${due > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50/60"}`}>
          <div className={`whitespace-nowrap font-display font-semibold leading-tight ${due > 0 ? "text-amber-800" : "text-ink"}`} style={tileNum(Math.abs(due))}>{formatINR(Math.abs(due))}</div>
          <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">{advance ? "Advance paid" : "Still due"}</div>
        </div>
      </div>

      {(awaiting > 0 || disputed > 0) && (
        <div className="mt-2 space-y-0.5 text-[12px]">
          {awaiting > 0 && !canConfirm && <div className="text-amber-700">{formatINR(awaiting)} paid, awaiting confirmation</div>}
          {disputed > 0 && <div className="text-red-600">{formatINR(disputed)} reported as not received (not counted as paid)</div>}
        </div>
      )}

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
          {payouts.map((p) => {
            const st = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.pending;
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]">
                <span className="min-w-0 text-ink/60">
                  <span className="font-medium text-ink/80">{formatDate(p.paid_on)}</span>
                  {p.note ? ` · ${p.note}` : ""}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-ink">{formatINR(p.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
