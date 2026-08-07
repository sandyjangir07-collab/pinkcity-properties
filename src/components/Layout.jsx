import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu, X, ExternalLink, Zap,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import JaliPattern from "./JaliPattern";
import Magnetic from "./Magnetic";
import NotificationBell from "./NotificationBell";
import { NAV_LINKS as LINKS, NAV_ACCENT as ACCENT } from "../lib/navLinks";

const PUBLIC_SITE_URL = "https://pinkcityproperties.com";

const EASE = [0.22, 1, 0.36, 1];

export default function Layout() {
  const { isAdmin, signOut, profile } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const current = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)));
  const visibleLinks = LINKS.filter((l) => !l.adminOnly || isAdmin);

  return (
    <div className="relative min-h-screen bg-sand text-ink font-sans">
      {/* Ambient background texture — subtle jali + soft color glows, sitewide */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.035] text-stone-600 -z-10">
        <JaliPattern id="app-jali" />
      </div>
      <div className="fixed -top-32 -right-32 w-[380px] h-[380px] rounded-full bg-gradient-to-br from-stone-400/[0.10] to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 -left-24 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-jali/[0.08] to-transparent blur-3xl pointer-events-none -z-10" />

      <header className="sticky top-0 z-40 bg-sand/80 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 rounded-full border border-ink/[0.08] bg-surface px-3 py-2.5 shadow-soft">
          <Magnetic strength={0.5}>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-ink/70 hover:bg-ink/[0.05] hover:text-stone-600 transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </Magnetic>

          <a
            href={PUBLIC_SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="w-11 h-11 rounded-full bg-stone-600 flex items-center justify-center p-1.5 shrink-0 shadow-[0_3px_10px_-3px_rgba(196,56,104,0.5)] active:scale-90 transition-transform"
            aria-label="Go to website"
            title="Go to website"
          >
            <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          </a>

          <span className="font-display text-[19px] font-semibold tracking-tight text-ink hidden sm:inline">
            PinkCity<span className="text-stone-600">.</span>
          </span>

          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-3 py-1.5 text-[12px] font-semibold text-stone-600 shrink-0">
            <Zap className="w-3.5 h-3.5" />
            {isAdmin ? "Admin" : "Team"}
          </span>

          <div className="shrink-0">
            <NotificationBell />
          </div>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={current?.label || "PinkCity"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] font-medium text-ink/50 truncate text-right pr-1 hidden md:block"
              >
                {current?.label}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={PUBLIC_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-stone-600 transition-colors mr-1"
            >
              View Website
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-sm text-ink/50 hidden xl:block max-w-[140px] truncate">{profile?.full_name || profile?.email}</span>
            <button
              onClick={signOut}
              className="text-xs font-medium border border-ink/10 rounded-full px-3.5 py-2 text-ink/70 hover:border-ink/25 hover:text-ink transition-colors"
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
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative w-full max-w-2xl bg-sand rounded-3xl p-6 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-[0.04] text-stone-600 pointer-events-none">
                <JaliPattern id="menu-jali" />
              </div>

              <div className="relative flex items-center justify-between mb-5">
                <div className="font-display text-xl text-ink">Menu</div>
                <button onClick={() => setMenuOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center text-ink/50 hover:bg-ink/[0.05] hover:text-stone-600 transition-colors" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative grid grid-cols-3 gap-2">
                {visibleLinks.map((l, i) => {
                  const a = ACCENT[l.accent];
                  return (
                    <motion.div
                      key={l.to}
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }}
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <NavLink
                        to={l.to}
                        end={l.end}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex flex-col items-center gap-2 rounded-2xl border p-2.5 h-full text-center transition-all duration-300 ${
                            isActive
                              ? `${a.bg} ${a.ring} text-sand shadow-lift`
                              : "bg-surface border-ink/[0.06] text-ink shadow-soft hover:border-ink/[0.14] hover:shadow-lift"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isActive ? "bg-white/15" : a.soft}`}>
                              <l.Icon className={`w-[15px] h-[15px] ${isActive ? "text-sand" : a.text}`} />
                            </span>
                            <span className="text-[10.5px] font-semibold leading-tight">{l.label}</span>
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  );
                })}
              </div>

              <a
                href={PUBLIC_SITE_URL}
                target="_blank"
                rel="noreferrer"
                className="relative sm:hidden mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-ink/60 py-3"
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
