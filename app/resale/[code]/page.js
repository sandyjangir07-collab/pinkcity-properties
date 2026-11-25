import { Suspense } from "react";
import { notFound } from "next/navigation";
import { buildMetadata } from "../../../lib/seo";
import Link from "next/link";
import { getResalePlot, getResaleList, formatGaj, formatINR, plotPath, areaPath, slugify, MIN_PLOTS_FOR_AREA_PAGE } from "../../../lib/resale";
import { breadcrumbLd, plotLd } from "../../../lib/resaleSeo";
import PlotView from "../../../components/resale/PlotView";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const plot = await getResalePlot(params.code);
  const path = `/resale/${params.code}`;
  if (!plot) {
    return { ...buildMetadata({ title: "Resale plot — PinkCity", description: "Resale plots in Jaipur from PinkCity Properties & Consultants.", path }), robots: { index: false, follow: true } };
  }
  const title = `${formatGaj(plot.area_gaj)} Plot in ${plot.scheme}, ${plot.location}, Jaipur — ${formatINR(plot.total_demand)} | PinkCity`;
  const description = `${formatGaj(plot.area_gaj)} plot in ${plot.scheme}, ${plot.location}${plot.facing ? `, ${plot.facing} facing` : ""}. Total demand ${formatINR(plot.total_demand)}. Site plan and details from PinkCity.`;
  const meta = buildMetadata({ title, description, path });
  // A plot that has been sold keeps working for anyone with the link, but Google shouldn't list it.
  if (plot.status === "sold" || plot.status === "unavailable") meta.robots = { index: false, follow: true };
  return meta;
}

export default async function ResalePlotPage({ params }) {
  const plot = await getResalePlot(params.code);
  if (!plot) notFound();
  const all = await getResaleList();
  const sameArea = all.filter((p) => p.location === plot.location);
  const similar = [
    ...sameArea.filter((p) => p.public_code !== plot.public_code),
    ...all.filter((p) => p.location !== plot.location),
  ].slice(0, 4);
  const hasAreaPage = sameArea.length >= MIN_PLOTS_FOR_AREA_PAGE;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Resale plots in Jaipur", path: "/resale" },
    ...(hasAreaPage ? [{ name: plot.location, path: areaPath(slugify(plot.location)) }] : []),
    { name: `${plot.scheme} Plot ${plot.plot_number}`, path: plotPath(plot.public_code) },
  ];
  return (
    <>
      {[plotLd(plot), breadcrumbLd(crumbs)].map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }} />
      ))}
      <Suspense fallback={null}>
        <PlotView plot={plot} />
      </Suspense>
      {similar.length > 0 && (
        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="font-display text-2xl text-ink mb-4">More resale plots in Jaipur</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {similar.map((p) => (
                <li key={p.public_code}>
                  <Link href={plotPath(p.public_code)} className="block rounded-2xl border border-ink/10 bg-white/70 p-4 hover:border-stone-500">
                    <div className="text-xs text-ink/45">{p.location}</div>
                    <div className="font-medium text-ink">{p.scheme} — Plot {p.plot_number}</div>
                    <div className="text-sm text-ink/60">{formatGaj(p.area_gaj)} · {formatINR(p.total_demand)}</div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm">
              <Link href="/resale" className="text-stone-600 font-medium">All resale plots</Link>
              {hasAreaPage && <> · <Link href={areaPath(slugify(plot.location))} className="text-stone-600 font-medium">Resale plots in {plot.location}</Link></>}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
