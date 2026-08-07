import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { sb } from "../lib/supabase";

const AuthContext = createContext(null);

// Supabase's query/RPC builders are "thenable" (work with await) but are NOT
// full native Promises — they don't have their own .catch()/.finally(). Chaining
// .catch() directly on one throws a TypeError immediately. Always route through
// a real try/catch (or Promise.resolve(...).catch(...)) instead.
async function safeRpc(name, args) {
  try {
    return await sb.rpc(name, args);
  } catch (e) {
    console.error(`RPC ${name} failed:`, e);
    return { data: null, error: e };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null); // profiles row (role: admin | team)
  const [employee, setEmployee] = useState(null); // own employees row, if any
  const [loading, setLoading] = useState(true);

  const loadProfileAndEmployee = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setEmployee(null);
      return;
    }
    try {
      const [{ data: profileRow }, { data: employeeRow }] = await Promise.all([
        sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
        sb.from("employees").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      setProfile(profileRow || null);
      setEmployee(employeeRow || null);
    } catch (e) {
      console.error("Failed to load profile/employee:", e);
    }
  }, []);

  const refreshEmployee = useCallback(async () => {
    if (!session?.user?.id) return;
    // Give the user a chance to auto-link an employee record created for
    // their email before they ever logged in (mirrors login.html behaviour).
    if (!employee) {
      await safeRpc("link_my_employee_profile");
    }
    await loadProfileAndEmployee(session.user.id);
  }, [session, employee, loadProfileAndEmployee]);

  useEffect(() => {
    sb.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session ?? null);
        if (data.session?.user?.id) {
          await safeRpc("link_my_employee_profile");
          await loadProfileAndEmployee(data.session.user.id);
        }
      })
      .catch((e) => {
        console.error("getSession failed:", e);
        setSession(null);
      })
      .finally(() => {
        // Guaranteed to run no matter what fails above — the spinner must
        // never be left stuck on.
        setLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        await loadProfileAndEmployee(newSession.user.id);
        // This tab is the Google-auth popup, not the main app window — its
        // only job was to establish the session (written to localStorage,
        // same origin as the opener). Close immediately instead of
        // rendering the app inside the popup.
        if (window.opener && window.opener !== window) {
          window.close();
        }
      } else {
        setProfile(null);
        setEmployee(null);
      }
    });

    // iOS/Android can throttle or pause timers while the PWA is backgrounded,
    // so Supabase's own auto-refresh can miss a beat. Re-checking on resume
    // catches that instead of leaving a stale/expired token sitting around
    // until the next API call fails.
    function onVisible() {
      if (document.visibilityState === "visible") {
        sb.auth.getSession().catch((e) => console.error("Resume session check failed:", e));
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = profile?.role === "admin";

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    employee,
    isAdmin,
    loading,
    refreshEmployee,
    signOut: () => sb.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
