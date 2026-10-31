import { NAV_LINKS } from "./navLinks";

// The Menu: every module, grouped into five categories. Home shows the four
// daily shortcuts; everything else is reached from here (or the bottom tabs).

export const MENU_CATEGORIES = [
  { id: "daily", title: "Daily Work", caption: "Your day, follow-ups and site visits", paths: ["/today", "/schedule"] },
  { id: "sales", title: "Sales & Leads", caption: "Pipeline, quotes and closed deals", paths: ["/leads", "/quotation", "/sales"] },
  { id: "inventory", title: "Property Inventory", caption: "Listings, plots, tokens and resale", paths: ["/listings", "/plots", "/resale"] },
  { id: "money", title: "Money", caption: "Commissions and payouts", paths: ["/commissions", "/commission-slabs"] },
  { id: "team", title: "Team & Admin", caption: "People, approvals and the website", paths: ["/team", "/performance", "/approvals", "/blogs"] },
];

export const MODULE_INFO = {
  "/today": { desc: "Follow-ups and visits due today", keywords: "follow up visits daily due overdue calls" },
  "/schedule": { desc: "Site visits and calls on the calendar", keywords: "site visit calendar appointments calls upcoming" },
  "/leads": { desc: "Lead pipeline, follow-ups and conversion", keywords: "pipeline enquiries clients follow-up site visit duplicate" },
  "/quotation": { desc: "Price quotes you can share as a PDF", keywords: "quote price cost pdf charges" },
  "/sales": { desc: "Every sale, plot and payment received", keywords: "sold deals ledger payments received plots" },
  "/listings": { desc: "Properties and colonies on the website", keywords: "properties colonies inventory projects approve" },
  "/plots": { desc: "Plot availability, tokens and bookings", keywords: "token booking colony units reserve sold photo proof" },
  "/resale": { desc: "Resale plots, site plans and brochures", keywords: "resale second hand owner brochure site plan inventory" },
  "/commissions": { desc: "Earned, paid and still due per associate", keywords: "payout paid earned due commission salary" },
  "/commission-slabs": { desc: "Old commission rate slabs", keywords: "rate slab per gaj" },
  "/team": { desc: "Team directory and profiles", keywords: "employees directory members people documents" },
  "/performance": { desc: "How each team member is doing", keywords: "stats targets leads visits team results" },
  "/approvals": { desc: "Profiles and requests waiting for you", keywords: "pending profiles hierarchy review approve" },
  "/blogs": { desc: "Website articles and drafts", keywords: "articles seo posts website content" },
};

export const MODULE_TONE = {
  "/leads": { bg: "bg-blue-100", text: "text-blue-600" },
  "/listings": { bg: "bg-emerald-100", text: "text-emerald-600" },
  "/plots": { bg: "bg-violet-100", text: "text-violet-600" },
  "/schedule": { bg: "bg-teal-100", text: "text-teal-600" },
  "/quotation": { bg: "bg-amber-100", text: "text-amber-700" },
  "/team": { bg: "bg-stone-100", text: "text-stone-600" },
  "/sales": { bg: "bg-rose-100", text: "text-rose-600" },
  "/resale": { bg: "bg-teal-100", text: "text-teal-700" },
  "/commissions": { bg: "bg-orange-100", text: "text-orange-700" },
  "/commission-slabs": { bg: "bg-amber-100", text: "text-amber-700" },
  "/performance": { bg: "bg-teal-100", text: "text-teal-600" },
  "/blogs": { bg: "bg-violet-100", text: "text-violet-600" },
  "/approvals": { bg: "bg-emerald-100", text: "text-emerald-600" },
  "/today": { bg: "bg-amber-100", text: "text-amber-700" },
};

// Categories with their modules resolved; admin-only modules are hidden for everyone else.
export function menuSections(isAdmin) {
  return MENU_CATEGORIES.map((c) => ({
    ...c,
    items: c.paths
      .map((p) => NAV_LINKS.find((l) => l.to === p))
      .filter((l) => l && (!l.adminOnly || isAdmin))
      .map((l) => ({ ...l, ...MODULE_INFO[l.to], tone: MODULE_TONE[l.to] || { bg: "bg-stone-100", text: "text-stone-600" } })),
  })).filter((c) => c.items.length > 0);
}

// Search by module name, description, keywords or category.
export function searchSections(sections, query) {
  const q = query.trim().toLowerCase();
  if (!q) return sections;
  return sections
    .map((c) => {
      const inCategory = c.title.toLowerCase().includes(q);
      const items = c.items.filter((m) => inCategory || [m.label, m.desc, m.keywords].some((t) => String(t || "").toLowerCase().includes(q)));
      return { ...c, items };
    })
    .filter((c) => c.items.length > 0);
}

// Pages that aren't modules but still need a name in the Back bar.
export const EXTRA_LABELS = { "/tasks": "Tasks", "/menu": "Menu" };

// Which bottom tab a page belongs to (so the right tab stays lit inside sub-pages).
export function activeTab(pathname) {
  if (pathname === "/" || pathname.startsWith("/today") || pathname.startsWith("/resale") || pathname.startsWith("/sales")) return "home";
  if (pathname.startsWith("/leads")) return "leads";
  if (pathname.startsWith("/tasks") || pathname.startsWith("/schedule") || pathname.startsWith("/approvals")) return "tasks";
  return "menu";
}
