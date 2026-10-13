import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, BadgeIndianRupee, ChevronRight } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { formatINR } from "../../lib/utils";
import { StatCard } from "../ui/primitives";

// Team page, associates only: this associate's own plots sold and the
// commission the admin has recorded for them. Every approved sale row credited
// to them is one plot (same counting as the admin Sales page).
export default function MyTeamStats() {
  const { employee } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!employee?.id) {
      setRows([]);
      return;
    }
    let cancelled = false;
    sb.from("token_submissions")
      .select("id,commission_amount,reviewed_at")
      .eq("associate_employee_id", employee.id)
      .eq("status", "approved")
      .then(({ data }) => {
        if (!cancelled) setRows(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, [employee?.id]);

  if (!employee || rows === null) return null;

  const now = new Date();
  const total = rows.reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);
  const month = rows
    .filter((r) => {
      if (!r.reviewed_at) return false;
      const d = new Date(r.reviewed_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, r) => sum + (Number(r.commission_amount) || 0), 0);

  return (
    <div className="mb-8">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/40">Your sales</div>
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard value={String(rows.length)} label="Plots sold" Icon={TrendingUp} tone="brass" />
        <StatCard value={formatINR(total)} label="Commission earned" Icon={BadgeIndianRupee} tone="emerald" />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[12px]">
        <span className="font-medium text-emerald-700">{formatINR(month)} this month</span>
        <Link to={`/employees/${employee.id}`} className="inline-flex items-center gap-0.5 font-semibold text-stone-600">
          View my sales <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
