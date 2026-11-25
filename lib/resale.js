import { sb } from "./supabase";

// Resale plots are managed in the CRM. Anything an admin switches to "Public" there
// is returned by these two database functions, which only ever expose property facts
// (never owner details). The website just reads them, so there is nothing to publish.
export const BUCKET_PLANS = "resale-site-plans";
export const COMPANY_PHONE = "+919358830405";
export const COMPANY_PHONE_SHOWN = "+91 93588 30405";

export const STATUS = {
  available: { label: "Available", cls: "bg-emerald-100 text-emerald-800" },
  reserved: { label: "Reserved", cls: "bg-amber-100 text-amber-800" },
  sold: { label: "Sold", cls: "bg-ink/10 text-ink/60" },
  unavailable: { label: "Unavailable", cls: "bg-red-100 text-red-700" },
};

export const BUDGETS = [
  { id: "any", label: "Any budget" },
  { id: "u10", label: "Under ₹10 L", max: 1000000 },
  { id: "10-20", label: "₹10 – 20 L", min: 1000000, max: 2000000 },
  { id: "20-30", label: "₹20 – 30 L", min: 2000000, max: 3000000 },
  { id: "30+", label: "₹30 L and above", min: 3000000 },
];
export const AREAS = [
  { id: "any", label: "Any size" },
  { id: "u100", label: "Under 100 Gaj", max: 100 },
  { id: "100-125", label: "100 – 125 Gaj", min: 100, max: 125 },
  { id: "125-150", label: "125 – 150 Gaj", min: 125, max: 150 },
  { id: "150+", label: "150 Gaj and above", min: 150 },
];

export function inRange(value, range) {
  if (!range || range.id === "any") return true;
  const v = Number(value) || 0;
  if (range.min != null && v < range.min) return false;
  if (range.max != null && v >= range.max) return false;
  return true;
}

export function formatINR(n) {
  if (n === null || n === undefined || n === "") return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}
export function formatGaj(n) {
  return `${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Gaj`;
}
export function isImagePath(path) {
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(path || "");
}
export function plotPath(code) {
  return `/resale/${encodeURIComponent(code)}`;
}

// Server-side: the whole public catalogue (cached and refreshed by the page's revalidate).
export async function getResaleList() {
  try {
    const { data, error } = await sb.rpc("public_resale_list");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Failed to load resale plots:", e);
    return [];
  }
}

// Server-side: one plot by its short code (null if it isn't public).
export async function getResalePlot(code) {
  try {
    const { data, error } = await sb.rpc("public_resale_get", { p_code: code, p_ref: null });
    if (error) throw error;
    return data?.plot || null;
  } catch (e) {
    console.error("Failed to load resale plot:", e);
    return null;
  }
}

// ---- SEO helpers ----------------------------------------------------------
// An area page is only worth indexing once it has real content; below this it stays out of Google.
export const MIN_PLOTS_FOR_AREA_PAGE = 2;

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function areaPath(slug) {
  return `/resale-plots-in/${slug}`;
}
// [{ slug, name, plots: [...] }] for every location that has a public plot, biggest first.
export function groupByArea(plots) {
  const map = new Map();
  for (const p of plots) {
    const slug = slugify(p.location);
    if (!slug) continue;
    if (!map.has(slug)) map.set(slug, { slug, name: p.location, plots: [] });
    map.get(slug).plots.push(p);
  }
  return [...map.values()].sort((a, b) => b.plots.length - a.plots.length || a.name.localeCompare(b.name));
}
export function priceRange(plots) {
  const v = plots.map((p) => Number(p.total_demand)).filter((n) => n > 0);
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
}
