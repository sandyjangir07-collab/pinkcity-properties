import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { todayStr } from "../lib/attendance";
import { waNumberFor } from "../lib/leadConstants";
import { IconPlus } from "../components/ui/Icons";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";

const STATUS_CLASS = { done: "pill-green", cancelled: "pill-red", no_show: "pill-red" };
const STATUS_LABEL = { done: "✓ Done", cancelled: "Cancelled", no_show: "No Show", scheduled: "Scheduled" };

export default function Schedule() {
  const { user, isAdmin } = useAuth();
  const showToast = useToast();
  const [filter, setFilter] = useState("upcoming");
  const [visits, setVisits] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);

  async function load() {
    const today = todayStr();
    let q = sb.from("scheduled_visits").select("*").order("visit_date", { ascending: true }).order("visit_time", { ascending: true });
    if (filter === "upcoming") q = q.gte("visit_date", today).in("status", ["scheduled"]);
    else if (filter === "done") q = q.eq("status", "done");
    else if (filter === "cancelled") q = q.in("status", ["cancelled", "no_show"]);
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    setVisits(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function markDone(id) {
    await sb.from("scheduled_visits").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", id);
    showToast("✓ Marked as done!");
    load();
  }
  async function cancel(id) {
    if (!window.confirm("Cancel this visit?")) return;
    await sb.from("scheduled_visits").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    showToast("Visit cancelled.");
    load();
  }

  const today = todayStr();
  const todayVisits = (visits || []).filter((v) => v.visit_date === today && v.status === "scheduled");
  const rest = (visits || []).filter((v) => v.visit_date !== today);

  return (
    <div className="page">
      <div className="page-eyebrow">Site Visits</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Visit Calendar</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <select className="fsel" style={{ width: "auto", padding: "9px 14px", fontSize: 13 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="all">All</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary" style={{ width: "auto", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setVisitTarget({ leadId: null, name: "", phone: "" })}>
            <IconPlus size={14} stroke="white" /> Schedule Visit
          </button>
        </div>
      </div>

      {visits === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : (
        <>
          {todayVisits.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--primary)", marginBottom: 12 }}>
                TODAY — {todayVisits.length} visit{todayVisits.length > 1 ? "s" : ""}
              </div>
              {todayVisits.map((v) => (
                <SchedCard key={v.id} visit={v} isToday onDone={markDone} onCancel={cancel} />
              ))}
            </div>
          )}

          {rest.length === 0 && todayVisits.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-title">No visits found</div>
            </div>
          ) : (
            rest.map((v) => <SchedCard key={v.id} visit={v} onDone={markDone} onCancel={cancel} />)
          )}
        </>
      )}

      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); load(); }} />
    </div>
  );
}

function SchedCard({ visit: v, isToday, onDone, onCancel }) {
  const d = new Date(v.visit_date + "T00:00:00");
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  const waNum = waNumberFor(v.client_phone);

  return (
    <div className="card" style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 10, padding: 16 }}>
      <div
        style={{
          textAlign: "center",
          flexShrink: 0,
          background: isToday ? "var(--primary)" : "var(--secondary)",
          color: isToday ? "white" : "var(--foreground)",
          borderRadius: 12,
          padding: "8px 12px",
          minWidth: 56,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{day}</div>
        <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{mon}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          {v.client_name}
          {v.client_phone ? ` · ${v.client_phone}` : ""}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginTop: 2 }}>{v.listing_title || "—"}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
          <span className="pill pill-neutral">🕐 {v.visit_time}</span>
          {v.status !== "scheduled" && <span className={"pill " + (STATUS_CLASS[v.status] || "pill-neutral")}>{STATUS_LABEL[v.status]}</span>}
          {v.notes && <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{v.notes}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "flex-end" }}>
        {v.client_phone && (
          <div style={{ display: "flex", gap: 6 }}>
            <a className="lead-icon-btn" href={`tel:${v.client_phone}`} title="Call">📞</a>
            <a className="lead-icon-btn" href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" title="WhatsApp">💬</a>
          </div>
        )}
        {v.status === "scheduled" && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn-approve" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => onDone(v.id)}>✓ Done</button>
            <button className="btn-reject" style={{ padding: "6px 10px", fontSize: 11 }} onClick={() => onCancel(v.id)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
