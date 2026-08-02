import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users, Calendar, Phone, Home as HomeIcon, Ticket, CalendarClock, Clock,
  FileText, TrendingUp, Newspaper, CheckCircle, BadgeIndianRupee,
  Menu, X, ExternalLink,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const PUBLIC_SITE_URL = "https://pinkcity-front-end.vercel.app";

const LINKS = [
  { to: "/", end: true, label: "Team", Icon: Users },
  { to: "/today", label: "Today", Icon: Calendar },
  { to: "/leads", label: "Leads", Icon: Phone },
  { to: "/listings", label: "Listings", Icon: HomeIcon },
  { to: "/plots", label: "Plots & Tokens", Icon: Ticket },
  { to: "/schedule", label: "Schedule", Icon: CalendarClock },
  { to: "/attendance", label: "Attendance", Icon: Clock },
  { to: "/quotation", label: "Quotation", Icon: FileText },
  { to: "/performance", label: "Performance", Icon: TrendingUp, adminOnly: true },
  { to: "/blogs", label: "Blogs", Icon: Newspaper, adminOnly: true },
  { to: "/approvals", label: "Approvals", Icon: CheckCircle, adminOnly: true },
  { to: "/commission-slabs", label: "Commission Slabs", Icon: BadgeIndianRupee, adminOnly: true },
];

const EASE = [0.22, 1, 0.36, 1];

export default function Layout() {
  const { isAdmin, signOut, profile } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)));
  const visibleLinks = LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-sand text-ink font-sans">
      <header className="sticky top-0 z-40 bg-sand/90 backdrop-blur-md border-b border-ink/[0.06]">
        <div className="flex items-center gap-3 px-5 h-16">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 -ml-1.5 rounded-full flex items-center justify-center text-ink/70 hover:bg-ink/[0.05] transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center p-1 shrink-0">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-ink truncate">{current?.label || "PinkCity"}</div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={PUBLIC_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-ink transition-colors"
            >
              View Website
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-sm text-ink/50 hidden md:block max-w-[160px] truncate">{profile?.full_name || profile?.email}</span>
            <button
              onClick={signOut}
              className="text-xs font-medium border border-ink/10 rounded-full px-3.5 py-2 text-ink/70 hover:border-ink/25 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setMenuOpen(false)}
            className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-5"
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="w-full max-w-2xl bg-sand rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="font-display text-xl text-ink">Menu</div>
                <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-ink/[0.05]" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visibleLinks.map((l, i) => (
                  <motion.div
                    key={l.to}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.02, ease: EASE }}
                  >
                    <NavLink
                      to={l.to}
                      end={l.end}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex flex-col items-start gap-3 rounded-[22px] border p-4 h-full transition-all active:scale-[0.98] ${
                          isActive
                            ? "bg-stone-600 border-stone-600 text-sand shadow-lift"
                            : "bg-surface border-ink/[0.06] text-ink shadow-soft hover:border-stone-300"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? "bg-white/15" : "bg-stone-50"}`}>
                            <l.Icon className={`w-[18px] h-[18px] ${isActive ? "text-sand" : "text-stone-600"}`} />
                          </span>
                          <span className="text-[13.5px] font-semibold leading-tight">{l.label}</span>
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                ))}
              </div>

              <a
                href={PUBLIC_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="sm:hidden mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-ink/60 py-3"
              >
                View Website <ExternalLink className="w-3 h-3" />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Outlet />
    </div>
  );
}
