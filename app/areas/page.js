import { buildMetadata } from "../../lib/seo";
import { CORRIDORS } from "../../lib/areasData";
import PageHero from "../../components/PageHero";
import CorridorCard from "../../components/CorridorCard";

export const metadata = buildMetadata({
  title: "Explore Jaipur by Investment Zone — Location Intelligence | PinkCity",
  description:
    "Compare Jaipur's top growth corridors — Ajmer Road, Diggi-Malpura Road, Tonk Road (Shivdaspura & Chaksu), and the Southern Mahindra SEZ belt — with data-backed investment ratings, current pricing, and infrastructure tracking.",
  path: "/areas",
});

export default function AreasPage() {
  return (
    <>
      <PageHero
        eyebrow="Location Intelligence"
        title="Explore Jaipur by investment zone."
        description="Every corridor below gets the same treatment: verified infrastructure with sources, current asking prices from real listings, and PinkCity's own rated assessment — clearly labelled as ours, never dressed up as an official index."
      />
      <section className="pb-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CORRIDORS.map((c, i) => (
              <CorridorCard key={c.slug} corridor={c} index={i} />
            ))}
          </div>
          <p className="text-center text-sm text-ink/40 mt-12 max-w-md mx-auto">
            More corridors get added here as we build them out — bookmark this page rather than any single report.
          </p>
        </div>
      </section>
    </>
  );
}
