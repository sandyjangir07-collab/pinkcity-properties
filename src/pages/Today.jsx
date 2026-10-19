import { useEffect, useState } from "react";
import { Key, Search } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useTaskCounts } from "../hooks/useTaskCounts";
import { timeAgo } from "../lib/leadConstants";
import { todayStr } from "../lib/attendance";
import { Card, SectionTitle, Pill } from "../components/ui/primitives";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";
import { FollowupCard, VisitCard } from "../components/home/TaskCards";
import { ReviewTokenModal } from "./Plots";
import { BrandedLoader } from "../components/ui/BrandedLoader";

// Today: the detailed worklist — follow-ups due, visits on today's calendar, and
// (for the admin) token submissions waiting for review. Home has the overview.
export default function Today() {
  const { user, profile, isAdmin } = useAuth();
  const { refresh: refreshCounts } = useTaskCounts();
  const [followups, setFollowups] = useState(null);
  const [visits, setVisits] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [listingTitles, setListingTitles] = useState({});
  const [formTarget, setFormTarget] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);
  const [reviewUnitId, setReviewUnitId] = useState(null);

  async function loadFollowupsAndVisits() {
    const today = todayStr();
    const [{ data: leads }, { data: v }] = await Promise.all([
      sb.from("leads").select("*").is("deleted_at", null)
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .not("status", "in", "(closed,lost)").lte("follow_up_date", today).not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true }),
      sb.from("scheduled_visits").select("*")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .eq("visit_date", today).neq("status", "cancelled")
        .order("visit_time", { ascending: true }),
    ]);
    setFollowups(leads || []);
    setVisits(v || []);
  }

  async function loadTokens() {
    if (!isAdmin) return;
    const { data: pending } = await sb.from("token_submissions").select("*, colony_units(unit_number)").eq("status", "pending").order("submitted_at", { ascending: true });
    const list = pending || [];
    setTokens(list);
    const ids = [...new Set(list.map((t) => t.listing_id).filter(Boolean))];
    if (ids.length) {
      const { data } = await sb.from("listings").select("id,title").in("id", ids);
      setListingTitles(Object.fromEntries((data || []).map((l) => [l.id, l.title])));
    }
  }

  useEffect(() => {
    loadFollowupsAndVisits();
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function refreshAll() {
    loadFollowupsAndVisits();
    loadTokens();
    refreshCounts();
  }

  const caughtUp = followups && followups.length === 0 && visits.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </div>
      <h1 className="mt-2 font-display text-[34px] font-semibold leading-[0.98] tracking-tight text-ink">Today</h1>
      <p className="mt-2.5 text-[13.5px] text-ink/50">{caughtUp ? "You're all caught up. Nothing is due today." : "Follow-ups and visits that need you today."}</p>

      <div className="mt-7 space-y-4">
        {isAdmin && (
          <Card>
            <SectionTitle>Pending Token Reviews</SectionTitle>
            {tokens.length === 0 ? (
              <div className="text-sm text-ink/40">No token submissions waiting on you.</div>
            ) : (
              <div className="space-y-2">
                {tokens.map((t) => {
                  const unitLabel = t.colony_units?.unit_number ? `Plot ${t.colony_units.unit_number}` : "Plot";
                  const listingTitle = listingTitles[t.listing_id] || "";
                  return (
                    <div key={t.id} onClick={() => setReviewUnitId(t.unit_id)} className="bg-stone-50/60 rounded-2xl p-3.5 flex gap-3 cursor-pointer">
                      <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shrink-0"><Key className="w-4 h-4 text-stone-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink">{unitLabel}{listingTitle ? ` · ${listingTitle}` : ""}</div>
                        <div className="text-xs text-ink/45">{t.buyer_name || "—"}{t.associate_name ? ` · ${t.associate_name}` : ""}</div>
                        <div className="text-[11px] text-ink/35 mt-1">Submitted {timeAgo(t.submitted_at)}</div>
                      </div>
                      <Pill tone="stone"><span className="inline-flex items-center gap-1"><Search className="w-3 h-3" /> Review</span></Pill>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        <Card>
          <SectionTitle>Follow-ups Due</SectionTitle>
          {followups === null ? (
            <div className="flex justify-center py-8"><BrandedLoader size={20} /></div>
          ) : followups.length === 0 ? (
            <div className="text-sm text-ink/40">Nothing due today. You&apos;re all caught up.</div>
          ) : (
            <div className="space-y-2">
              {followups.map((l) => <FollowupCard key={l.id} lead={l} onOpen={() => setDetailLeadId(l.id)} />)}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle>Visits Today</SectionTitle>
          {visits.length === 0 ? (
            <div className="text-sm text-ink/40">No visits scheduled for today.</div>
          ) : (
            <div className="space-y-2">{visits.map((v) => <VisitCard key={v.id} visit={v} />)}</div>
          )}
        </Card>
      </div>

      <LeadFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={() => { setFormTarget(null); refreshAll(); }} />
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={refreshAll}
        onEdit={(id) => { setDetailLeadId(null); setFormTarget(id); }}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => { setDetailLeadId(null); refreshAll(); }}
      />
      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); refreshAll(); }} />
      <ScheduleCallModal target={callTarget} onClose={() => setCallTarget(null)} onSaved={() => setCallTarget(null)} />
      <ReviewTokenModal unitId={reviewUnitId} onClose={() => setReviewUnitId(null)} profile={profile} onDecided={() => { setReviewUnitId(null); loadTokens(); refreshCounts(); }} />
      <CallOutcomeWatcher onLogged={refreshAll} />
    </div>
  );
}
