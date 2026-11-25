import { buildMetadata } from "../../lib/seo";
import Link from "next/link";
import { getResaleList, groupByArea, areaPath, MIN_PLOTS_FOR_AREA_PAGE } from "../../lib/resale";
import { breadcrumbLd, faqLd, itemListLd, RESALE_FAQS } from "../../lib/resaleSeo";
import PageHero from "../../components/PageHero";
import ResaleCatalogue from "../../components/resale/ResaleCatalogue";

// Refreshes itself every few minutes: switch a plot to Public in the CRM and it appears here.
export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Resale Plots in Jaipur for Sale — Sizes, Rates & Site Plans | PinkCity",
  description:
    "Resale plots in Jaipur for sale with plot size in Gaj, rate per Gaj, total demand and site plan shown upfront. One point of contact from site visit to registration — PinkCity Properties & Consultants.",
  path: "/resale",
});

export default async function ResalePage() {
  const plots = await getResaleList();
  const areas = groupByArea(plots).filter((a) => a.plots.length >= MIN_PLOTS_FOR_AREA_PAGE);
  const ld = [
    breadcrumbLd([{ name: "Home", path: "/" }, { name: "Resale plots in Jaipur", path: "/resale" }]),
    faqLd(RESALE_FAQS),
    ...(plots.length ? [itemListLd("Resale plots in Jaipur", plots)] : []),
  ];
  return (
    <>
      {ld.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <PageHero
        eyebrow="Resale Plots"
        title="Resale plots in Jaipur."
        description="Real plots from real schemes, with the size, rate and total demand shown upfront. Tap any plot for the site plan, or ask us and we'll walk you through it."
      />
      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <ResaleCatalogue plots={plots} />
          <p className="text-center text-xs text-ink/40 mt-12 max-w-md mx-auto leading-relaxed">
            Demand rates are indicative and subject to confirmation. Please verify documents and details before booking.
          </p>
          {areas.length > 0 && (
            <nav aria-label="Resale plots by area" className="mt-16 max-w-3xl mx-auto text-center">
              <h2 className="font-display text-2xl text-ink mb-4">Resale plots by area</h2>
              <div className="flex flex-wrap justify-center gap-2">
                {areas.map((a) => (
                  <Link key={a.slug} href={areaPath(a.slug)} className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink/80 hover:border-stone-500">
                    {a.name} ({a.plots.length})
                  </Link>
                ))}
              </div>
            </nav>
          )}
          <section className="mt-20 max-w-3xl mx-auto">
            <h2 className="font-display text-3xl text-ink mb-3">Buying a resale plot in Jaipur</h2>
            <p className="text-ink/65 leading-relaxed mb-8">
              Every plot here shows its size in Gaj, the rate per Gaj and the total demand upfront, with the site plan where we have it.
              PinkCity Properties &amp; Consultants handles the process end to end: site visit, negotiation, document checks and registration support.
            </p>
            <h2 className="font-display text-3xl text-ink mb-4">Frequently asked questions</h2>
            <div className="divide-y divide-ink/10 border-y border-ink/10">
              {RESALE_FAQS.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium text-ink flex justify-between gap-4">
                    {f.q}<span className="text-stone-500 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-ink/65 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
