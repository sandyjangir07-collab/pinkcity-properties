import Link from "next/link";
import { sb } from "../../lib/supabase";
import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";
import { CAT_EMOJI } from "../../lib/blogConstants";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Blog — Property Insights & Investment Guides | PinkCity",
  description: "Investment guides, locality deep-dives, and practical buying advice for Jaipur real estate — stamp duty, ROI data, and corridor-by-corridor analysis.",
  path: "/blog",
});

async function getPosts() {
  try {
    const { data, error } = await sb
      .from("blogs")
      .select("slug,title,excerpt,category,cover_image,read_time_mins,published_at,featured")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Failed to load blog posts:", e);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      <PageHero eyebrow="Insights" title="Property insights & investment guides." description="Straight answers on Jaipur real estate — corridor analysis, legal costs, and where the data actually points." />
      <section className="pb-28">
        <div className="mx-auto max-w-5xl px-6">
          {posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/15 py-24 text-center text-ink/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-14 h-14 object-contain mx-auto mb-4 opacity-25" />
              No posts published yet — check back soon.
            </div>
          ) : (
            <>
              {featured && (
                <Link href={`/blog/${featured.slug}`} className="group grid sm:grid-cols-2 gap-6 rounded-3xl bg-white/70 border border-ink/[0.06] overflow-hidden mb-10">
                  <div className="h-56 sm:h-full bg-stone-50 flex items-center justify-center text-5xl" style={featured.cover_image ? { backgroundImage: `url(${featured.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                    {!featured.cover_image && (CAT_EMOJI[featured.category] || "📝")}
                  </div>
                  <div className="p-7 flex flex-col justify-center">
                    <div className="text-[11px] font-medium tracking-widest2 uppercase text-stone-500 mb-3">{featured.category}</div>
                    <h2 className="font-display text-2xl text-ink leading-tight mb-3 group-hover:text-stone-600 transition-colors">{featured.title}</h2>
                    <p className="text-sm text-ink/55 leading-relaxed mb-4 line-clamp-3">{featured.excerpt}</p>
                    <div className="text-xs text-ink/40">{featured.read_time_mins || 3} min read</div>
                  </div>
                </Link>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {rest.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="group rounded-3xl bg-white/70 border border-ink/[0.06] overflow-hidden">
                    <div className="h-40 bg-stone-50 flex items-center justify-center text-4xl" style={p.cover_image ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
                      {!p.cover_image && (CAT_EMOJI[p.category] || "📝")}
                    </div>
                    <div className="p-5">
                      <div className="text-[11px] font-medium tracking-widest2 uppercase text-stone-500 mb-2">{p.category}</div>
                      <h3 className="font-display text-lg text-ink leading-tight mb-2 group-hover:text-stone-600 transition-colors">{p.title}</h3>
                      <p className="text-sm text-ink/50 line-clamp-2 mb-3">{p.excerpt}</p>
                      <div className="text-xs text-ink/40">{p.read_time_mins || 3} min read</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
