import { sb } from "./supabase";
import { formatINR } from "./utils";

// "Plots for Resale". Owner details live in separate admin-only tables, so
// nothing in this file (or any associate-facing screen) ever touches them.

export const BUCKET_PLANS = "resale-site-plans";
export const BUCKET_OWNER_DOCS = "resale-owner-docs";

export const RESALE_STATUS = {
  available: { label: "Available", cls: "bg-emerald-100 text-emerald-800" },
  reserved: { label: "Reserved", cls: "bg-amber-100 text-amber-800" },
  sold: { label: "Sold", cls: "bg-ink/10 text-ink/60" },
  unavailable: { label: "Unavailable", cls: "bg-red-100 text-red-700" },
};

export const FACINGS = ["East", "West", "North", "South", "North-East", "North-West", "South-East", "South-West"];

// Budget is judged on total demand; area on Gaj.
export const BUDGETS = [
  { id: "any", label: "Any budget" },
  { id: "u10", label: "Under ₹10 L", max: 1000000 },
  { id: "10-20", label: "₹10 – 20 L", min: 1000000, max: 2000000 },
  { id: "20-30", label: "₹20 – 30 L", min: 2000000, max: 3000000 },
  { id: "30+", label: "₹30 L and above", min: 3000000 },
];
export const AREAS = [
  { id: "any", label: "Any area" },
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

export function formatGaj(n) {
  return `${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Gaj`;
}

export const isImagePath = (p) => /\.(png|jpe?g|webp)$/i.test(p || "");
export const fileExt = (name) => (String(name || "").split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

// What an associate shares with a customer — property facts only, never owner details.
export function shareText(p, opts = {}) {
  const { link, contactName, contactPhone } = opts;
  return [
    "PinkCity Properties & Consultants",
    `${p.scheme} — Plot ${p.plot_number}`,
    p.location,
    "",
    `Area: ${formatGaj(p.area_gaj)}`,
    p.facing ? `Facing: ${p.facing}` : null,
    p.dimensions ? `Plot size: ${p.dimensions}` : null,
    `Rate: ${formatINR(p.rate_per_gaj)} per Gaj`,
    `Total demand: ${formatINR(p.total_demand)}`,
    p.registration_amount != null ? `Registration: ${formatINR(p.registration_amount)}` : null,
    `Status: ${RESALE_STATUS[p.status]?.label || p.status}`,
    link ? "" : null,
    link ? `View details & site plan: ${link}` : null,
    contactName ? `Contact: ${contactName}${contactPhone ? ` · ${contactPhone}` : ""}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

// Native share sheet where the phone has one, otherwise copy to the clipboard.
export async function shareOrCopy(text, title) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function signedUrl(bucket, path, seconds = 3600, downloadName) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, seconds, downloadName ? { download: downloadName } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function signedUrls(bucket, paths, seconds = 3600) {
  if (!paths.length) return {};
  const { data } = await sb.storage.from(bucket).createSignedUrls(paths, seconds);
  const out = {};
  for (const row of data || []) if (row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

export function friendlyError(e) {
  if (e && e.code === "23505") return "A plot with this scheme and plot number already exists.";
  return (e && e.message) || "Something went wrong. Please try again.";
}

// ---------- Freshness ----------
// A plot nobody has re-confirmed for this long gets flagged, so old listings don't mislead clients.
export const STALE_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export function daysSinceConfirmed(p, now = Date.now()) {
  const t = new Date(p.last_confirmed_at || p.updated_at || p.created_at).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / DAY));
}
export function confirmLabel(p, now) {
  const d = daysSinceConfirmed(p, now);
  if (d === 0) return "Confirmed today";
  if (d === 1) return "Confirmed yesterday";
  return `Confirmed ${d} days ago`;
}
// Only plots that can still be sold are worth flagging.
export function isStale(p, now) {
  return !p.archived && (p.status === "available" || p.status === "reserved") && daysSinceConfirmed(p, now) >= STALE_DAYS;
}

// ---------- Sorting ----------
export const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "price_low", label: "Price: low to high" },
  { id: "price_high", label: "Price: high to low" },
  { id: "size_big", label: "Size: biggest first" },
  { id: "stale_first", label: "Needs confirming first" },
];
export function sortPlots(list, sort) {
  const by = {
    newest: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
    price_low: (a, b) => (Number(a.total_demand) || 0) - (Number(b.total_demand) || 0),
    price_high: (a, b) => (Number(b.total_demand) || 0) - (Number(a.total_demand) || 0),
    size_big: (a, b) => (Number(b.area_gaj) || 0) - (Number(a.area_gaj) || 0),
    stale_first: (a, b) => String(a.last_confirmed_at || "").localeCompare(String(b.last_confirmed_at || "")),
  }[sort] || (() => 0);
  return list.slice().sort(by);
}

export function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ---------- Public links ----------
export const COMPANY_NAME = "PinkCity Properties & Consultants";
export const COMPANY_PHONE = "+919358830405";
export const COMPANY_PHONE_SHOWN = "+91 93588 30405";

// Public plots live on the main website: pinkcityproperties.com/resale/KD-96?a=<associate share code>.
// The code tells the page whose name and number to show. (The CRM's own /p pages still work for
// links that were already shared.)
export const PUBLIC_SITE = "https://pinkcityproperties.com";
export function publicPlotUrl(code, ref, origin = PUBLIC_SITE) {
  if (!code) return "";
  return `${origin}/resale/${encodeURIComponent(code)}${ref ? `?a=${encodeURIComponent(ref)}` : ""}`;
}
export function publicCatalogueUrl(ref, origin = PUBLIC_SITE) {
  return `${origin}/resale${ref ? `?a=${encodeURIComponent(ref)}` : ""}`;
}
export function waLink(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text || "")}`;
}
