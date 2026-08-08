import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { STATUS_LABELS, waNumberFor, timeAgo } from "../lib/leadConstants";
import { todayStr, fmtTime, fmtHours, getLocation } from "../lib/attendance";
import { Phone, MessageCircle, Key, Search, MapPin, Clock3, CalendarDays, AlertTriangle, ChevronRight, ArrowUpRight, Sparkles, CheckCircle2, Home as HomeIcon, Users, Ticket } from "lucide-react";
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
  const [submissions, setSubmissions] = useState(null);

  async function loadSubmissions() {
    if (!isAdmin) return;
    const { data } = await sb
      .from("listings")
      .select("id,title,type,status,created_by_name,created_at")
      .order("created_at", { ascending: false })
      .limit(3);
    setSubmissions(data || []);
  }

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
    loadSubmissions();
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

  const overdueCount = (followups || []).filter((l) => l.follow_up_date < todayStr()).length;

  const GROUPS = [
    { title: "Sales & Leads", caption: "Pipeline, inventory and paperwork", paths: ["/leads", "/listings", "/plots", "/schedule", "/quotation"] },
    { title: "Team & Admin", caption: "People, compliance and payouts", paths: ["/team", "/attendance", "/commission-slabs", "/performance", "/blogs", "/approvals"] },
  ];

  return (
    <div className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed -left-24 -top-16 h-72 w-72 rounded-full bg-stone-500/[0.12] blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -right-20 top-52 h-64 w-64 rounded-full bg-brass/[0.16] blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-5 py-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">Admin Panel</div>
        <h1 className="mt-2 font-display text-[38px] font-semibold leading-[0.98] tracking-tight text-ink">Home</h1>
        <p className="mt-2.5 max-w-[30ch] text-[13.5px] leading-relaxed text-ink/50">Jump straight to any module, or see what&apos;s on today below.</p>

        {GROUPS.map((group) => {
          const items = visibleLinks.filter((l) => group.paths.includes(l.to));
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mt-9">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">{group.title}</div>
                  <div className="mt-1 text-[11.5px] text-ink/35">{group.caption}</div>
                </div>
                <span className="h-px flex-1 -translate-y-0.5 bg-gradient-to-r from-ink/10 to-transparent" />
              </div>
              <div className="mt-3.5 grid grid-cols-3 gap-2.5">
                {items.map((l, i) => {
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
                        className={`flex aspect-[1/1.05] flex-col items-center justify-center gap-2 rounded-[22px] border border-ink/[0.05] ${a.soft} px-1.5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift`}
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80">
                          <l.Icon className={`w-[16px] h-[16px] ${a.text}`} />
                        </span>
                        <span className="text-[11px] font-semibold leading-tight text-ink">{l.label}</span>
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-11 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-600">
          Today · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </div>
        <h2 className="mt-2.5 font-display text-[27px] font-medium leading-tight tracking-tight text-ink">{greeting}, {firstName}.</h2>
        <p className="mt-2 text-[13.5px] text-ink/50">
          {busyToday ? "You're all caught up — nothing due today." : "Here's what needs your attention today."}
        </p>

        {/* Attendance — solid card, matching Prime's exact treatment */}
        <div className="relative mt-5 overflow-hidden rounded-[26px] border border-stone-700/20 bg-stone-600 p-5 shadow-lift">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brass/40 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sand/60">Attendance</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[15px] font-semibold text-sand">
                <Clock3 className="w-4 h-4 shrink-0" />
                {attendanceStatus}
              </div>
            </div>
            <button
              onClick={handleAttendanceAction}
              disabled={attendanceBusy || attendanceDone || attendance === undefined}
              className="ml-auto shrink-0 rounded-full bg-white px-5 py-3 text-[13.5px] font-semibold text-stone-600 shadow-soft transition-transform active:scale-95 disabled:opacity-60"
            >
              {attendanceBusy ? "Getting location…" : attendanceBtnLabel}
            </button>
          </div>
        </div>

        {/* Stats — real counts, not placeholder */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] border border-brass/25 bg-brass/10 p-4">
            <CalendarDays className="h-[17px] w-[17px] text-brass" />
            <div className="mt-2.5 font-display text-[28px] font-semibold leading-none text-ink">{followups === null ? "—" : followups.length}</div>
            <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Follow-ups today</div>
          </div>
          <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-4">
            <AlertTriangle className="h-[17px] w-[17px] text-stone-600" />
            <div className="mt-2.5 font-display text-[28px] font-semibold leading-none text-ink">{followups === null ? "—" : overdueCount}</div>
            <div className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-ink/40">Overdue</div>
          </div>
        </div>

        {/* Recent submissions — real listings, not demo data */}
        {isAdmin && (
          <div className="mt-9">
            <div className="flex items-end justify-between">
              <h3 className="font-display text-[19px] font-medium text-ink">Recent submissions</h3>
              <NavLink to="/listings" className="inline-flex items-center gap-1 text-[12px] font-semibold text-stone-600">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </NavLink>
            </div>
            <div className="mt-3 space-y-2.5">
              {submissions === null ? (
                <div className="flex justify-center py-6"><BrandedLoader size={22} /></div>
              ) : submissions.length === 0 ? (
                <div className="text-sm text-ink/40 py-2">No listings submitted yet.</div>
              ) : (
                submissions.map((s) => (
                  <NavLink
                    key={s.id}
                    to="/listings"
                    className="flex items-center gap-3 rounded-[22px] border border-ink/[0.05] bg-white px-4 py-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-600 ring-2 ring-stone-500/10">
                      <HomeIcon className="h-[16px] w-[16px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{s.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-ink/40">
                        {s.type} · {s.created_by_name || "—"} · {timeAgo(s.created_at)}
                      </span>
                    </span>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-brass/15 text-brass"}`}>
                      {s.status === "active" ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock3 className="h-2.5 w-2.5" />}
                      {s.status === "active" ? "Approved" : "Pending"}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
                  </NavLink>
                ))
              )}
            </div>

            <NavLink to="/leads" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-stone-600 py-4 text-[13.5px] font-semibold text-sand shadow-lift transition-transform active:scale-[0.98]">
              <Sparkles className="h-4 w-4" />
              Open leads pipeline
            </NavLink>

            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <NavLink to="/team" className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white py-3.5 text-[12.5px] font-semibold text-ink shadow-soft">
                <Users className="h-4 w-4 text-stone-600" />
                Team
              </NavLink>
              <NavLink to="/plots" className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-white py-3.5 text-[12.5px] font-semibold text-ink shadow-soft">
                <Ticket className="h-4 w-4 text-stone-600" />
                New token
              </NavLink>
            </div>
          </div>
        )}

      <div className="space-y-4 mt-9">
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
