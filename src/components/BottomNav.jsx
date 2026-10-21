import { Link } from "react-router-dom";
import { Home as HomeIcon, Phone, ListChecks, LayoutGrid } from "lucide-react";
import { activeTab } from "../lib/menuConfig";

export const TABS = [
  { id: "home", to: "/", label: "Home", Icon: HomeIcon },
  { id: "leads", to: "/leads", label: "Leads", Icon: Phone },
  { id: "tasks", to: "/tasks", label: "Tasks", Icon: ListChecks },
  { id: "menu", to: "/menu", label: "Menu", Icon: LayoutGrid },
];

const badgeText = (n) => (n > 99 ? "99+" : String(n));

// Four tabs, always one tap away. On phones this sits at the bottom; on larger
// screens the same tabs appear in the header (see Layout).
export default function BottomNav({ pathname, taskCount }) {
  const active = activeTab(pathname);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/[0.07] bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-2 pt-2 pb-1.5">
        {TABS.map(({ id, to, label, Icon }) => {
          const on = active === id;
          const isMenu = id === "menu";
          return (
            <Link key={id} to={to} aria-current={on ? "page" : undefined} className="relative flex min-h-[56px] flex-col items-center justify-start gap-1 rounded-2xl transition-transform active:scale-95">
              <span
                className={`relative flex items-center justify-center transition-colors ${
                  isMenu
                    ? `h-10 w-10 rounded-full border shadow-[0_2px_10px_rgba(60,30,40,0.10)] ${on ? "border-crimson bg-crimson text-white" : "border-ink/[0.08] bg-white text-crimson"}`
                    : `h-9 w-14 rounded-full ${on ? "bg-crimson text-white" : "text-[#6F6665]"}`
                }`}
              >
                <Icon className="h-[20px] w-[20px]" strokeWidth={2} />
                {id === "tasks" && taskCount > 0 && (
                  <span className="absolute -right-0.5 -top-1 min-w-[18px] rounded-full bg-ochre px-1 text-center text-[10px] font-bold leading-[18px] text-ink ring-2 ring-white">{badgeText(taskCount)}</span>
                )}
              </span>
              <span className={`text-[11.5px] font-semibold ${on ? "text-crimson" : "text-[#6F6665]"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
