import { SITE_URL } from "./seo";
import { plotPath } from "./resale";

const AGENT = {
  "@type": "RealEstateAgent",
  name: "PinkCity Properties & Consultants",
  url: SITE_URL,
  telephone: "+91-9358830405",
};

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function itemListLd(name, plots) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: plots.length,
    itemListElement: plots.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}${plotPath(p.public_code)}`,
      name: `${p.scheme} Plot ${p.plot_number}, ${p.location}`,
    })),
  };
}

// Property facts only. Nothing about the owner is ever in this object.
export function plotLd(plot) {
  const url = `${SITE_URL}${plotPath(plot.public_code)}`;
  const sold = plot.status === "sold" || plot.status === "unavailable";
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${plot.scheme} Plot ${plot.plot_number}, ${plot.location}`,
    url,
    description: `${plot.area_gaj} Gaj resale plot in ${plot.scheme}, ${plot.location}, Jaipur${plot.facing ? `, ${plot.facing} facing` : ""}.`,
    about: {
      "@type": "Place",
      name: `${plot.scheme}, ${plot.location}`,
      address: { "@type": "PostalAddress", addressLocality: plot.location, addressRegion: "Rajasthan", addressCountry: "IN" },
      floorSize: { "@type": "QuantitativeValue", value: Number(plot.area_gaj) || undefined, unitText: "Gaj (square yard)" },
    },
    offers: {
      "@type": "Offer",
      price: Number(plot.total_demand) || undefined,
      priceCurrency: "INR",
      availability: sold ? "https://schema.org/SoldOut" : plot.status === "reserved" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
      url,
      seller: AGENT,
    },
    provider: AGENT,
  };
}

export const RESALE_FAQS = [
  {
    q: "What is a resale plot?",
    a: "A resale plot is a residential plot in an existing scheme or colony that is being sold by its current allottee or owner rather than by the developer or authority. PinkCity lists resale plots with the size, rate per Gaj and total demand shown upfront.",
  },
  {
    q: "What does 'total demand' mean on a resale plot?",
    a: "Total demand is the full amount the seller is asking for the plot, calculated from the plot size in Gaj and the rate per Gaj. Registration and other charges are shown separately where applicable. All figures are indicative and confirmed by PinkCity before booking.",
  },
  {
    q: "How do I buy a resale plot through PinkCity?",
    a: "Open a plot, view the site plan, and send an enquiry or call us. PinkCity is your single point of contact: we arrange the site visit, handle the negotiation and guide you through documents and registration. You do not need to deal with the seller directly.",
  },
  {
    q: "Which documents should I verify before booking a resale plot in Jaipur?",
    a: "Typically the allotment or patta, the registered sale deed, the approved site plan, the seller's identity documents and any pending dues or no-objection papers. Our team helps you check these before you pay a booking amount.",
  },
  {
    q: "Can I visit a resale plot before deciding?",
    a: "Yes. Send an enquiry from the plot page or call +91 93588 30405 and we will arrange a site visit at a time that suits you.",
  },
];
