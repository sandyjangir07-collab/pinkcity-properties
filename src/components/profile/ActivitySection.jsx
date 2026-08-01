import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { formatDateTime } from "../../lib/utils";
import { IconActivity } from "../ui/Icons";

export default function ActivitySection({ employee, refreshKey }) {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    sb.from("employee_activity_logs")
      .select("*")
      .eq("employee_id", employee.id)
      .order("performed_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setLogs(data || []));
  }, [employee.id, refreshKey]);

  if (!logs) return null;

  return (
    <div className="card">
      <h2 className="section-title">Activity</h2>
      {logs.length === 0 && <div className="info-row-label">No activity yet.</div>}
      {logs.map((l) => (
        <div key={l.id} className="info-row">
          <div className="info-row-icon">
            <IconActivity size={15} />
          </div>
          <div>
            <div className="info-row-value">{l.description || l.action_type}</div>
            <div className="info-row-label">
              {formatDateTime(l.performed_at)}
              {l.performed_by_name ? ` · ${l.performed_by_name}` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
