import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { formatINR, formatDate } from "../../lib/utils";
import { groupSales, plotLabel, formatGaj, attachPayments, PAYMENT_COLUMNS } from "../../lib/sales";
import PaymentHistory from "./PaymentHistory";
import CommissionBalance from "../commissions/CommissionBalance";

// Home-screen card: every sale an admin has credited to the logged-in
// associate, with the total Gaj and the amount the admin entered for them.
export default function MySalesCard() {
  const { employee, isAdmin } = useAuth();
  const [sales, setSales] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [openKey, setOpenKey] = useState(null);

  useEffect(() => {
    if (!employee?.id) {
      setSales([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await sb
        .from("token_submissions")
        .select("id,sale_group_id,unit_id,buyer_name,associate_name,associate_employee_id,sale_amount,commission_amount,reviewed_at,listing_id,is_manual,manual_township,manual_plot_no,manual_plot_area,colony_units(unit_number,unit_size)")
        .eq("associate_employee_id", employee.id)
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false });
      const list = data || [];
      const ids = [...new Set(list.map((d) => d.listing_id).filter(Boolean))];
      let titles = {};
      if (ids.length) {
        const { data: ls } = await sb.from("listings").select("id,title").in("id", ids);
        titles = Object.fromEntries((ls || []).map((l) => [l.id, l.title]));
      }
      let pays = [];
      if (list.length) {
        const { data: pd } = await sb.from("sale_payments").select(PAYMENT_COLUMNS).in("sale_row_id", list.map((d) => d.id));
        pays = pd || [];
      }
      if (cancelled) return;
      setSales(
        attachPayments(
          groupSales(
            list.map((d) => ({
              ...d,
              township: titles[d.listing_id] || d.manual_township || "",
              plotNo: d.colony_units?.unit_number || d.manual_plot_no || "",
              plotArea: d.colony_units?.unit_size || d.manual_plot_area || "",
            }))
          ),
          pays
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  if (!employee || sales === null) return null;
  if (isAdmin && sales.length === 0) return null;

  const now = new Date();
  const sameMonth = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const totalGaj = sales.reduce((sum, s) => sum + s.totalGaj, 0);
  const totalAmount = sales.reduce((sum, s) => sum + s.commission, 0);
  const totalReceived = sales.reduce((sum, s) => sum + s.received, 0);
  const monthAmount = sales.filter((s) => sameMonth(s.reviewed_at)).reduce((sum, s) => sum + s.commission, 0);
  const visible = showAll ? sales : sales.slice(0, 5);

  return (
    <div className="mt-9">
      <h3 className="font-display text-[19px] font-medium text-ink">My sales</h3>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-4">
          <div className="font-display text-[28px] font-semibold leading-none text-ink">{sales.length}</div>
          <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Sales</div>
        </div>
        <div className="rounded-[22px] border border-brass/25 bg-brass/10 p-4">
          <div className="font-display text-[28px] font-semibold leading-none text-ink">
            {totalGaj.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Total Gaj</div>
        </div>
      </div>
      <CommissionBalance employeeId={employee.id} earned={totalAmount} monthEarned={monthAmount} canConfirm />

      <div className="mt-3 rounded-[22px] border border-violet-200 bg-violet-50/60 p-4">
        <div className="font-display text-[28px] font-semibold leading-none text-ink">{formatINR(totalReceived)}</div>
        <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Received from clients</div>
      </div>

      <div className="mt-3 space-y-2.5">
        {sales.length === 0 && (
          <div className="rounded-2xl border border-ink/[0.06] bg-surface p-5 text-center text-[13px] text-ink/40">
            No sales yet. Sales your admin records for you will show up here.
          </div>
        )}
        {visible.map((s) => (
          <div key={s.key} className="rounded-2xl border border-ink/[0.06] bg-surface p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[14.5px] font-semibold text-ink">{s.buyer_name || "—"}</div>
                {s.plots.map((p, i) => (
                  <div key={i} className="mt-0.5 text-[12px] text-ink/50">{plotLabel(p)}</div>
                ))}
                <div className="mt-1 text-[11px] text-ink/35">
                  {formatDate(s.reviewed_at)}
                  {s.plots.length > 1 ? ` · ${s.plots.length} plots · ${formatGaj(s.totalGaj)}` : ""}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[14px] font-semibold text-emerald-700">{formatINR(s.commission)}</div>
              </div>
            </div>
            <button
              onClick={() => setOpenKey(openKey === s.key ? null : s.key)}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11.5px] font-semibold text-violet-700"
            >
              {formatINR(s.received)} received{s.paymentCount > 0 ? ` · ${s.paymentCount} payment${s.paymentCount === 1 ? "" : "s"}` : ""}
              <span className="text-violet-400">{openKey === s.key ? "▴" : "▾"}</span>
            </button>
            {openKey === s.key && <PaymentHistory sale={s} />}
          </div>
        ))}
        {sales.length > 5 && (
          <button onClick={() => setShowAll((v) => !v)} className="w-full py-2 text-center text-[12px] font-semibold text-stone-600">
            {showAll ? "Show less" : `Show all ${sales.length} sales`}
          </button>
        )}
      </div>
    </div>
  );
}
