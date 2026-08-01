import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { STATUS_LABELS } from "../lib/leadConstants";
import { Modal, ModalHero } from "../components/ui/Modal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";

export default function Performance() {
  const [members, setMembers] = useState(null);
  const [totals, setTotals] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    const [{ data: listings }, { data: visits }, { data: leads }, { data: profiles }] = await Promise.all([
      sb.from("listings").select("uid,submitter_name,status"),
      sb.from("visits").select("logged_by,logged_by_name,visitor_name,visitor_phone,listing_title,visit_date,visit_time"),
      sb.from("leads").select("id,created_by,created_by_name,status,name,phone,preferred_location,lead_number"),
      sb.from("profiles").select("id,full_name,email,role"),
    ]);

    setTotals({
      listings: (listings || []).length,
      visits: (visits || []).length,
      leads: (leads || []).length,
      closed: (leads || []).filter((l) => l.status === "closed").length,
    });

    const byId = {};
    (profiles || [])
      .filter((p) => p.role !== "admin")
      .forEach((p) => {
        byId[p.id] = { name: p.full_name || p.email, email: p.email, listings: 0, visits: 0, leads: 0, closed: 0, leadList: [], visitList: [] };
      });
    const ensure = (id, fallbackName) => {
      if (id && !byId[id]) byId[id] = { name: fallbackName || "Team", email: "", listings: 0, visits: 0, leads: 0, closed: 0, leadList: [], visitList: [] };
    };
    (listings || []).forEach((l) => ensure(l.uid, l.submitter_name));
    (visits || []).forEach((v) => ensure(v.logged_by, v.logged_by_name));
    (leads || []).forEach((l) => ensure(l.created_by, l.created_by_name));

    (listings || []).forEach((l) => {
      if (byId[l.uid]) byId[l.uid].listings++;
    });
    (visits || []).forEach((v) => {
      if (byId[v.logged_by]) {
        byId[v.logged_by].visits++;
        byId[v.logged_by].visitList.push(v);
      }
    });
    (leads || []).forEach((l) => {
      if (byId[l.created_by]) {
        byId[l.created_by].leads++;
        byId[l.created_by].leadList.push(l);
        if (l.status === "closed") byId[l.created_by].closed++;
      }
    });

    const list = Object.entries(byId).sort((a, b) => b[1].listings + b[1].visits + b[1].leads - (a[1].listings + a[1].visits + a[1].leads));
    setMembers(list);
  }

  useEffect(() => {
    load();
  }, []);

  const detail = detailId && members ? members.find(([id]) => id === detailId) : null;

  return (
    <div className="page">
      <div className="page-eyebrow">Admin</div>
      <h1 className="page-title">Performance</h1>
      <p className="page-sub">Team activity across listings, leads, and site visits.</p>

      {totals && (
        <div className="stat-grid">
          <div className="stat-card"><div className="stat-label">Listings</div><div className="stat-value">{totals.listings}</div></div>
          <div className="stat-card"><div className="stat-label">Site Visits</div><div className="stat-value">{totals.visits}</div></div>
          <div className="stat-card"><div className="stat-label">Leads</div><div className="stat-value">{totals.leads}</div></div>
          <div className="stat-card"><div className="stat-label">Closed</div><div className="stat-value">{totals.closed}</div></div>
        </div>
      )}

      {members === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : members.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">No team members yet</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {members.map(([id, m]) => {
            const initials = (m.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={id} className="card" style={{ cursor: "pointer" }} onClick={() => setDetailId(id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div className="avatar">{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MiniStat n={m.listings} label="Listings" />
                  <MiniStat n={m.leads} label="Leads" />
                  <MiniStat n={m.visits} label="Site Visits" />
                  <MiniStat n={m.closed} label="Closed" color="#22c55e" />
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--primary)", fontWeight: 600, marginTop: 10 }}>View leads &amp; visits →</div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetailId(null)}>
        {detail && (
          <>
            <ModalHero title={detail[1].name} sub={detail[1].email} />
            <div className="modal-body">
              <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Leads</div>
              {detail[1].leadList.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "8px 0" }}>No leads yet.</div>
              ) : (
                detail[1].leadList.map((l) => (
                  <div
                    key={l.id}
                    className="info-row"
                    style={{ justifyContent: "space-between", cursor: "pointer" }}
                    onClick={() => {
                      setDetailId(null);
                      setDetailLeadId(l.id);
                    }}
                  >
                    <div>
                      <div className="info-row-value">
                        {l.name || "—"} <span style={{ fontWeight: 500, color: "var(--muted-foreground)" }}>PC{l.lead_number}</span>
                      </div>
                      <div className="info-row-label">{[l.phone, l.preferred_location].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span className="badge">{STATUS_LABELS[l.status] || l.status}</span>
                  </div>
                ))
              )}

              <div className="divider" />
              <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Site Visits</div>
              {detail[1].visitList.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--muted-foreground)", padding: "8px 0" }}>No visits logged yet.</div>
              ) : (
                detail[1].visitList.map((v, i) => {
                  const d = v.visit_date ? new Date(v.visit_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
                  return (
                    <div key={i} className="info-row" style={{ justifyContent: "space-between" }}>
                      <div>
                        <div className="info-row-value">{v.visitor_name || "—"}</div>
                        <div className="info-row-label">{[v.listing_title, v.visitor_phone].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textAlign: "right" }}>
                        {d}
                        {v.visit_time && <div>{v.visit_time}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </Modal>

      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={load}
        onEdit={() => setDetailLeadId(null)}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => {
          setDetailLeadId(null);
          load();
        }}
      />
      <ScheduleVisitModal target={visitTarget} onClose={() => setVisitTarget(null)} onSaved={() => { setVisitTarget(null); load(); }} />
      <ScheduleCallModal target={callTarget} onClose={() => setCallTarget(null)} onSaved={() => setCallTarget(null)} />
    </div>
  );
}

function MiniStat({ n, label, color }) {
  return (
    <div style={{ textAlign: "center", background: "var(--secondary)", borderRadius: 12, padding: "8px 4px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: color || "var(--foreground)" }}>{n}</div>
      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{label}</div>
    </div>
  );
}
