import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { STATUS_LABELS, waNumberFor, timeAgo } from "../lib/leadConstants";
import { todayStr, fmtTime, fmtHours, getLocation } from "../lib/attendance";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";
import { ReviewTokenModal } from "./Plots";

export default function Today() {
  const { user, profile, isAdmin } = useAuth();
  const showToast = useToast();
  const [followups, setFollowups] = useState(null);
  const [visits, setVisits] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [listingTitles, setListingTitles] = useState({});
  const [attendance, setAttendance] = useState(undefined); // undefined = loading
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
  const attendanceBtnLabel = !attendance ? "📍 Check In" : !attendance.check_out_at ? "📍 Check Out" : "Done for today";
  const attendanceDone = !!(attendance && attendance.check_out_at);

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Today</h1>
      <p className="page-sub">Your follow-ups, visits, and attendance for {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.</p>

      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="section-title" style={{ margin: 0, fontSize: 16 }}>Attendance</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>{attendanceStatus}</div>
        </div>
        <button className="btn btn-primary" style={{ width: "auto" }} disabled={attendanceBusy || attendanceDone || attendance === undefined} onClick={handleAttendanceAction}>
          {attendanceBusy ? "Getting location…" : attendanceBtnLabel}
        </button>
      </div>

      {isAdmin && (
        <div className="card">
          <h2 className="section-title">Pending Token Reviews</h2>
          {tokens.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No token submissions waiting on you.</div>
          ) : (
            tokens.map((t) => {
              const unitLabel = t.colony_units?.unit_number ? `Plot ${t.colony_units.unit_number}` : "Plot";
              const listingTitle = listingTitles[t.listing_id] || "";
              return (
                <div key={t.id} className="lead-card" onClick={() => setReviewUnitId(t.unit_id)}>
                  <div className="lead-av">🔑</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lead-name">
                      {unitLabel}
                      {listingTitle ? ` · ${listingTitle}` : ""}
                    </div>
                    <div className="lead-meta">
                      {t.buyer_name || "—"}
                      {t.associate_name ? ` · ${t.associate_name}` : ""}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>Submitted {timeAgo(t.submitted_at)}</div>
                  </div>
                  <span className="pill pill-primary">🔍 Review</span>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="card">
        <h2 className="section-title">Follow-ups Due</h2>
        {followups === null ? (
          <div className="center-loading"><div className="spinner" /></div>
        ) : followups.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nothing due today. You're all caught up.</div>
        ) : (
          followups.map((l) => <FollowupCard key={l.id} lead={l} onOpen={() => setDetailLeadId(l.id)} />)
        )}
      </div>

      <div className="card">
        <h2 className="section-title">Visits Today</h2>
        {visits.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No visits scheduled for today.</div>
        ) : (
          visits.map((v) => <VisitCard key={v.id} visit={v} />)
        )}
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
    <div className="lead-card" onClick={onOpen}>
      <div className="lead-av">{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lead-name">
          {l.name} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>PC{l.lead_number}</span>
        </div>
        <div className="lead-meta">
          {l.phone}
          {l.preferred_location ? ` · ${l.preferred_location}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge">{STATUS_LABELS[l.status] || l.status}</span>
          {isOverdue && (
            <span className="badge badge-duplicate">
              ⏰ Overdue since {new Date(l.follow_up_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>Last contacted: {timeAgo(l.updated_at || l.created_at)}</div>
      </div>
      <div className="lead-actions" onClick={(e) => e.stopPropagation()}>
        <a className="lead-icon-btn" href={`tel:${l.phone}`} data-lead-id={l.id} data-lead-name={l.name || ""} title="Call">📞</a>
        <a className="lead-icon-btn" href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
      </div>
    </div>
  );
}

function VisitCard({ visit: v }) {
  const initials = (v.client_name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const waNum = waNumberFor(v.client_phone);
  return (
    <div className="lead-card">
      <div className="lead-av">{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lead-name">{v.client_name}</div>
        <div className="lead-meta">
          {v.listing_title || ""}
          {v.visit_time ? ` · ${v.visit_time}` : ""}
        </div>
      </div>
      <div className="lead-actions">
        <a className="lead-icon-btn" href={`tel:${v.client_phone}`} title="Call">📞</a>
        <a className="lead-icon-btn" href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
      </div>
    </div>
  );
}
