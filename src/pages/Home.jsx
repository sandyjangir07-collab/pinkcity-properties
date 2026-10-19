import { Link } from "react-router-dom";
import { Target, CalendarCheck, MapPinned, Building2, ChevronRight, BellRing, Receipt, Ruler } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTaskCounts } from "../hooks/useTaskCounts";
import { actionItems } from "../lib/taskItems";
import NotRegistered from "./NotRegistered";
import PendingApprovalNotice from "./PendingApprovalNotice";
import AttendanceCard from "../components/home/AttendanceCard";
import MySalesCard from "../components/sales/MySalesCard";
import { BrandedLoader } from "../components/ui/BrandedLoader";

// The four shortcuts for daily sales work. Everything else lives in the Menu.
const ACTIONS = [
  { to: "/leads", label: "Leads", sub: "Pipeline & follow-ups", Icon: Target, grad: "from-stone-500 to-stone-700", chip: (c) => `${c.newLeads} new` },
  { to: "/today", label: "Today", sub: "Follow-ups & visits", Icon: CalendarCheck, grad: "from-brass to-[#8f6a2c]", chip: (c) => { const n = c.followupsToday + c.overdue + c.visitsToday; return n ? `${n} due` : "All clear"; } },
  { to: "/resale", label: "Resale Plots", sub: "Resale inventory", Icon: MapPinned, grad: "from-jali to-[#34505a]", chip: (c) => `${c.availableResale} available` },
  { to: "/listings", label: "Listings", sub: "Properties & colonies", Icon: Building2, grad: "from-emerald-500 to-emerald-700", chip: (c) => `${c.activeListings} live` },
];

function QuickAction({ a, counts }) {
  return (
    <Link
      to={a.to}
      className={`group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[26px] bg-gradient-to-br ${a.grad} p-4 text-white shadow-lift transition-transform active:scale-[0.97]`}
    >
      <a.Icon aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 h-24 w-24 opacity-[0.13]" />
      <div className="relative flex items-start justify-between gap-2">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <a.Icon className="h-5 w-5" />
        </span>
        {counts && <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11.5px] font-bold">{a.chip(counts)}</span>}
      </div>
      <div className="relative">
        <div className="font-display text-[22px] font-semibold leading-tight">{a.label}</div>
        <div className="mt-0.5 text-[12px] text-white/75">{a.sub}</div>
      </div>
    </Link>
  );
}

function Stat({ to, value, label, tone, Icon }) {
  const body = (
    <>
      <Icon className="h-[17px] w-[17px] opacity-70" />
      <div className="mt-2.5 font-display text-[28px] font-semibold leading-none text-ink">{value ?? "—"}</div>
      <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">{label}</div>
    </>
  );
  const cls = `block rounded-[22px] border p-4 ${tone}`;
  return to ? <Link to={to} className={`${cls} transition-transform active:scale-[0.98]`}>{body}</Link> : <div className={cls}>{body}</div>;
}

function Dashboard() {
  const { profile, isAdmin } = useAuth();
  const { counts } = useTaskCounts();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";
  const items = actionItems(counts, isAdmin);
  const total = counts?.actionTotal || 0;
  const summary = items.slice(0, 3).map((i) => `${i.n} ${i.label.toLowerCase()}`).join(" · ");

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed -left-24 -top-16 h-72 w-72 rounded-full bg-stone-500/[0.12] blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -right-20 top-52 h-64 w-64 rounded-full bg-brass/[0.16] blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-5 py-8">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="mt-2 font-display text-[34px] font-semibold leading-[1.02] tracking-tight text-ink">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-2 text-[13.5px] text-ink/50">Your workspace for today.</p>

        {/* Four daily shortcuts */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => <QuickAction key={a.to} a={a} counts={counts} />)}
        </div>

        {total > 0 && (
          <Link to="/tasks" className="mt-4 flex items-center gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 transition-transform active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><BellRing className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-ink">{total} thing{total === 1 ? "" : "s"} need{total === 1 ? "s" : ""} your attention</span>
              <span className="block truncate text-[12px] text-ink/50">{summary}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
          </Link>
        )}

        <div className="mt-7">
          <AttendanceCard />
        </div>

        {/* Daily overview */}
        <div className="mt-7 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">Today at a glance</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat to="/today" value={counts?.followupsToday} label="Follow-ups today" tone="border-brass/25 bg-brass/10" Icon={CalendarCheck} />
          <Stat to="/today" value={counts?.overdue} label="Overdue" tone="border-stone-200 bg-stone-50" Icon={BellRing} />
          <Stat to="/schedule" value={counts?.visitsToday} label="Visits today" tone="border-teal-200 bg-teal-50/70" Icon={Ruler} />
          <Stat to={isAdmin ? "/sales" : undefined} value={counts?.soldThisMonth} label="Plots sold this month" tone="border-emerald-200 bg-emerald-50/70" Icon={Receipt} />
        </div>

        <MySalesCard />
      </div>
    </div>
  );
}

export default function Home() {
  const { isAdmin, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-20 flex justify-center">
        <BrandedLoader size={24} />
      </div>
    );
  }
  if (!isAdmin && !employee) return <NotRegistered />;
  if (!isAdmin && employee.profile_status === "pending_review") return <PendingApprovalNotice />;
  return <Dashboard />;
}
