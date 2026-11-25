import { getResaleList, groupByArea, areaPath, MIN_PLOTS_FOR_AREA_PAGE } from "../lib/resale";

const SITE_URL = "https://pinkcityproperties.com";

export default async function sitemap() {
  const pages = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/areas", priority: 0.9, changeFrequency: "weekly" },
    { path: "/resale", priority: 0.9, changeFrequency: "daily" },
    { path: "/founders", priority: 0.7, changeFrequency: "monthly" },
    { path: "/govt-resources", priority: 0.6, changeFrequency: "monthly" },
    { path: "/ajmer-road", priority: 0.9, changeFrequency: "weekly" },
    { path: "/diggi-malpura-road", priority: 0.9, changeFrequency: "weekly" },
    { path: "/tonk-road-shivdaspura", priority: 0.9, changeFrequency: "weekly" },
    { path: "/mahindra-sez-south", priority: 0.9, changeFrequency: "weekly" },
    { path: "/calculator", priority: 0.8, changeFrequency: "monthly" },
    { path: "/why", priority: 0.6, changeFrequency: "monthly" },
    { path: "/verified", priority: 0.6, changeFrequency: "monthly" },
    { path: "/investment", priority: 0.6, changeFrequency: "monthly" },
    { path: "/reviews", priority: 0.5, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
  ];

  const entries = pages.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Every plot that is public in the CRM (available or reserved) gets its own page.
  const plots = await getResaleList();
  for (const p of plots) {
    entries.push({
      url: `${SITE_URL}/resale/${encodeURIComponent(p.public_code)}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: "daily",
      priority: 0.6,
    });
  }
  // Area landing pages, only once they have enough plots to be worth indexing.
  for (const a of groupByArea(plots)) {
    if (a.plots.length < MIN_PLOTS_FOR_AREA_PAGE) continue;
    entries.push({ url: `${SITE_URL}${areaPath(a.slug)}`, changeFrequency: "daily", priority: 0.8 });
  }
  return entries;
}
