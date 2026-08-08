import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, Check } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { enablePush, getPushSubscriptionStatus, pushSupported } from "../lib/pushNotifications";

const EASE = [0.22, 1, 0.36, 1];

function linkFor(n, employeeId) {
  if (n.type?.startsWith("hierarchy")) return `/employees/${employeeId}`;
  if (n.type === "commission_changed") return `/employees/${employeeId}`;
  if (n.type === "document_approved") return `/employees/${employeeId}`;
  if (n.type === "profile_approved") return `/employees/${employeeId}`;
  return null;
}

export default function NotificationBell() {
  const { user, employee } = useAuth();
  const showToast = useToast();
  const [status, setStatus] = useState("checking");
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(null);
  const [enabling, setEnabling] = useState(false);

  async function loadNotifications() {
    if (!employee?.id) return;
    const { data } = await sb
      .from("employee_notifications")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications(data || []);
  }

  useEffect(() => {
    if (!pushSupported()) {
      setStatus("unsupported");
      return;
    }
    getPushSubscriptionStatus().then(setStatus);
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee?.id]);

  async function handleEnable() {
    setEnabling(true);
    try {
      await enablePush(user.id);
      setStatus("subscribed");
      showToast("✓ Alerts enabled!");
    } catch (e) {
      showToast(e.message || "Could not enable alerts.");
    } finally {
      setEnabling(false);
    }
  }

  async function markRead(id) {
    await sb.from("employee_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    const unreadIds = (notifications || []).filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await sb.from("employee_notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  if (status === "unsupported") return null;

  return (
    <div className="relative">
      {status === "subscribed" ? (
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-ink/60 hover:bg-ink/[0.05] hover:text-stone-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-[18px] h-[18px]" />
          {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-stone-600" />}
        </button>
      ) : (
        <button
          onClick={handleEnable}
          disabled={enabling}
          aria-label="Enable notifications"
          title="Enable notifications"
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-brass hover:bg-brass/10 transition-colors disabled:opacity-50"
        >
          <BellRing className={`w-[18px] h-[18px] ${enabling ? "animate-pulse" : ""}`} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brass" />
        </button>
      )}

      <AnimatePresence>
        {open && status === "subscribed" && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="fixed right-4 top-20 z-50 w-[calc(100vw-2rem)] max-w-[320px] max-h-[70vh] overflow-y-auto rounded-3xl border border-ink/[0.06] bg-white shadow-lift"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-ink/[0.06]">
                <span className="font-display text-base text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              {notifications === null ? (
                <div className="py-10 text-center text-xs text-ink/40">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-ink/40">Nothing yet.</div>
              ) : (
                <div className="py-1.5">
                  {notifications.map((n) => {
                    const to = linkFor(n, employee?.id);
                    const Wrapper = to ? Link : "div";
                    return (
                      <Wrapper
                        key={n.id}
                        to={to || undefined}
                        onClick={() => {
                          if (!n.is_read) markRead(n.id);
                          setOpen(false);
                        }}
                        className={`block px-5 py-3 border-b border-ink/[0.04] last:border-0 transition-colors hover:bg-stone-50/60 ${to ? "cursor-pointer" : ""}`}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-stone-600 mt-1.5 shrink-0" />}
                          <div className={n.is_read ? "ml-4" : ""}>
                            <div className="text-[13px] font-medium text-ink leading-snug">{n.title}</div>
                            {n.body && <div className="text-xs text-ink/50 mt-0.5">{n.body}</div>}
                            <div className="text-[10px] text-ink/35 mt-1">
                              {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      </Wrapper>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
