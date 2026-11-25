import { buildMetadata } from "../../lib/seo";
import { CORRIDOR_DETAILS } from "../../lib/corridorDetails";
import PageHero from "../../components/PageHero";
import CorridorDetailView from "../../components/CorridorDetailView";

const data = CORRIDOR_DETAILS["mahindra-sez-south"];

export const metadata = buildMetadata({
  title: `${data.title} — Investment Profile & Verified Infrastructure | PinkCity`,
  description: `A data-backed investment profile for ${data.title} — connectivity, infrastructure pipeline, current pricing, and PinkCity's own sourced investment rating.`,
  path: "/mahindra-sez-south",
});

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Location Intelligence" title={data.title + "."} description="A data-backed investment profile — every claim on this page is sourced; where no public index exists, we say so." />
      <CorridorDetailView data={data} />
    </>
  );
}
