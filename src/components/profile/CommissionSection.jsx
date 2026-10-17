import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { computeCommission } from "../../lib/commission";
import { groupSales, plotLabel, attachPayments, PAYMENT_COLUMNS } from "../../lib/sales";
import PaymentHistory from "../sales/PaymentHistory";
import CommissionBalance from "../commissions/CommissionBalance";
import { formatDate, formatINR } from "../../lib/utils";
import { BadgeIndianRupee } from "lucide-react";
import { Card, SectionTitle, StatCard } from "../ui/primitives";

// Commission is entered manually per deal (at approval, or when an admin adds
// a sale directly) — not computed from a slab rate. This section totals up
// what's recorded and lists the associate's sales.
export default function CommissionSection({ employee, refreshKey }) {
  const [stats, setStats] = useState(null);
  const [deals, setDeals] = useState([]);
  const [openKey, setOpenKey] = useState(null);

  async function load() {
    const { data } = await sb
      .from("token_submissions")
      .select("id,sale_group_id,is_manual,buyer_name,buyer_phone,associate_name,sale_amount,commission_amount,reviewed_at,listing_id,manual_township,manual_plot_no,manual_plot_area,colony_units(unit_number,unit_size)")
      .eq("associate_employee_id", employee.id)
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false });
    const list = data || [];
    setStats(computeCommission({ deals: list }));

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
    setDeals(
      attachPayments(groupSales(list.map((d) => ({
        ...d,
        township: titles[d.listing_id] || d.manual_township || "",
        plotNo: d.colony_units?.unit_number || d.manual_plot_no || "",
        plotArea: d.colony_units?.unit_size || d.manual_plot_area || "",
      }))), pays)
    );
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  if (!stats) return null;

  return (
    <Card>
      <SectionTitle>Commission</SectionTitle>
      <div className="flex items-center gap-2 mb-3.5 -mt-1">
        <BadgeIndianRupee className="w-4 h-4 text-stone-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
          Entered manually per deal
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Deals" value={stats.totalDeals} tone="stone" />
        <StatCard label="Total Sales" value={`₹${stats.totalSales.toLocaleString("en-IN")}`} tone="jali" />
        <StatCard label="This Month" value={`₹${stats.thisMonthCommission.toLocaleString("en-IN")}`} tone="emerald" />
        <StatCard label="All-Time Commission" value={`₹${stats.totalCommission.toLocaleString("en-IN")}`} tone="brass" />
      </div>

      <CommissionBalance employeeId={employee.id} earned={stats.totalCommission} monthEarned={stats.thisMonthCommission} />

      {deals.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40 mb-2.5">Sales</div>
          <div className="divide-y divide-ink/[0.06]">
            {deals.map((d) => (
              <div key={d.key} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-ink">{d.buyer_name || "—"}</div>
                  {d.plots.map((p, i) => (
                    <div key={i} className="mt-0.5 text-[12px] text-ink/50">{plotLabel(p)}</div>
                  ))}
                  <div className="mt-0.5 text-[11px] text-ink/35">{formatDate(d.reviewed_at)}</div>
                </div>
                <div className="shrink-0 text-right">
                  {d.sale_amount != null && <div className="text-[13px] font-semibold text-ink">{formatINR(d.sale_amount)}</div>}
                  <div className="mt-0.5 text-[11.5px] font-medium text-emerald-700">+ {formatINR(d.commission)}</div>
                </div>
              </div>
              <button
                onClick={() => setOpenKey(openKey === d.key ? null : d.key)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11.5px] font-semibold text-violet-700"
              >
                {formatINR(d.received)} received{d.paymentCount > 0 ? ` · ${d.paymentCount} payment${d.paymentCount === 1 ? "" : "s"}` : ""}
                <span className="text-violet-400">{openKey === d.key ? "▴" : "▾"}</span>
              </button>
              {openKey === d.key && <PaymentHistory sale={d} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
