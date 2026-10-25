import { Link } from "react-router-dom";
import { Phone, CalendarDays, MapPinned, ArrowUpRight, ChevronRight, BellRing, Receipt, Ruler } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTaskCounts } from "../hooks/useTaskCounts";
import { actionItems } from "../lib/taskItems";
import NotRegistered from "./NotRegistered";
import PendingApprovalNotice from "./PendingApprovalNotice";
import AttendanceCard from "../components/home/AttendanceCard";
import MySalesCard from "../components/sales/MySalesCard";
import { BrandedLoader } from "../components/ui/BrandedLoader";

// The four shortcuts for daily sales work, in the approved design's colours.
// Everything else lives in the Menu (Listings and Plots & Tokens are under Property Inventory).
const ACTIONS = [
  { to: "/leads", label: "Leads", sub: "Pipeline & follow-ups", Icon: Phone, bg: "bg-crimson", dark: false },
  { to: "/today", label: "Today", sub: "Follow-ups & visits", Icon: CalendarDays, bg: "bg-ochre", dark: true },
  { key: "sales", label: "Sales", Icon: Receipt, bg: "bg-forest", dark: false }, // target and subtitle depend on the role (see Dashboard)
  { to: "/resale", label: "Resale Plots", sub: "Resale inventory", Icon: MapPinned, bg: "bg-royal", dark: false },
];

function QuickAction({ a }) {
  return (
    <Link
      to={a.to}
      className={`relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[30px] p-4 shadow-[0_10px_22px_-12px_rgba(60,20,35,0.45)] transition-transform active:scale-[0.97] ${a.bg} ${a.dark ? "text-[#1C1312]" : "text-white"}`}
    >
      <a.Icon aria-hidden strokeWidth={1.4} className={`pointer-events-none absolute -bottom-4 -right-5 h-[124px] w-[124px] ${a.dark ? "text-black/[0.11]" : "text-white/[0.14]"}`} />
      <div className="relative flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${a.dark ? "bg-black/[0.08]" : "bg-white/[0.15]"}`}>
          <a.Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="mr-1 mt-[13px] h-[18px] w-[18px] opacity-80" />
      </div>
      <div className="relative">
        <div className="text-[22px] font-semibold leading-tight tracking-tight">{a.label}</div>
        <div className={`mt-0.5 text-[13px] ${a.dark ? "text-[#44321D]" : "text-white/75"}`}>{a.sub}</div>
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
  const { profile, isAdmin, employee } = useAuth();
  const { counts } = useTaskCounts();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";
  const items = actionItems(counts, isAdmin);
  const total = counts?.actionTotal || 0;
  const summary = items.slice(0, 3).map((i) => `${i.n} ${i.label.toLowerCase()}`).join(" · ");

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed -left-24 -top-16 h-72 w-72 rounded-full bg-crimson/[0.10] blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -right-20 top-52 h-64 w-64 rounded-full bg-ochre/[0.16] blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-5 py-8">
        <div className="text-[12.5px] font-bold uppercase tracking-[0.2em] text-crimson">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.02] tracking-tight text-ink">
          {greeting}, {firstName}.
        </h1>
        <p className="mt-3 max-w-[18rem] text-[16px] leading-relaxed text-ink/55">Your PinkCity workspace, all in one place.</p>

        {/* Section label + the four daily shortcuts */}
        <div className="mt-9 flex items-end gap-4">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-ink/55">Sales &amp; Leads</div>
            <div className="mt-1 text-[15px] text-ink/45">Pipeline, inventory and paperwork</div>
          </div>
          <span className="mb-2 h-px flex-1 bg-gradient-to-r from-ink/15 to-transparent" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {ACTIONS.map((a) =>
            a.key === "sales" ? (
              <QuickAction key="sales" a={{ ...a, to: isAdmin ? "/sales" : `/employees/${employee?.id}`, sub: isAdmin ? "Every sale & payment" : "Your sales & commission" }} />
            ) : (
              <QuickAction key={a.to} a={a} />
            )
          )}
        </div>

        {total > 0 && (
          <Link to="/tasks" className="mt-4 flex items-center gap-3 rounded-[22px] border border-ochre/35 bg-ochre/10 p-4 transition-transform active:scale-[0.99]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ochre/25 text-[#7A5714]"><BellRing className="h-5 w-5" /></span>
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
          <Stat to="/today" value={counts?.followupsToday} label="Follow-ups today" tone="border-ochre/35 bg-ochre/10" Icon={CalendarDays} />
          <Stat to="/today" value={counts?.overdue} label="Overdue" tone="border-crimson/20 bg-crimson/[0.06]" Icon={BellRing} />
          <Stat to="/schedule" value={counts?.visitsToday} label="Visits today" tone="border-royal/25 bg-royal/[0.07]" Icon={Ruler} />
          <Stat to={isAdmin ? "/sales" : undefined} value={counts?.soldThisMonth} label="Plots sold this month" tone="border-forest/25 bg-forest/[0.07]" Icon={Receipt} />
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
