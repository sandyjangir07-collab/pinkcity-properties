import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { STATUS_LABELS, SOURCE_LABELS, STATUS_TEXT, isStaleLead, timeAgo, waNumberFor } from "../lib/leadConstants";
import { IconPlus } from "../components/ui/Icons";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDetailModal from "../components/leads/LeadDetailModal";
import ScheduleVisitModal from "../components/leads/ScheduleVisitModal";
import ScheduleCallModal from "../components/leads/ScheduleCallModal";
import CallOutcomeWatcher from "../components/leads/CallOutcomeWatcher";

// The leads/scheduled_visits/scheduled_calls RLS policies gate admin access by
// this exact email (not profiles.role) — matching dashboard.html's own CRM logic.
const CRM_ADMIN_EMAIL = "sandyjangir07@gmail.com";

export default function Leads() {
  const { user } = useAuth();
  const isAdmin = user?.email === CRM_ADMIN_EMAIL;
  const [leads, setLeads] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formTarget, setFormTarget] = useState(null); // "new" | leadId | null
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [visitTarget, setVisitTarget] = useState(null); // { leadId, name, phone } | null
  const [callTarget, setCallTarget] = useState(null);

  async function load() {
    let q = sb.from("leads").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    if (!isAdmin) q = q.eq("created_by", user.id);
    const { data } = await q;
    setLeads(data || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, refreshKey]);

  const term = search.trim().toLowerCase();
  const filtered = (leads || []).filter((l) => {
    if (!term) return true;
    return (
      (l.name || "").toLowerCase().includes(term) ||
      (l.phone || "").toLowerCase().includes(term) ||
      (l.preferred_location || "").toLowerCase().includes(term) ||
      ("pc" + l.lead_number).includes(term.replace(/\s/g, ""))
    );
  });

  const stats = {
    new: filtered.filter((l) => l.status === "new").length,
    active: filtered.filter((l) => !["closed", "lost", "new"].includes(l.status)).length,
    closed: filtered.filter((l) => l.status === "closed").length,
    total: filtered.length,
  };

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Leads</h1>
      <p className="page-sub">Track every enquiry from first contact to close.</p>

      <div className="crm-stats">
        <div className="stat-card">
          <div className="stat-label">New</div>
          <div className="stat-value">{stats.new}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-value">{stats.closed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
      </div>

      <div className="crm-filter-bar">
        <input className="fi" placeholder="Search name, phone, PC#…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="fsel" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS_TEXT).map((s) => (
            <option key={s} value={s}>{STATUS_TEXT[s]}</option>
          ))}
        </select>
        <button className="btn btn-primary" style={{ width: "auto", marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }} onClick={() => setFormTarget("new")}>
          <IconPlus size={15} stroke="white" /> Add Lead
        </button>
      </div>

      {leads === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">No leads found</div>
          <p>Add your first lead or adjust the filter.</p>
        </div>
      ) : (
        filtered.map((l) => <LeadCard key={l.id} lead={l} onOpen={() => setDetailLeadId(l.id)} />)
      )}

      <LeadFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={({ isNew, lead }) => {
          setFormTarget(null);
          refresh();
          if (isNew) setVisitTarget({ leadId: lead.id, name: lead.name, phone: lead.phone });
        }}
      />
      <LeadDetailModal
        leadId={detailLeadId}
        onClose={() => setDetailLeadId(null)}
        onChanged={refresh}
        onEdit={(id) => {
          setDetailLeadId(null);
          setFormTarget(id);
        }}
        onScheduleVisit={(t) => setVisitTarget(t)}
        onScheduleCall={(t) => setCallTarget(t)}
        onDeleted={() => {
          setDetailLeadId(null);
          refresh();
        }}
      />
      <ScheduleVisitModal
        target={visitTarget}
        onClose={() => setVisitTarget(null)}
        onSaved={() => {
          setVisitTarget(null);
          refresh();
        }}
      />
      <ScheduleCallModal
        target={callTarget}
        onClose={() => setCallTarget(null)}
        onSaved={() => setCallTarget(null)}
      />
      <CallOutcomeWatcher onLogged={refresh} />
    </div>
  );
}

function LeadCard({ lead: l, onOpen }) {
  const initials = (l.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const dateStr = new Date(l.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const stale = isStaleLead(l);
  const waNum = waNumberFor(l.phone);

  return (
    <div className="lead-card" onClick={onOpen}>
      <div className="lead-av">{initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lead-name">
          {l.name} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)" }}>PC{l.lead_number}</span>
        </div>
        <div className="lead-meta">
          {l.phone}
          {l.budget ? ` · ${l.budget}` : ""}
          {l.preferred_location ? ` · ${l.preferred_location}` : ""}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span className="badge">{STATUS_LABELS[l.status] || l.status}</span>
          <span className="lead-source-tag">{SOURCE_LABELS[l.source] || l.source}</span>
          {stale && <span className="badge badge-stale">⏰ Stale</span>}
          {l.possible_duplicate_of && <span className="badge badge-duplicate">⚠️ Possible duplicate</span>}
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5 }}>
          Last contacted: {timeAgo(l.updated_at || l.created_at)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{dateStr}</div>
        <div className="lead-actions" onClick={(e) => e.stopPropagation()}>
          <a
            className="lead-icon-btn"
            href={`tel:${l.phone}`}
            data-lead-id={l.id}
            data-lead-name={l.name || ""}
            title="Call"
          >
            📞
          </a>
          <a className="lead-icon-btn" href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer" title="WhatsApp">
            💬
          </a>
        </div>
      </div>
    </div>
  );
}
