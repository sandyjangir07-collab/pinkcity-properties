import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, PhoneIncoming, PhoneMissed, Users } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useWindowEvent } from "../hooks/useWindowEvent";
import { Sheet, SheetHeader } from "../components/ui/Sheet";
import { Pill, StatCard } from "../components/ui/primitives";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import { initials } from "../lib/utils";
import { CALLS_EVENT, DAILY_CALL_TARGET, OUTCOMES, addDays, dayLabel, fetchCallStats, fetchCallsOn, istDate, sumStats } from "../lib/calls";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function rangeDates(id, today) {
  if (id === "yesterday") return [addDays(today, -1), addDays(today, -1)];
  if (id === "7d") return [addDays(today, -6), today];
  if (id === "30d") return [addDays(today, -29), today];
  return [today, today];
}

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
}

export default function Calls() {
  const { user, isAdmin } = useAuth();
  const today = istDate();
  const [rows, setRows] = useState(null);
  const [people, setPeople] = useState([]); // approved associates, so zero-call people still show up
  const [range, setRange] = useState("today");
  const [open, setOpen] = useState(null); // { userId, name }
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRows(await fetchCallStats(addDays(today, -29), today));
      setError("");
    } catch (e) {
      console.error(e);
      setError("Couldn't load calls. Pull down to retry.");
      setRows([]);
    }
  }, [today]);
  useEffect(() => { load(); }, [load]);
  useWindowEvent(CALLS_EVENT, load);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: profiles }, { data: employees }] = await Promise.all([
        sb.from("profiles").select("id,full_name,email,role"),
        sb.from("employees").select("user_id,profile_status"),
      ]);
      const approved = new Set((employees || []).filter((e) => e.profile_status === "approved").map((e) => e.user_id));
      setPeople((profiles || []).filter((p) => p.role !== "admin" && approved.has(p.id)).map((p) => ({ id: p.id, name: p.full_name || p.email })));
    })();
  }, [isAdmin]);

  if (rows === null) return <div className="flex justify-center py-24"><BrandedLoader size={24} /></div>;

  return isAdmin
    ? <AdminView rows={rows} people={people} range={range} setRange={setRange} today={today} me={user.id} open={open} setOpen={setOpen} error={error} />
    : <MyView rows={rows} today={today} me={user.id} open={open} setOpen={setOpen} error={error} />;
}

function Header({ eyebrow, title, sub }) {
  return (
    <>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">{eyebrow}</div>
      <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">{title}</h1>
      <p className="mt-2.5 text-[13.5px] text-ink/50">{sub}</p>
    </>
  );
}

