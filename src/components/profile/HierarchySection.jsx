import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sb } from "../../lib/supabase";
import { initials } from "../../lib/utils";
import { IconUsers, IconPlus, IconCheck, IconX } from "../ui/Icons";
import { Modal, ModalHero } from "../ui/Modal";
import { useToast } from "../../hooks/useToast";

export default function HierarchySection({ employee, isAdmin, canEdit, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [names, setNames] = useState({});
  const [requestMode, setRequestMode] = useState(null); // "senior" | "associate" | null
  const showToast = useToast();

  async function load() {
    const { data } = await sb
      .from("employee_hierarchy")
      .select("*")
      .or(`junior_id.eq.${employee.id},senior_id.eq.${employee.id}`);
    const list = data || [];
    setRows(list);
    const otherIds = Array.from(
      new Set(list.map((r) => (r.junior_id === employee.id ? r.senior_id : r.junior_id)))
    );
    if (otherIds.length) {
      const { data: resolved } = await sb.rpc("get_hierarchy_names", { p_ids: otherIds });
      const byId = Object.fromEntries((resolved || []).map((r) => [r.id, r]));
      setNames(byId);
    } else {
      setNames({});
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  const seniors = rows.filter((r) => r.junior_id === employee.id && r.status === "approved");
  const associates = rows.filter((r) => r.senior_id === employee.id && r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending");

  async function respond(requestId, approve) {
    const { error } = await sb.rpc("respond_hierarchy_request", { p_request_id: requestId, p_approve: approve });
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(approve ? "Hierarchy request approved." : "Hierarchy request rejected.");
    load();
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Hierarchy
        </h2>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => setRequestMode("senior")}>
              + Senior
            </button>
            <button className="btn btn-secondary" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => setRequestMode("associate")}>
              + Associate
            </button>
          </div>
        )}
      </div>

      <PersonList title="Senior" items={seniors.map((r) => names[r.senior_id])} icon={<IconUsers size={16} />} />
      <PersonList title="Associates" items={associates.map((r) => names[r.junior_id])} icon={<IconUsers size={16} />} />

      {pending.length > 0 && isAdmin && (
        <>
          <div className="divider" />
          <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>Pending Requests</div>
          {pending.map((r) => {
            const other = names[r.junior_id === employee.id ? r.senior_id : r.junior_id];
            const asSenior = r.junior_id === employee.id;
            return (
              <div key={r.id} className="info-row" style={{ justifyContent: "space-between" }}>
                <div className="info-row-value">
                  {other?.full_name || "Unknown"} as {asSenior ? "senior" : "associate"}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-approve" style={{ padding: "6px 10px" }} onClick={() => respond(r.id, true)}>
                    <IconCheck size={13} />
                  </button>
                  <button className="btn-reject" style={{ padding: "6px 10px" }} onClick={() => respond(r.id, false)}>
                    <IconX size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      <RequestLinkModal
        mode={requestMode}
        onClose={() => setRequestMode(null)}
        employeeId={employee.id}
        onSent={() => {
          setRequestMode(null);
          showToast("Request sent — waiting for admin approval.");
          load();
        }}
      />
    </div>
  );
}

function PersonList({ title, items, icon }) {
  const valid = items.filter(Boolean);
  return (
    <>
      <div className="hierarchy-group-label" style={{ margin: "10px 0 6px" }}>{title}</div>
      {valid.length === 0 && <div className="info-row-label" style={{ paddingLeft: 4 }}>None</div>}
      {valid.map((p) => (
        <Link key={p.id} to={`/employees/${p.id}`} className="person-row">
          <div className="avatar">{p.photo_url ? <img src={p.photo_url} alt="" /> : initials(p.full_name)}</div>
          <div>
            <div className="person-row-name">{p.full_name}</div>
            <div className="person-row-meta">{p.designation || "—"}</div>
          </div>
        </Link>
      ))}
    </>
  );
}

function RequestLinkModal({ mode, onClose, employeeId, onSent }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    if (!mode) {
      setQuery("");
      setResults([]);
    }
  }, [mode]);

  useEffect(() => {
    if (!mode || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await sb.rpc("search_employees_directory", { p_query: query.trim() });
      setResults((data || []).filter((r) => r.id !== employeeId));
    }, 250);
    return () => clearTimeout(t);
  }, [query, mode, employeeId]);

  async function pick(targetId) {
    setBusy(true);
    const { error } = await sb.rpc("request_hierarchy_link", {
      p_employee_id: employeeId,
      p_target_employee_id: targetId,
      p_as_senior: mode === "senior",
    });
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    onSent();
  }

  return (
    <Modal open={!!mode} onClose={onClose}>
      <ModalHero
        icon={<IconPlus size={20} stroke="var(--primary)" />}
        title={mode === "senior" ? "Request a Senior" : "Add an Associate"}
        sub="Search the team directory — this needs admin approval before it takes effect."
      />
      <div className="modal-body">
        <div className="field">
          <input className="fi" placeholder="Search by name…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </div>
        {results.map((r) => (
          <div key={r.id} className="person-row" onClick={() => !busy && pick(r.id)} style={{ cursor: "pointer" }}>
            <div className="avatar">{r.photo_url ? <img src={r.photo_url} alt="" /> : initials(r.full_name)}</div>
            <div>
              <div className="person-row-name">{r.full_name}</div>
              <div className="person-row-meta">{r.designation || "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
