import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { formatDateTime } from "../../lib/utils";
import { Card, SectionTitle } from "../ui/primitives";

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
    <Card>
      <SectionTitle>Activity</SectionTitle>
      {logs.length === 0 && <div className="text-sm text-ink/40">No activity yet.</div>}
      <div className="space-y-4">
        {logs.map((l) => (
          <div key={l.id} className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-stone-50 text-stone-600 flex items-center justify-center shrink-0 mt-0.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </span>
            <div>
              <div className="text-sm text-ink">{l.description || l.action_type}</div>
              <div className="text-xs text-ink/40 mt-0.5">
                {formatDateTime(l.performed_at)}
                {l.performed_by_name ? ` · ${l.performed_by_name}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
