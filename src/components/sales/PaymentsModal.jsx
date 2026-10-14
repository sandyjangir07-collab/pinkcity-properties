import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { formatINR, formatDate } from "../../lib/utils";
import { plotLabel } from "../../lib/sales";
import { Sheet, SheetHeader } from "../ui/Sheet";

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MODES = ["Cash", "UPI", "Cheque", "Bank transfer"];

// One plot: its payments so far, and a small form to add the next one.
function PlotPayments({ plot, onChanged, startOpen }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [open, setOpen] = useState(startOpen);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  async function add() {
    if (!(Number(amount) > 0)) return;
    setBusy(true);
    const { error } = await sb.rpc("admin_add_payment", {
      p_row_id: plot.rowId,
      p_amount: Number(amount),
      p_received_on: date || null,
      p_note: note || null,
      p_admin_name: profile?.full_name || profile?.email || user?.email || "Admin",
    });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    setAmount("");
    setNote("");
    setDate(todayLocal());
    showToast("✓ Payment recorded.");
    onChanged();
  }

  async function remove(id) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    const { error } = await sb.rpc("admin_delete_payment", { p_payment_id: id });
    setConfirmId(null);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("✓ Payment deleted.");
    onChanged();
  }

  const payments = plot.payments || [];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">{plotLabel(plot)}</div>
          {plot.saleAmount != null && <div className="text-[11px] text-ink/40">Sale amount {formatINR(plot.saleAmount)}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-bold text-violet-700">{formatINR(plot.received || 0)}</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink/35">
            {payments.length} payment{payments.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="mt-3 divide-y divide-ink/[0.06] rounded-xl bg-violet-50/60 px-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 text-[12px] text-ink/60">
                <span className="font-medium text-ink/75">{formatDate(p.received_on)}</span>
                {p.note ? <span> · {p.note}</span> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">{formatINR(p.amount)}</span>
                <button
                  onClick={() => remove(p.id)}
                  aria-label="Delete payment"
                  className={`flex h-7 items-center justify-center rounded-full text-[10.5px] font-semibold transition ${
                    confirmId === p.id ? "bg-red-500 px-2.5 text-white" : "w-7 text-ink/35 hover:text-red-500"
                  }`}
                >
                  {confirmId === p.id ? "Delete?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-violet-300 px-3.5 py-1.5 text-[12px] font-semibold text-violet-700">
          <Plus className="h-3.5 w-3.5" /> Add payment
        </button>
      ) : (
        <div className="mt-3 space-y-2.5 rounded-xl border border-violet-100 bg-white p-3">
          <div className="grid grid-cols-2 gap-2.5">
            <input className="field-input" type="number" inputMode="decimal" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className="field-input" type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <input className="field-input" placeholder="Note (optional) — mode, reference…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <button key={m} type="button" onClick={() => setNote(m)} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${note === m ? "border-violet-300 bg-violet-100 text-violet-700" : "border-ink/10 text-ink/50"}`}>
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            disabled={busy || !(Number(amount) > 0)}
            className="w-full rounded-full bg-gradient-to-br from-violet-500 to-violet-700 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save payment"}
          </button>
        </div>
      )}
    </div>
  );
}

// Admin-only: record every amount received on each plot of a sale, in as many
// parts as it arrives. The associate can see the same history (read-only).
export default function PaymentsModal({ open, sale, onClose, onChanged }) {
  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      {sale && (
        <>
          <SheetHeader title="Payments received" sub={`${sale.buyer_name || "—"} · ${sale.associate_name || "—"}`} />
          <div className="mb-3.5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 px-4 py-3 text-white">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Total received</span>
            <span className="font-display text-[22px] font-semibold leading-none">{formatINR(sale.received || 0)}</span>
          </div>
          <div className="space-y-3">
            {sale.plots.map((p) => (
              <PlotPayments key={p.rowId} plot={p} onChanged={onChanged} startOpen={sale.plots.length === 1} />
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
