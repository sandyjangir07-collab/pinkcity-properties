export const LOCATION_OPTIONS = [
  { value: "Jaipur, Rajasthan", sub: "Most popular" },
  { value: "Mansarovar, Jaipur" },
  { value: "Jagatpura, Jaipur" },
  { value: "Ajmer Road, Jaipur" },
  { value: "Sitapura, Jaipur" },
  { value: "Tonk Road, Jaipur" },
];
export const TYPE_OPTIONS = ["Any type", "Colony", "Plot", "Flat", "Villa"];
export const BUDGET_OPTIONS = ["Under ₹25L", "₹ 25L — 50L", "₹ 50L — 1 Cr", "₹ 1 Cr — 2 Cr", "Above ₹ 2 Cr"];

export const DEFAULT_FILTERS = {
  location: "Jaipur, Rajasthan",
  type: "Any type",
  budget: "₹ 25L — 2 Cr",
};

const TYPE_SLUG_MAP = { Colony: "colony", Plot: "plot", Flat: "apartment", Villa: "villa" };
const BUDGET_BUCKETS = {
  "Under ₹25L": (lakh) => lakh < 25,
  "₹ 25L — 50L": (lakh) => lakh >= 25 && lakh <= 50,
  "₹ 50L — 1 Cr": (lakh) => lakh >= 50 && lakh <= 100,
  "₹ 1 Cr — 2 Cr": (lakh) => lakh >= 100 && lakh <= 200,
  "Above ₹ 2 Cr": (lakh) => lakh > 200,
};

function parsePriceLakh(str) {
  if (!str) return null;
  if (/\//.test(str)) return null; // a rate like "/Gaj", not a total price
  const s = str.replace(/[₹,\s]/g, "").toLowerCase();
  let m = s.match(/([\d.]+)\s*cr/);
  if (m) return parseFloat(m[1]) * 100;
  m = s.match(/([\d.]+)\s*l(akh)?/);
  if (m) return parseFloat(m[1]);
  m = s.match(/^(\d{5,})$/);
  if (m) return parseFloat(m[1]) / 100000;
  return null;
}

export function applyFilters(listings, filters) {
  const locFilter = filters.location && filters.location !== "Jaipur, Rajasthan" ? filters.location.split(",")[0].trim().toLowerCase() : null;
  const typeSlug = TYPE_SLUG_MAP[filters.type] || null;
  const budgetTest = BUDGET_BUCKETS[filters.budget] || null;
  const isFiltered = !!(locFilter || typeSlug || budgetTest);

  const filtered = listings.filter((p) => {
    if (locFilter && !(p.area || "").toLowerCase().includes(locFilter)) return false;
    if (typeSlug && p.type !== typeSlug) return false;
    if (budgetTest) {
      const lakh = parsePriceLakh(p.price);
      if (lakh !== null && !budgetTest(lakh)) return false;
    }
    return true;
  });

  return { filtered, isFiltered };
}
