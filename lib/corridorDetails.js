export const CORRIDOR_DETAILS = {
  "ajmer-road": {
    title: "Ajmer Road, Jaipur",
    badge: "Established Corridor",
    stars: 4,
    riskLevel: "Low–Moderate",
    horizon: "3–5 Years",
    recoTags: ["End Users", "Long-Term Investors", "Rental Investors", "Commercial Investors"],
    verdict:
      "Ajmer Road is Jaipur's most mature growth corridor — NH-48 access, the Delhi–Mumbai Industrial Corridor, Mahindra World City SEZ, and largely complete Ring Road connectivity underpin genuinely diversified demand across residential, rental, and commercial segments. It is less of a ground-floor opportunity than earlier-stage corridors — but it offers the lowest risk profile of any South Jaipur growth corridor for buyers who prioritise strong fundamentals over speculative upside.",
    growthStage: "Established",
    growthStageIndex: 3,
    infrastructure: [
      { title: "NH-48 Expansion (Jaipur–Kishangarh)", status: "Under Construction", statusTone: "construction", impact: "High", source: "NHAI" },
      { title: "Jaipur Ring Road (South Section)", status: "Operational", statusTone: "operational", impact: "High", source: "JDA" },
    ],
    blogSlug: "ajmer-road-jaipur-property-investment-guide-2026",
  },
  "diggi-malpura-road": {
    title: "Diggi-Malpura Road, Jaipur",
    badge: "Early-Stage / Ground Floor",
    stars: 3.5,
    riskLevel: "Moderate",
    horizon: "5–10 Years",
    recoTags: ["Long-Term Investors", "Plot Investors", "NRI Investors", "Budget First-Time Buyers"],
    verdict:
      "Diggi-Malpura Road sits inside JDA's Master Plan 2047 zone, with genuine infrastructure drivers already in motion — Ring Road access and the Knowledge City (South) education hub at Chittora — but pricing that hasn't caught up yet. It's a real ground-floor opportunity, not a mature corridor: entry prices sit well below Ajmer Road. That's precisely the trade-off — lower risk than an unregulated periphery, but a longer runway to maturity than an established address.",
    growthStage: "Developing",
    growthStageIndex: 1,
    infrastructure: [
      { title: "JDA Master Plan 2047 Coverage", status: "Approved Zone", statusTone: "approved", impact: "High", source: "JDA" },
      { title: "Jaipur Ring Road (South Section)", status: "Operational", statusTone: "operational", impact: "High", source: "JDA" },
      { title: "Knowledge City (South), Chittora", status: "Under Development", statusTone: "construction", impact: "High", source: "JDA" },
    ],
    blogSlug: "diggi-malpura-road-jaipur-investment-guide-2026",
  },
  "tonk-road-shivdaspura": {
    title: "Tonk Road — Shivdaspura & Chaksu Belt",
    badge: "Confirmed Metro Line",
    stars: 4,
    riskLevel: "Moderate",
    horizon: "5–10 Years",
    recoTags: ["Long-Term Investors", "Plot Investors", "Rental Investors", "Budget First-Time Buyers"],
    verdict:
      "This belt scores higher than most early-stage corridors because its catalysts are unusually concrete: JDA's first-ever Land Pooling Scheme under the 2016 Act is already sanctioned for Shivdaspura, Barkheda, and Chandlai villages, and Jaipur Metro Phase II — a 41 km, Union Cabinet-approved corridor — will serve Tonk Road directly. Neither is a \"proposed, unconfirmed\" rumor; both are documented government actions. What's still early is the social and commercial infrastructure around them, which is exactly why entry pricing remains low.",
    growthStage: "Developing",
    growthStageIndex: 1,
    infrastructure: [
      { title: "Jaipur Metro Phase II (Prahladpura–Todi Mod)", status: "Cabinet Approved", statusTone: "approved", impact: "High", source: "PMO / Union Cabinet, RMRCL" },
      { title: "JDA's First Land Pooling Scheme", status: "JDA Sanctioned", statusTone: "approved", impact: "High", source: "JDA (jda.rajasthan.gov.in)" },
      { title: "Ring Road — Tonk Road–Ajmer Road Link", status: "Operational", statusTone: "operational", impact: "High", source: "JDA / MoRTH" },
    ],
    blogSlug: null,
  },
  "mahindra-sez-south": {
    title: "Southern Mahindra SEZ Belt",
    badge: "Strongest Rental Case",
    stars: 3.5,
    riskLevel: "Moderate",
    horizon: "3–8 Years",
    recoTags: ["Rental Investors", "Long-Term Investors", "Budget First-Time Buyers", "SEZ-Employee End Users"],
    verdict:
      "This belt's advantage is unusual for an early-stage market: the employment driver isn't a future promise, it's already operating. Mahindra World City SEZ has run since 2007 with 90+ companies generating real, current housing demand along the 250 ft SEZ Road. What holds the rating at 3.5 rather than higher is the surrounding residential layer itself: dozens of small, privately developed colonies vary meaningfully in JDA-approval quality, and that variance is the main risk here, not the demand story.",
    growthStage: "Developing",
    growthStageIndex: 1,
    infrastructure: [
      { title: "Mahindra World City SEZ", status: "Operational since 2007", statusTone: "operational", impact: "High", source: "Mahindra Group / RIICO" },
      { title: "250 ft SEZ Perimeter Road", status: "Operational", statusTone: "operational", impact: "High", source: "Multiple independent listings" },
      { title: "Bagru Industrial Area", status: "Operational", statusTone: "operational", impact: "Medium", source: "Developer-referenced" },
    ],
    blogSlug: null,
  },
};

export const GROWTH_STAGES = ["Emerging", "Developing", "Fast Growing", "Established", "Premium", "Luxury"];

export const STATUS_TONE = {
  operational: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "●" },
  construction: { bg: "bg-amber-50", text: "text-amber-700", dot: "◐" },
  approved: { bg: "bg-stone-50", text: "text-stone-600", dot: "✓" },
  planning: { bg: "bg-ink/[0.04]", text: "text-ink/50", dot: "○" },
};
