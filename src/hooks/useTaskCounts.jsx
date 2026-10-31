import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { todayStr } from "../lib/dates";

// Live numbers for Home, the Tasks tab and its badge. Fetched once for the whole
// app and refreshed when the app comes back to the screen (or every 5 minutes).

const Ctx = createContext({ counts: null, refresh: () => {} });
export const useTaskCounts = () => useContext(Ctx);

const head = async (q) => {
  const { count, error } = await q;
  return error ? 0 : count || 0;
};

export function TaskCountsProvider({ children }) {
  const { user, isAdmin, employee } = useAuth();
  const uid = user?.id;
  const employeeId = employee?.id;
  const [counts, setCounts] = useState(null);

  const refresh = useCallback(async () => {
    if (!uid) return;
    const today = todayStr();
    const mine = `created_by.eq.${uid},assigned_to.eq.${uid}`;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const count = (table, apply) => head(apply(sb.from(table).select("id", { count: "exact", head: true })));

    const [fu, visitsToday, newLeads, activeListings, availableResale, soldThisMonth] = await Promise.all([
      sb.from("leads").select("follow_up_date").is("deleted_at", null).or(mine).not("status", "in", "(closed,lost)").lte("follow_up_date", today).not("follow_up_date", "is", null),
      count("scheduled_visits", (q) => q.or(mine).eq("visit_date", today).neq("status", "cancelled")),
      count("leads", (q) => q.is("deleted_at", null).eq("status", "new")),
      count("listings", (q) => q.eq("status", "active")),
      count("resale_plots", (q) => q.eq("status", "available").eq("archived", false)),
      count("token_submissions", (q) => q.eq("status", "approved").gte("reviewed_at", monthStart)),
    ]);
    const rows = fu.data || [];
    const next = {
      followupsToday: rows.filter((r) => r.follow_up_date === today).length,
      overdue: rows.filter((r) => r.follow_up_date < today).length,
      visitsToday, newLeads, activeListings, availableResale, soldThisMonth,
      tokensPending: 0, profilesPending: 0, hierarchyPending: 0, listingsPending: 0, resaleRequests: 0, payoutDisputes: 0, payoutsToConfirm: 0,
    };
    if (isAdmin) {
      const [tokens, profiles, hierarchy, listings, requests, disputes] = await Promise.all([
        count("token_submissions", (q) => q.eq("status", "pending")),
        count("employees", (q) => q.eq("profile_status", "pending_review")),
        count("employee_hierarchy", (q) => q.eq("status", "pending")),
        count("listings", (q) => q.eq("status", "pending")),
        count("resale_plot_requests", (q) => q.eq("status", "open")),
        count("commission_payouts", (q) => q.eq("status", "disputed")),
      ]);
      Object.assign(next, { tokensPending: tokens, profilesPending: profiles, hierarchyPending: hierarchy, listingsPending: listings, resaleRequests: requests, payoutDisputes: disputes });
    }
    if (employeeId) {
      next.payoutsToConfirm = await count("commission_payouts", (q) => q.eq("employee_id", employeeId).eq("status", "pending"));
    }
    next.actionTotal =
      next.overdue + next.followupsToday + next.visitsToday + next.tokensPending + next.profilesPending +
      next.hierarchyPending + next.listingsPending + next.resaleRequests + next.payoutDisputes + next.payoutsToConfirm;
    setCounts(next);
  }, [uid, isAdmin, employeeId]);

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
