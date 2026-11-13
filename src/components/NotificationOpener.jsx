import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { notificationTarget } from "../lib/notificationTarget";
import { leadAvailable } from "../lib/leadOpen";
import LeadModals from "./leads/LeadModals";

const Ctx = createContext(null);

// Lets any part of the app "open" a notification: marks it read, then goes to the right
// page, or opens the lead's full screen. Phone-push taps arrive as /?n=<notification id>
// and are handled here too, so the bell and the phone behave the same.
export function NotificationOpenerProvider({ children }) {
  const { employee } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [leadId, setLeadId] = useState(null);
  const handled = useRef(null);

  const open = useCallback(
    async (n) => {
      if (!n) return;
      if (!n.is_read && n.id) sb.from("employee_notifications").update({ is_read: true }).eq("id", n.id).then(() => {});
      const target = notificationTarget(n, employee?.id);
      if (target.leadId) {
        if (await leadAvailable(target.leadId)) setLeadId(target.leadId);
        else showToast("That lead isn't available any more.");
        return;
      }
      navigate(target.path);
    },
    [employee?.id, navigate, showToast]
  );

  // A tapped phone notification: fetch it, then open it like a bell tap.
  const openById = useCallback(
    async (id) => {
      const { data } = await sb.from("employee_notifications").select("*").eq("id", id).maybeSingle();
      if (data) open(data);
    },
    [open]
  );

  // Cold start: the app was closed and the tap opened it at /?n=<id>.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("n");
    if (!id || !employee?.id || handled.current === id) return;
    handled.current = id;
    navigate(location.pathname, { replace: true }); // drop ?n= so a refresh doesn't re-open it
    openById(id);
  }, [location.search, location.pathname, employee?.id, navigate, openById]);

  // Warm start: the app was already open; the service worker passes the link along.
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    function onMessage(e) {
      if (e.data?.type !== "open-url") return;
      const id = new URL(e.data.url, window.location.origin).searchParams.get("n");
      if (id) openById(id);
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [openById]);

  return (
    <Ctx.Provider value={open}>
      {children}
      <LeadModals leadId={leadId} onClose={() => setLeadId(null)} onChanged={() => {}} />
    </Ctx.Provider>
  );
}

export function useOpenNotification() {
  return useContext(Ctx) || (() => {});
}
