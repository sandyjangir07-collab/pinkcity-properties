import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { computeCommission } from "../../lib/commission";
import { BadgeIndianRupee } from "lucide-react";
import { Card, SectionTitle, StatCard } from "../ui/primitives";

// Commission is manually entered by the admin per deal at approval time
// (Plots & Tokens → Review), not computed from a ₹/Gaj slab rate. This
// section just totals up what's already been recorded.
export default function CommissionSection({ employee, refreshKey }) {
  const [stats, setStats] = useState(null);

  async function load() {
    const { data: deals } = await sb
      .from("token_submissions")
      .select("sale_amount, commission_amount, reviewed_at")
      .eq("associate_employee_id", employee.id)
      .eq("status", "approved");
    setStats(computeCommission({ deals: deals || [] }));
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
    </Card>
  );
}
