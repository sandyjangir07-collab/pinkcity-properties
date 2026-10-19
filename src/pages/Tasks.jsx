import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CalendarDays, CalendarClock, Banknote, Key, CheckCircle, Building2, MapPinned, CheckCircle2, ChevronRight, Search } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useTaskCounts } from "../hooks/useTaskCounts";
import { actionItems, TONE_CLASSES } from "../lib/taskItems";
import { todayStr } from "../lib/attendance";
import { timeAgo } from "../lib/leadConstants";
import { Pill } from "../components/ui/primitives";
import { FollowupCard } from "../components/home/TaskCards";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import { ReviewTokenModal } from "./Plots";

const ICONS = {
  overdue: AlertTriangle, followups: CalendarDays, visits: CalendarClock, payouts: Banknote,
  tokens: Key, approvals: CheckCircle, listings: Building2, requests: MapPinned, disputes: AlertTriangle,
};

function SectionHead({ title, caption, to, toLabel }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[20px] font-medium text-ink">{title}</h2>
        {caption && <div className="mt-0.5 text-[12px] text-ink/40">{caption}</div>}
      </div>
      {to && <Link to={to} className="shrink-0 text-[12.5px] font-semibold text-stone-600">{toLabel}</Link>}
    </div>
  );
}

function ActionRow({ item }) {
  const t = TONE_CLASSES[item.tone] || TONE_CLASSES.blue;
  const Icon = ICONS[item.key] || CheckCircle;
  const inner = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${t.icon}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-ink">{item.label}</span>
        <span className="block truncate text-[12px] text-ink/50">{item.hint}</span>
      </span>
      <span className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold ${t.chip}`}>{item.n}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink/25" />
    </>
  );
  const cls = `flex min-h-[68px] w-full items-center gap-3.5 rounded-[22px] border ${t.ring} ${t.bg} px-4 py-3 text-left transition-transform active:scale-[0.99]`;
  if (item.key === "tokens") {
    return (
      <button className={cls} onClick={() => document.getElementById("tokens")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
        {inner}
      </button>
    );
  }
  return <Link to={item.to} className={cls}>{inner}</Link>;
}

// Tasks: what needs you now (approvals, follow-ups, payouts), the upcoming
// schedule, and the pending work behind the numbers.
export default function Tasks() {
  const { user, profile, isAdmin } = useAuth();
  const { counts, refresh } = useTaskCounts();
  const navigate = useNavigate();
  const [followups, setFollowups] = useState(null);
  const [visits, setVisits] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [titles, setTitles] = useState({});
  const [reviewUnitId, setReviewUnitId] = useState(null);

  async function loadLists() {
    const today = todayStr();
    const mine = `assigned_to.eq.${user.id},created_by.eq.${user.id}`;
    const [{ data: leads }, { data: v }] = await Promise.all([
      sb.from("leads").select("*").is("deleted_at", null).or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .not("status", "in", "(closed,lost)").lte("follow_up_date", today).not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true }).limit(6),
      sb.from("scheduled_visits").select("*").or(mine).gte("visit_date", today).eq("status", "scheduled")
        .order("visit_date", { ascending: true }).order("visit_time", { ascending: true }).limit(6),
    ]);
    setFollowups(leads || []);
    setVisits(v || []);
  }

  async function loadTokens() {
    if (!isAdmin) return;
    const { data } = await sb.from("token_submissions").select("*, colony_units(unit_number)").eq("status", "pending").order("submitted_at", { ascending: true });
    const list = data || [];
    setTokens(list);
    const ids = [...new Set(list.map((t) => t.listing_id).filter(Boolean))];
    if (ids.length) {
      const { data: ls } = await sb.from("listings").select("id,title").in("id", ids);
      setTitles(Object.fromEntries((ls || []).map((l) => [l.id, l.title])));
    }
  }

  useEffect(() => {
    loadLists();
    loadTokens();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const items = actionItems(counts, isAdmin);
  const today = todayStr();

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Needs your attention</div>
      <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Tasks</h1>
      <p className="mt-2.5 text-[13.5px] text-ink/50">Schedule, pending work and approvals that need action.</p>

      {/* 1. Needs action */}
      <div className="mt-7">
        <SectionHead title="Needs your action" />
        <div className="mt-3 space-y-2.5">
          {counts === null ? (
            <div className="flex justify-center py-8"><BrandedLoader size={22} /></div>
          ) : items.length === 0 ? (
            <div className="flex items-center gap-3.5 rounded-[22px] border border-emerald-100 bg-emerald-50 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
              <div>
                <div className="text-[14.5px] font-semibold text-ink">All clear</div>
                <div className="text-[12.5px] text-ink/50">Nothing is waiting on you right now.</div>
              </div>
            </div>
          ) : (
            items.map((i) => <ActionRow key={i.key} item={i} />)
          )}
        </div>
      </div>

      {/* 2. Token reviews (admin) */}
      {isAdmin && (
        <div id="tokens" className="mt-9 scroll-mt-28">
          <SectionHead title="Token reviews" caption="Plots an associate has put a token on" />
          <div className="mt-3 space-y-2">
            {tokens.length === 0 ? (
              <div className="rounded-2xl border border-ink/[0.06] bg-surface p-5 text-[13px] text-ink/40">No token submissions waiting on you.</div>
            ) : (
              tokens.map((t) => {
                const unit = t.colony_units?.unit_number ? `Plot ${t.colony_units.unit_number}` : "Plot";
                return (
                  <div key={t.id} onClick={() => setReviewUnitId(t.unit_id)} className="flex cursor-pointer gap-3 rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-50"><Key className="h-4 w-4 text-stone-600" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink">{unit}{titles[t.listing_id] ? ` · ${titles[t.listing_id]}` : ""}</div>
                      <div className="text-xs text-ink/45">{t.buyer_name || "—"}{t.associate_name ? ` · ${t.associate_name}` : ""}</div>
                      <div className="mt-1 text-[11px] text-ink/35">Submitted {timeAgo(t.submitted_at)}</div>
                    </div>
                    <Pill tone="stone"><span className="inline-flex items-center gap-1"><Search className="h-3 w-3" /> Review</span></Pill>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Schedule */}
      <div className="mt-9">
        <SectionHead title="Schedule" caption="Your next site visits" to="/schedule" toLabel="Open schedule" />
        <div className="mt-3 space-y-2">
          {visits === null ? (
            <div className="flex justify-center py-6"><BrandedLoader size={20} /></div>
          ) : visits.length === 0 ? (
            <div className="rounded-2xl border border-ink/[0.06] bg-surface p-5 text-[13px] text-ink/40">No visits coming up.</div>
          ) : (
            visits.map((v) => {
              const d = new Date(v.visit_date + "T00:00:00");
              const isToday = v.visit_date === today;
              return (
                <Link key={v.id} to="/schedule" className="flex items-center gap-3.5 rounded-2xl border border-ink/[0.06] bg-surface p-3.5 shadow-soft">
                  <span className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl ${isToday ? "bg-teal-100 text-teal-800" : "bg-stone-50 text-stone-700"}`}>
                    <span className="font-display text-[18px] font-semibold leading-none">{d.getDate()}</span>
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{v.client_name}</span>
                    <span className="block truncate text-[12px] text-ink/45">{v.listing_title || "Site visit"}{v.visit_time ? ` · ${v.visit_time}` : ""}</span>
                  </span>
                  {isToday && <span className="shrink-0 rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold text-teal-800">Today</span>}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Pending work */}
      <div className="mt-9">
        <SectionHead title="Pending work" caption="Follow-ups waiting on you" to="/today" toLabel="See all" />
        <div className="mt-3 space-y-2">
          {followups === null ? (
            <div className="flex justify-center py-6"><BrandedLoader size={20} /></div>
          ) : followups.length === 0 ? (
            <div className="rounded-2xl border border-ink/[0.06] bg-surface p-5 text-[13px] text-ink/40">No follow-ups due. You're all caught up.</div>
          ) : (
            followups.map((l) => <FollowupCard key={l.id} lead={l} onOpen={() => navigate("/today")} />)
          )}
        </div>
      </div>

      <ReviewTokenModal unitId={reviewUnitId} onClose={() => setReviewUnitId(null)} profile={profile} onDecided={() => { setReviewUnitId(null); loadTokens(); refresh(); }} />
    </div>
  );
}
