import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { STATUS_LABELS, waNumberFor, timeAgo } from "../lib/leadConstants";
import { todayStr, fmtTime, fmtHours, getLocation } from "../lib/attendance";
import { Phone, MessageCircle, Key, Search, MapPin, Clock3 } from "lucide-react";
import { Card, SectionTitle, Pill } from "../components/ui/primitives";
import { Button } from "../components/ui/button";
import { NAV_LINKS, NAV_ACCENT } from "../lib/navLinks";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";
import { ReviewTokenModal } from "./Plots";
import { BrandedLoader } from "../components/ui/BrandedLoader";

const EASE = [0.22, 1, 0.36, 1];

export default function Today() {
  const { user, profile, isAdmin } = useAuth();
  const showToast = useToast();
  const [followups, setFollowups] = useState(null);
  const [visits, setVisits] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [listingTitles, setListingTitles] = useState({});
  const [attendance, setAttendance] = useState(undefined);
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  const [formTarget, setFormTarget] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);
  const [reviewUnitId, setReviewUnitId] = useState(null);

  async function loadFollowupsAndVisits() {
    const today = todayStr();
    const [{ data: leads }, { data: v }] = await Promise.all([
      sb
        .from("leads")
        .select("*")
        .is("deleted_at", null)
        .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .not("status", "in", "(closed,lost)")
        .lte("follow_up_date", today)
        .not("follow_up_date", "is", null)
        .order("follow_up_date", { ascending: true }),
      sb
        .from("scheduled_visits")
        .select("*")
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .eq("visit_date", today)
        .neq("status", "cancelled")
        .order("visit_time", { ascending: true }),
    ]);
    setFollowups(leads || []);
    setVisits(v || []);
  }

  async function loadTokens() {
    if (!isAdmin) return;
    const { data: pending } = await sb
      .from("token_submissions")
      .select("*, colony_units(unit_number)")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });
    const list = pending || [];
    setTokens(list);
    const listingIds = [...new Set(list.map((t) => t.listing_id).filter(Boolean))];
    if (listingIds.length) {
      const { data: listingsData } = await sb.from("listings").select("id,title").in("id", listingIds);
      setListingTitles(Object.fromEntries((listingsData || []).map((l) => [l.id, l.title])));
    }
  }

  async function loadAttendance() {
    const { data } = await sb.from("attendance").select("*").eq("user_id", user.id).eq("date", todayStr()).maybeSingle();
    setAttendance(data || null);
  }

  useEffect(() => {
    loadFollowupsAndVisits();
    loadTokens();
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  function refreshAll() {
    loadFollowupsAndVisits();
    loadTokens();
  }

  async function handleAttendanceAction() {
    setAttendanceBusy(true);
    try {
      const coords = await getLocation();
      const submitterName = profile?.full_name || profile?.email || user.email;
      if (!attendance) {
        const { error } = await sb.from("attendance").insert({
          user_id: user.id,
          user_name: submitterName,
          check_in_at: new Date().toISOString(),
          check_in_lat: coords.latitude,
          check_in_lng: coords.longitude,
        });
        if (error) throw error;
        showToast("✓ Checked in!");
      } else {
        const { error } = await sb
          .from("attendance")
          .update({ check_out_at: new Date().toISOString(), check_out_lat: coords.latitude, check_out_lng: coords.longitude })
          .eq("id", attendance.id);
        if (error) throw error;
        showToast("✓ Checked out!");
      }
      await loadAttendance();
    } catch (e) {
      showToast(
        e.message && e.message.includes("meters from the office")
          ? `You're too far from the office to check in. ${e.message}`
          : e.message || "Something went wrong — please try again."
      );
    } finally {
      setAttendanceBusy(false);
    }
  }

  const attendanceStatus =
    attendance === undefined
      ? "…"
      : !attendance
      ? "Not checked in yet"
      : !attendance.check_out_at
      ? `Checked in at ${fmtTime(attendance.check_in_at)}`
      : `✓ ${fmtTime(attendance.check_in_at)} – ${fmtTime(attendance.check_out_at)} · ${fmtHours(attendance.check_in_at, attendance.check_out_at)}`;
  const attendanceBtnLabel = !attendance ? (
    <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Check In</span>
  ) : !attendance.check_out_at ? (
    <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Check Out</span>
  ) : (
    "Done for today"
  );
  const attendanceDone = !!(attendance && attendance.check_out_at);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (profile?.full_name || "").split(" ")[0] || "there";
  const busyToday = followups && followups.length === 0 && visits.length === 0;

  const visibleLinks = NAV_LINKS.filter((l) => l.to !== "/today" && (!l.adminOnly || isAdmin));

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="text-[11px] font-semibold uppercase tracking-widest2 text-stone-500 mb-3">Admin Panel</div>
      <h1 className="font-display text-[28px] font-medium leading-tight text-ink mb-1.5">Home</h1>
      <p className="text-ink/50 text-[13.5px] mb-6">Jump straight to any module, or see what's on today below.</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
        {visibleLinks.map((l, i) => {
          const a = NAV_ACCENT[l.accent];
          return (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.02, ease: EASE }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <NavLink
                to={l.to}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border border-ink/[0.05] ${a.soft} p-2.5 h-full text-center transition-all hover:border-ink/[0.12] hover:shadow-soft`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/70`}>
                  <l.Icon className={`w-[15px] h-[15px] ${a.text}`} />
                </span>
                <span className="text-[10.5px] font-semibold leading-tight text-ink">{l.label}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-widest2 text-stone-500 mb-3">
        Today · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      </div>
      <h1 className="font-display text-[28px] font-medium leading-tight text-ink mb-2">{greeting}, {firstName}.</h1>
      <p className="text-ink/50 text-[13.5px] mb-8">
        {busyToday ? "You're all caught up — nothing due today." : "Here's what needs your attention today."}
      </p>

      <div className="space-y-4">
        <Card className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/40">Attendance</div>
            <div className="flex items-center gap-1.5 text-[15px] font-semibold text-ink mt-1">
              <Clock3 className="w-4 h-4 text-stone-600" />
              {attendanceStatus}
            </div>
          </div>
          <Button size="sm" disabled={attendanceBusy || attendanceDone || attendance === undefined} onClick={handleAttendanceAction}>
            {attendanceBusy ? "Getting location…" : attendanceBtnLabel}
          </Button>
        </Card>

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
            <div className="space-y-2">
              {visits.map((v) => <VisitCard key={v.id} visit={v} />)}
            </div>
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
      <ReviewTokenModal
        unitId={reviewUnitId}
        onClose={() => setReviewUnitId(null)}
        profile={profile}
        onDecided={() => { setReviewUnitId(null); loadTokens(); }}
      />
      <CallOutcomeWatcher onLogged={refreshAll} />
    </div>
  );
}

function FollowupCard({ lead: l, onOpen }) {
  const initials = (l.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const waNum = waNumberFor(l.phone);
  const isOverdue = l.follow_up_date < todayStr();

  return (
    <div onClick={onOpen} className="bg-stone-50/60 rounded-2xl p-3.5 flex gap-3 cursor-pointer">
      <div className="w-9 h-9 rounded-2xl bg-white text-stone-600 flex items-center justify-center text-xs font-medium shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{l.name} <span className="text-xs font-medium text-ink/35">PC{l.lead_number}</span></div>
        <div className="text-xs text-ink/45">{l.phone}{l.preferred_location ? ` · ${l.preferred_location}` : ""}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <Pill tone="stone">{STATUS_LABELS[l.status] || l.status}</Pill>
          {isOverdue && (
            <Pill tone="red">⏰ Overdue since {new Date(l.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Pill>
          )}
        </div>
        <div className="text-[11px] text-ink/35 mt-1.5">Last contacted: {timeAgo(l.updated_at || l.created_at)}</div>
      </div>
      <div className="flex gap-1.5 items-start" onClick={(e) => e.stopPropagation()}>
        <a href={`tel:${l.phone}`} data-lead-id={l.id} data-lead-name={l.name || ""} className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="Call"><Phone className="w-3.5 h-3.5 text-ink/60" /></a>
        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
      </div>
    </div>
  );
}

function VisitCard({ visit: v }) {
  const initials = (v.client_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const waNum = waNumberFor(v.client_phone);
  return (
    <div className="bg-stone-50/60 rounded-2xl p-3.5 flex gap-3">
      <div className="w-9 h-9 rounded-2xl bg-white text-stone-600 flex items-center justify-center text-xs font-medium shrink-0">{initials}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-ink">{v.client_name}</div>
        <div className="text-xs text-ink/45">{v.listing_title || ""}{v.visit_time ? ` · ${v.visit_time}` : ""}</div>
      </div>
      <div className="flex gap-1.5 items-start">
        <a href={`tel:${v.client_phone}`} className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="Call"><Phone className="w-3.5 h-3.5 text-ink/60" /></a>
        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform" title="WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
      </div>
    </div>
  );
}
