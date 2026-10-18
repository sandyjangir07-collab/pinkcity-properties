import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { formatINR, formatINRCompact, fitFont, initials } from "../lib/utils";
import { summarize } from "../lib/payouts";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import PayoutSheet from "../components/commissions/PayoutSheet";

const TONES = ["bg-rose-100 text-rose-700", "bg-sky-100 text-sky-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700", "bg-indigo-100 text-indigo-700", "bg-orange-100 text-orange-700"];
const tone = (name) => {
  let h = 0;
  for (const c of String(name || "?")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};

function SummaryTile({ label, value, className, base, fit }) {
  return (
    <div className={`rounded-2xl p-4 text-white shadow-lift ${className}`}>
      <div className="whitespace-nowrap font-display font-semibold leading-none lg:text-[28px]" style={{ fontSize: fitFont(value, base, fit) }}>{value}</div>
      <div className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">{label}</div>
    </div>
  );
}

// Admin: what every associate has earned, what you've paid them, and what's still due.
export default function Commissions() {
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);

  async function load() {
    const [emps, deals, pays] = await Promise.all([
      sb.from("employees").select("id,full_name").order("full_name"),
      sb.from("token_submissions").select("associate_employee_id,commission_amount,reviewed_at").eq("status", "approved").not("associate_employee_id", "is", null).range(0, 9999),
      sb.from("commission_payouts").select("id,employee_id,amount,paid_on,note,created_at").order("paid_on", { ascending: false }).range(0, 9999),
    ]);
    const err = emps.error || deals.error || pays.error;
    if (err) {
      showToast(err.message);
      setData([]);
      return;
    }
    const byEmp = (rows, key) => {
      const m = new Map();
      for (const r of rows || []) {
        if (!m.has(r[key])) m.set(r[key], []);
        m.get(r[key]).push(r);
      }
      return m;
    };
    const dm = byEmp(deals.data, "associate_employee_id");
    const pm = byEmp(pays.data, "employee_id");
    setData(
      (emps.data || []).map((e) => {
        const d = dm.get(e.id) || [];
        const p = pm.get(e.id) || [];
        return { id: e.id, name: e.full_name, deals: d, payouts: p, ...summarize(d, p) };
      })
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(
    () => (data || []).filter((r) => r.earned > 0 || r.paid > 0).sort((a, b) => b.due - a.due || a.name.localeCompare(b.name)),
    [data]
  );
  const idle = (data || []).length - rows.length;
  const totals = rows.reduce((t, r) => ({ earned: t.earned + r.earned, paid: t.paid + r.paid, due: t.due + r.due }), { earned: 0, paid: 0, due: 0 });
  const openRow = (data || []).find((r) => r.id === openId) || null;

  if (data === null) return <div className="mx-auto flex max-w-6xl justify-center px-5 py-24"><BrandedLoader size={24} /></div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Admin Panel</div>
      <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Commissions</h1>
      <p className="mt-2 text-[13.5px] text-ink/50">What each associate has earned, what you've paid, and what's still due.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryTile label="Total earned" value={formatINRCompact(totals.earned)} className="col-span-2 bg-gradient-to-br from-stone-500 to-stone-700 lg:col-span-1" base={28} fit={14} />
        <SummaryTile label="Total paid" value={formatINRCompact(totals.paid)} className="bg-gradient-to-br from-emerald-500 to-emerald-700" base={24} fit={10} />
        <SummaryTile label="Still due" value={formatINRCompact(Math.max(totals.due, 0))} className="bg-gradient-to-br from-amber-500 to-orange-600" base={24} fit={10} />
      </div>

      <div className="mt-6 space-y-2.5">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-10 text-center text-[13px] text-ink/40">No commission recorded yet. It appears here once a sale with a commission is added.</div>
        )}
        {rows.map((r) => {
          const pct = r.earned > 0 ? Math.min(100, Math.round((r.paid / r.earned) * 100)) : 100;
          return (
            <div key={r.id} className="rounded-2xl border border-ink/[0.05] bg-surface p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${tone(r.name)}`}>{initials(r.name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink">{r.name}</div>
                  <div className="text-[11.5px] text-ink/40">{r.deals.length} plot{r.deals.length === 1 ? "" : "s"} · {r.payouts.length} payout{r.payouts.length === 1 ? "" : "s"}</div>
                </div>
                <button onClick={() => setOpenId(r.id)} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-stone-600 px-4 text-[12.5px] font-semibold text-white active:scale-95">
                  <Wallet className="h-3.5 w-3.5" /> Pay
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                <div><span className="block text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink/35">Earned</span><b className="text-[14px] text-ink">{formatINR(r.earned)}</b></div>
                <div><span className="block text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink/35">Paid</span><b className="text-[14px] text-emerald-700">{formatINR(r.paid)}</b></div>
                <div><span className="block text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink/35">{r.due < 0 ? "Advance" : "Still due"}</span><b className={`text-[14px] ${r.due > 0 ? "text-amber-700" : "text-ink/60"}`}>{formatINR(Math.abs(r.due))}</b></div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]" aria-label={`${pct}% paid`}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {idle > 0 && rows.length > 0 && <p className="pt-1 text-center text-[12px] text-ink/35">{idle} other team member{idle === 1 ? " has" : "s have"} no commission yet.</p>}
      </div>

      <PayoutSheet open={!!openRow} row={openRow} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
