import { sb } from "../lib/supabase";
import HomeClient from "../components/HomeClient";
import { getResaleList } from "../lib/resale";

export const revalidate = 300;

async function getActiveListings() {
  try {
    const { data, error } = await sb
      .from("listings")
      .select("id,title,type,area,price,size,image_url,images,verified")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Failed to load listings:", e);
    return [];
  }
}

export default async function HomePage() {
  const [listings, resale] = await Promise.all([getActiveListings(), getResaleList()]);
  // Plot of the week first (the list already comes featured-first), three on the homepage.
  return <HomeClient listings={listings} resalePlots={resale.slice(0, 3)} resaleCount={resale.length} />;
}
