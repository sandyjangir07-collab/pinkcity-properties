import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { sb } from "../lib/supabase";

const AuthContext = createContext(null);

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
    const [{ data: profileRow }, { data: employeeRow }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
      sb.from("employees").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileRow || null);
    setEmployee(employeeRow || null);
  }, []);

  const refreshEmployee = useCallback(async () => {
    if (!session?.user?.id) return;
    // Give the user a chance to auto-link an employee record created for
    // their email before they ever logged in (mirrors login.html behaviour).
    if (!employee) {
      await sb.rpc("link_my_employee_profile").catch(() => {});
    }
    await loadProfileAndEmployee(session.user.id);
  }, [session, employee, loadProfileAndEmployee]);

  useEffect(() => {
    sb.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await sb.rpc("link_my_employee_profile").catch(() => {});
        await loadProfileAndEmployee(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        await loadProfileAndEmployee(newSession.user.id);
      } else {
        setProfile(null);
        setEmployee(null);
      }
    });

    return () => sub.subscription.unsubscribe();
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
