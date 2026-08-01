import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../lib/supabase";
import { initials } from "../lib/utils";
import { useToast } from "../hooks/useToast";
import { IconCheck, IconX } from "../components/ui/Icons";

export default function Approvals() {
  const [pendingProfiles, setPendingProfiles] = useState(null);
  const [pendingHierarchy, setPendingHierarchy] = useState([]);
  const [names, setNames] = useState({});
  const showToast = useToast();

  async function load() {
    const [{ data: profiles }, { data: hier }] = await Promise.all([
      sb.from("employees").select("*").eq("profile_status", "pending_review").order("created_at"),
      sb.from("employee_hierarchy").select("*").eq("status", "pending"),
    ]);
    setPendingProfiles(profiles || []);
    setPendingHierarchy(hier || []);
    const ids = Array.from(new Set((hier || []).flatMap((h) => [h.junior_id, h.senior_id])));
    if (ids.length) {
      const { data } = await sb.rpc("get_hierarchy_names", { p_ids: ids });
      setNames(Object.fromEntries((data || []).map((r) => [r.id, r])));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function respondProfile(employeeId, approve) {
    const { error } = await sb.rpc("approve_employee_profile", { p_employee_id: employeeId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Profile approved." : "Profile rejected.");
    load();
  }

  async function respondHierarchy(requestId, approve) {
    const { error } = await sb.rpc("respond_hierarchy_request", { p_request_id: requestId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Request approved." : "Request rejected.");
    load();
  }

  if (pendingProfiles === null) {
    return (
      <div className="page">
        <div className="center-loading"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-eyebrow">Admin</div>
      <h1 className="page-title">Pending Approvals</h1>
      <p className="page-sub">New profiles and hierarchy requests waiting for review.</p>

      <div className="card">
        <h2 className="section-title">Pending Profiles</h2>
        {pendingProfiles.length === 0 && <div className="info-row-label">Nothing pending.</div>}
        {pendingProfiles.map((p) => (
          <div key={p.id} className="info-row" style={{ justifyContent: "space-between" }}>
            <Link to={`/employees/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
              <div className="avatar">{p.photo_url ? <img src={p.photo_url} alt="" /> : initials(p.full_name)}</div>
              <div>
                <div className="person-row-name">{p.full_name}</div>
                <div className="person-row-meta">{p.email || p.mobile || "—"}</div>
              </div>
            </Link>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-approve" style={{ padding: "8px 12px" }} onClick={() => respondProfile(p.id, true)}>
                <IconCheck size={14} />
              </button>
              <button className="btn-reject" style={{ padding: "8px 12px" }} onClick={() => respondProfile(p.id, false)}>
                <IconX size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="section-title">Pending Hierarchy Requests</h2>
        {pendingHierarchy.length === 0 && <div className="info-row-label">Nothing pending.</div>}
        {pendingHierarchy.map((h) => (
          <div key={h.id} className="info-row" style={{ justifyContent: "space-between" }}>
            <div className="info-row-value">
              {names[h.junior_id]?.full_name || "—"} reports to {names[h.senior_id]?.full_name || "—"}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-approve" style={{ padding: "8px 12px" }} onClick={() => respondHierarchy(h.id, true)}>
                <IconCheck size={14} />
              </button>
              <button className="btn-reject" style={{ padding: "8px 12px" }} onClick={() => respondHierarchy(h.id, false)}>
                <IconX size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
