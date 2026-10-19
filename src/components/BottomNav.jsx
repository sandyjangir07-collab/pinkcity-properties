import { Link } from "react-router-dom";
import { Home as HomeIcon, Target, ListChecks, LayoutGrid } from "lucide-react";
import { activeTab } from "../lib/menuConfig";

export const TABS = [
  { id: "home", to: "/", label: "Home", Icon: HomeIcon },
  { id: "leads", to: "/leads", label: "Leads", Icon: Target },
  { id: "tasks", to: "/tasks", label: "Tasks", Icon: ListChecks },
  { id: "menu", to: "/menu", label: "Menu", Icon: LayoutGrid },
];

const badgeText = (n) => (n > 99 ? "99+" : String(n));

// Four tabs, always one tap away. On phones this sits at the bottom; on larger
// screens the same tabs appear in the header (see Layout).
export default function BottomNav({ pathname, taskCount }) {
  const active = activeTab(pathname);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.06] bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 pt-1.5 pb-1.5">
        {TABS.map(({ id, to, label, Icon }) => {
          const on = active === id;
          return (
            <Link key={id} to={to} aria-current={on ? "page" : undefined} className="relative flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-transform active:scale-95">
              <span className={`relative flex h-8 w-14 items-center justify-center rounded-full transition-colors ${on ? "bg-stone-600 text-white" : "text-ink/45"}`}>
                <Icon className="h-[19px] w-[19px]" strokeWidth={on ? 2.3 : 2} />
                {id === "tasks" && taskCount > 0 && (
                  <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-surface">{badgeText(taskCount)}</span>
                )}
              </span>
              <span className={`text-[10.5px] font-semibold ${on ? "text-stone-700" : "text-ink/45"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
