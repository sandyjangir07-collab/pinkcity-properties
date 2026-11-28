import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { CALLS_EVENT, fetchCallStats, istDate, sumStats } from "../lib/calls";
import { useWindowEvent } from "./useWindowEvent";

// The signed-in person's own calls today (null until loaded).
export function useMyCalls() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const t = istDate();
      const rows = (await fetchCallStats(t, t)).filter((r) => r.user_id === user.id);
      setStats(sumStats(rows));
    } catch (e) {
      console.error("Calls today failed:", e);
    }
  }, [user]);
  useEffect(() => { load(); }, [load]);
  useWindowEvent(CALLS_EVENT, load);
  return stats;
}