function MyView({ rows, today, me, open, setOpen, error }) {
  const mine = rows.filter((r) => r.user_id === me);
  const byDay = Object.fromEntries(mine.map((r) => [r.call_date, r]));
  const t = byDay[today];
  const week = sumStats(mine.filter((r) => r.call_date >= addDays(today, -6)));
  const month = sumStats(mine);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const max = Math.max(DAILY_CALL_TARGET, ...days.map((d) => byDay[d]?.calls || 0));
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Header eyebrow="Your calls" title="Calls made" sub="Every tap on Call counts. Say how the call went afterwards so it shows as a real conversation." />
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-6 rounded-[26px] bg-crimson p-6 text-white">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Today</div>
        <div className="mt-1 flex items-end gap-3">
          <div className="font-display text-[64px] font-semibold leading-none">{t?.calls || 0}</div>
          <div className="pb-2 text-sm text-white/80">{(t?.calls || 0) === 1 ? "call" : "calls"}</div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[12px] font-medium text-white/85">
            <span>{(t?.calls || 0) >= DAILY_CALL_TARGET ? "Goal reached 🎉" : `${DAILY_CALL_TARGET - (t?.calls || 0)} to go`}</span>
            <span>Goal {DAILY_CALL_TARGET}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.min(100, ((t?.calls || 0) / DAILY_CALL_TARGET) * 100)}%` }} />
          </div>
        </div>
        <div className="mt-3 flex gap-5 text-[13px] text-white/85">
          <span>{t?.spoke || 0} spoke</span>
          <span>{t?.no_answer || 0} no answer</span>
          <span>{t?.leads_called || 0} leads</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard label="Last 7 days" value={week.calls} tone="jali" Icon={Phone} />
        <StatCard label="Days goal reached (30d)" value={mine.filter((r) => r.calls >= DAILY_CALL_TARGET).length} tone="emerald" Icon={Phone} />
      </div>

      <div className="mt-8 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">Last 14 days</div>
      <div className="mt-3 space-y-2">
        {days.map((d) => {
          const n = byDay[d]?.calls || 0;
          return (
            <button key={d} onClick={() => setOpen({ userId: me, name: "Your calls", date: d })} className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left">
              <span className="w-24 shrink-0 text-[13px] font-medium text-ink/70">{dayLabel(d, today)}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]"><span className="block h-full rounded-full bg-crimson" style={{ width: `${(n / max) * 100}%` }} /></span>
              <span className={`w-12 text-right font-display text-lg font-semibold ${n >= DAILY_CALL_TARGET ? "text-emerald-600" : "text-ink"}`}>{n}{n >= DAILY_CALL_TARGET ? " ✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <DaySheet open={open} onClose={() => setOpen(null)} today={today} />
    </div>
  );
}

function AdminView({ rows, people, range, setRange, today, me, open, setOpen, error }) {
  const [from, to] = rangeDates(range, today);
  const inRange = rows.filter((r) => r.call_date >= from && r.call_date <= to);
  const perUser = useMemo(() => {
    const map = new Map();
    people.forEach((p) => map.set(p.id, { id: p.id, name: p.name, rows: [] }));
    inRange.forEach((r) => {
      if (!map.has(r.user_id)) map.set(r.user_id, { id: r.user_id, name: r.user_name || "Team", rows: [] });
      map.get(r.user_id).rows.push(r);
    });
    return [...map.values()].map((u) => ({ ...u, s: sumStats(u.rows) })).sort((a, b) => b.s.calls - a.s.calls || a.name.localeCompare(b.name));
  }, [inRange, people]);
  const total = sumStats(inRange);
  const callers = perUser.filter((u) => u.s.calls > 0).length;
  const max = Math.max(1, ...perUser.map((u) => u.s.calls));
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Header eyebrow="Admin" title="Team calls" sub="How many calls each person made. A call is counted when they tap Call on a lead." />
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
        {RANGES.map((r) => (
          <button key={r.id} onClick={() => setRange(r.id)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold ${range === r.id ? "bg-ink text-white" : "border border-ink/10 bg-white text-ink/60"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Calls" value={total.calls} tone="jali" />
        <StatCard label="Spoke" value={total.spoke} tone="emerald" />
        <StatCard label="No answer" value={total.no_answer} tone="stone" />
        <StatCard label={range === "today" || range === "yesterday" ? `Hit ${DAILY_CALL_TARGET}` : "Calling"} value={range === "today" || range === "yesterday" ? perUser.filter((u) => u.s.calls >= DAILY_CALL_TARGET).length : callers} tone="brass" />
      </div>

      <div className="mt-7 space-y-2.5">
        {perUser.length === 0 && <div className="rounded-3xl bg-white py-14 text-center text-ink/40">No team members yet.</div>}
        {perUser.map((u) => (
          <button key={u.id} onClick={() => setOpen({ userId: u.id, name: u.name, date: range === "yesterday" ? addDays(today, -1) : today, history: u.rows })} className="block w-full rounded-3xl bg-white p-4 text-left active:scale-[0.99] transition-transform">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-sm font-medium text-stone-600">{initials(u.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{u.name}{u.id === me ? " (you)" : ""}</div>
                <div className="truncate text-xs text-ink/45">
                  {u.s.calls === 0 ? "No calls" : `${u.s.leads} leads · ${u.s.spoke} spoke · ${u.s.no_answer} no answer`}
                </div>
              </div>
              <div className={`font-display text-[28px] font-semibold leading-none ${u.s.calls === 0 ? "text-ink/25" : "text-ink"}`}>{u.s.calls}</div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"><div className={`h-full rounded-full ${range === "today" || range === "yesterday" ? (u.s.calls >= DAILY_CALL_TARGET ? "bg-emerald-500" : "bg-crimson") : "bg-crimson"}`} style={{ width: `${range === "today" || range === "yesterday" ? Math.min(100, (u.s.calls / DAILY_CALL_TARGET) * 100) : (u.s.calls / max) * 100}%` }} /></div>
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-xs leading-relaxed text-ink/40">"Spoke" counts calls where the outcome was saved as interested, not interested or call back. A call with no outcome saved still counts as a call. The daily goal is {DAILY_CALL_TARGET} calls.</p>
      <DaySheet open={open} onClose={() => setOpen(null)} today={today} rows={rows} />
    </div>
  );
}

// One person's calls for one day, with a day switcher.
function DaySheet({ open, onClose, today, rows }) {
  const [date, setDate] = useState(today);
  const [calls, setCalls] = useState(null);
  useEffect(() => { if (open) setDate(open.date || today); }, [open, today]);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setCalls(null);
    fetchCallsOn(date, open.userId).then((c) => live && setCalls(c)).catch(() => live && setCalls([]));
    return () => { live = false; };
  }, [open, date]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const counts = open && rows ? Object.fromEntries(rows.filter((r) => r.user_id === open.userId).map((r) => [r.call_date, r.calls])) : {};
  return (
    <Sheet open={!!open} onClose={onClose} maxWidth="max-w-md">
      {open && (
        <>
          <SheetHeader title={open.name} sub={`${dayLabel(date, today)} · ${calls ? calls.length : "…"} calls`} />
          <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
            {days.map((d) => (
              <button key={d} onClick={() => setDate(d)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${d === date ? "bg-ink text-white" : "border border-ink/10 bg-white text-ink/60"}`}>
                {dayLabel(d, today)}{counts[d] != null ? ` · ${counts[d]}` : ""}
              </button>
            ))}
          </div>
          {calls === null ? (
            <div className="flex justify-center py-8"><BrandedLoader size={20} /></div>
          ) : calls.length === 0 ? (
            <div className="py-8 text-center text-sm text-ink/40">No calls this day.</div>
          ) : (
            <div className="space-y-2">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{c.lead_name || "Lead"}</div>
                    <div className="text-xs text-ink/40">{timeOf(c.called_at)}</div>
                  </div>
                  {c.outcome ? <Pill tone={OUTCOMES[c.outcome]?.tone}>{OUTCOMES[c.outcome]?.label}</Pill> : <span className="text-[11px] text-ink/30">No outcome</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
