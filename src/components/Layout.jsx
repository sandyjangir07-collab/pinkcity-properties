import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, Zap, ChevronLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TaskCountsProvider, useTaskCounts } from "../hooks/useTaskCounts";
import JaliPattern from "./JaliPattern";
import NotificationBell from "./NotificationBell";
import BottomNav, { TABS } from "./BottomNav";
import { NAV_LINKS as LINKS } from "../lib/navLinks";
import { EXTRA_LABELS, activeTab } from "../lib/menuConfig";

const PUBLIC_SITE_URL = "https://pinkcityproperties.com";

// The four tab pages. Everything else is a page you "go into", so it gets a Back button.
const TAB_ROOTS = ["/", "/leads", "/tasks", "/menu"];

function LayoutInner() {
  const { isAdmin, signOut, profile } = useAuth();
  const { counts } = useTaskCounts();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const taskCount = counts?.actionTotal || 0;

  // An installed app has no browser Back button, so every page except the four
  // tabs gets one. (The resale detail/edit pages already carry their own back link.)
  const showBack = !TAB_ROOTS.includes(path) && !/^\/resale\/.+/.test(path);
  function goBack() {
    // Go back one step if there is an earlier page inside the app; otherwise Home.
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  }

  const current = LINKS.find((l) => (l.end ? path === l.to : path.startsWith(l.to)));
  const pageLabel = current?.label || EXTRA_LABELS[path];
  const active = activeTab(path);

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

          <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-stone-600 px-3 py-1.5 text-[12px] font-semibold text-sand shadow-[0_3px_10px_-3px_rgba(196,56,104,0.5)] shrink-0">
            <Zap className="w-3.5 h-3.5" />
            {isAdmin ? "Admin" : "Team"}
          </span>

          {/* Larger screens: the same four tabs live in the header */}
          <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
            {TABS.map(({ id, to, label, Icon }) => {
              const on = active === id;
              return (
                <Link
                  key={id}
                  to={to}
                  aria-current={on ? "page" : undefined}
                  className={`relative inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors ${on ? "bg-stone-600 text-white" : "text-ink/60 hover:bg-ink/[0.05]"}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                  {id === "tasks" && taskCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-[16px] text-white">{taskCount > 99 ? "99+" : taskCount}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
            <NotificationBell />
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
            <button onClick={signOut} className="text-xs font-semibold rounded-full px-3.5 py-2 bg-ink text-sand hover:bg-ink/85 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {showBack && (
          <div className="flex items-center justify-between px-1 pt-1">
            <button
              onClick={goBack}
              aria-label="Go back"
              className="-ml-1 inline-flex min-h-[44px] items-center gap-0.5 rounded-full pr-4 text-[14.5px] font-semibold text-stone-700 transition-opacity active:opacity-60"
            >
              <ChevronLeft className="h-5 w-5" /> Back
            </button>
            {pageLabel && <span className="truncate pl-3 text-[13px] font-medium text-ink/45">{pageLabel}</span>}
          </div>
        )}
      </header>

      {/* room for the bottom tab bar on phones */}
      <div className="pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </div>

      <BottomNav pathname={path} taskCount={taskCount} />
    </div>
  );
}

export default function Layout() {
  return (
    <TaskCountsProvider>
      <LayoutInner />
    </TaskCountsProvider>
  );
}
