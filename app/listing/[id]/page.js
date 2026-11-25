import { sb } from "../../../lib/supabase";
import { buildMetadata } from "../../../lib/seo";
import ListingView from "./ListingView";

// Public columns only. Seller details (submitter name / phone / email, the submitting user and the
// approving admin) must never be requested here: this record is sent to the visitor's browser, and
// buyers reach sellers only through PinkCity. The database also refuses these columns to the public key.
const LISTING_PUBLIC_COLUMNS = [
  "id", "title", "type", "area", "price", "size", "description", '"desc"', "image_url", "images", "status", "verified",
  "created_at", "approved_at", "updated_at", "road_width", "facing", "agreement_value", "approval_type", "rera_approved",
  "plot_size", "plot_length", "plot_width", "plot_size_unit", "corner_plot", "park_facing", "no_of_units",
  "total_project_area", "amenities", "project_map_url", "colony_road_type", "location_map_url", "approach_road",
  "latitude", "longitude", "highlights", "nearby_landmarks",
].join(",");

async function getListing(id) {
  const { data } = await sb.from("listings").select(LISTING_PUBLIC_COLUMNS).eq("id", id).eq("status", "active").maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const data = await getListing(params.id);
  if (!data) {
    return buildMetadata({
      title: "Property Details — PinkCity",
      description: "Verified property listing in Jaipur — legally checked, transparent pricing, end-to-end buying support from PinkCity.",
      path: `/listing/${params.id}`,
    });
  }
  const ogDesc = `${data.title || ""} in ${data.area || "Jaipur"}. ${data.price || ""} · Verified by PinkCity.`;
  return buildMetadata({
    title: `${data.title} — Verified Property in ${data.area || "Jaipur"} | PinkCity`,
    description: ogDesc,
    path: `/listing/${params.id}`,
    ogImage: data.image_url || undefined,
  });
}

export default async function ListingPage({ params }) {
  const data = await getListing(params.id);
  return <ListingView data={data} id={params.id} />;
}
