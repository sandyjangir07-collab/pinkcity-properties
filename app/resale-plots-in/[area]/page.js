import { notFound } from "next/navigation";
import { buildMetadata } from "../../../lib/seo";
import { getResaleList, groupByArea, priceRange, formatINR, areaPath, MIN_PLOTS_FOR_AREA_PAGE } from "../../../lib/resale";
import { breadcrumbLd, faqLd, itemListLd } from "../../../lib/resaleSeo";
import PageHero from "../../../components/PageHero";
import ResaleCard from "../../../components/resale/ResaleCard";
import Link from "next/link";

export const revalidate = 300;

async function getArea(slug) {
  const areas = groupByArea(await getResaleList());
  return areas.find((a) => a.slug === slug) || null;
}

export async function generateMetadata({ params }) {
  const area = await getArea(params.area);
  const path = areaPath(params.area);
  if (!area) {
    return { ...buildMetadata({ title: "Resale plots in Jaipur | PinkCity", description: "Resale plots in Jaipur from PinkCity Properties & Consultants.", path }), robots: { index: false, follow: true } };
  }
  const range = priceRange(area.plots);
  const title = `Resale Plots in ${area.name}, Jaipur — ${area.plots.length} Plot${area.plots.length > 1 ? "s" : ""} for Sale | PinkCity`;
  const description = `${area.plots.length} resale plot${area.plots.length > 1 ? "s" : ""} in ${area.name}, Jaipur${range ? ` from ${formatINR(range.min)}` : ""}. Plot size, rate per Gaj and site plan shown upfront. PinkCity handles the site visit to registration.`;
  const meta = buildMetadata({ title, description, path });
  // Thin pages stay out of Google until there is enough on them.
  if (area.plots.length < MIN_PLOTS_FOR_AREA_PAGE) meta.robots = { index: false, follow: true };
  return meta;
}

export default async function AreaPage({ params }) {
  const area = await getArea(params.area);
  if (!area) notFound();
  const range = priceRange(area.plots);
  const schemes = [...new Set(area.plots.map((p) => p.scheme))];
  const faqs = [
    {
      q: `How many resale plots are available in ${area.name}, Jaipur?`,
      a: `PinkCity currently lists ${area.plots.length} resale plot${area.plots.length > 1 ? "s" : ""} in ${area.name}${schemes.length ? `, across ${schemes.join(", ")}` : ""}.${range ? ` Total demand ranges from ${formatINR(range.min)} to ${formatINR(range.max)}.` : ""}`,
    },
    {
      q: `How do I visit a resale plot in ${area.name}?`,
      a: "Open the plot, send an enquiry or call +91 93588 30405. PinkCity arranges the site visit and stays your single point of contact through to registration.",
    },
  ];
  const ld = [
    breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Resale plots in Jaipur", path: "/resale" },
      { name: area.name, path: areaPath(area.slug) },
    ]),
    itemListLd(`Resale plots in ${area.name}, Jaipur`, area.plots),
    faqLd(faqs),
  ];
  return (
    <>
      {ld.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <PageHero
        eyebrow="Resale Plots"
        title={`Resale plots in ${area.name}, Jaipur.`}
        description={`${area.plots.length} plot${area.plots.length > 1 ? "s" : ""} with size, rate and total demand shown upfront${range ? `, from ${formatINR(range.min)}` : ""}.`}
      />
      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {area.plots.map((p) => <ResaleCard key={p.public_code} p={p} />)}
          </div>
          <section className="mt-16 max-w-3xl mx-auto">
            <h2 className="font-display text-3xl text-ink mb-4">Questions about plots in {area.name}</h2>
            <div className="divide-y divide-ink/10 border-y border-ink/10">
              {faqs.map((f) => (
                <div key={f.q} className="py-4">
                  <h3 className="font-medium text-ink">{f.q}</h3>
                  <p className="mt-1.5 text-ink/65 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm"><Link href="/resale" className="text-stone-600 font-medium">See all resale plots in Jaipur</Link></p>
          </section>
          <p className="text-center text-xs text-ink/40 mt-12 max-w-md mx-auto leading-relaxed">
            Demand rates are indicative and subject to confirmation. Please verify documents and details before booking.
          </p>
        </div>
      </section>
    </>
  );
}
