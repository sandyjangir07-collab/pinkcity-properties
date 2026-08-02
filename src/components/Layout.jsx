import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

// The public site (pinkcity-web) is a separate Next.js deployment, not a
// route inside this app.
const PUBLIC_SITE_URL = "https://pinkcity-front-end.vercel.app";

const LINKS = [
  { to: "/", end: true, label: "Team" },
  { to: "/today", label: "Today" },
  { to: "/leads", label: "Leads" },
  { to: "/listings", label: "Listings" },
  { to: "/plots", label: "Plots & Tokens" },
  { to: "/schedule", label: "Schedule" },
  { to: "/attendance", label: "Attendance" },
  { to: "/quotation", label: "Quotation" },
  { to: "/performance", label: "Performance", adminOnly: true },
  { to: "/blogs", label: "Blogs", adminOnly: true },
  { to: "/approvals", label: "Approvals", adminOnly: true },
  { to: "/commission-slabs", label: "Commission Slabs", adminOnly: true },
];

export default function Layout() {
  const { isAdmin, signOut, profile } = useAuth();

  return (
    <div className="min-h-screen bg-sand text-ink font-sans">
      <header className="sticky top-0 z-40 bg-sand/90 backdrop-blur-md border-b border-ink/[0.06]">
        <div className="flex items-center gap-4 px-5 h-16">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-full bg-stone-600 flex items-center justify-center p-1 shrink-0">
              <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </span>
            <span className="font-display text-lg hidden sm:block">
              PinkCity<span className="text-stone-500">.</span>
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            {LINKS.filter((l) => !l.adminOnly || isAdmin).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 text-sm px-3.5 py-2 rounded-full transition-colors whitespace-nowrap",
                    isActive ? "bg-stone-600 text-sand" : "text-ink/60 hover:text-ink hover:bg-ink/[0.04]"
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={PUBLIC_SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-ink/60 hover:text-ink transition-colors"
            >
              View Website
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" />
              </svg>
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
      <Outlet />
    </div>
  );
}
