import Link from "next/link";
import { sb } from "../../../lib/supabase";
import { buildMetadata } from "../../../lib/seo";
import { CAT_EMOJI } from "../../../lib/blogConstants";

async function getPost(slug) {
  // No status filter here on purpose — this lets a draft be previewed via its
  // direct link (e.g. from the CRM's Preview button) before it's published.
  // The /blog listing page filters to published-only separately, so drafts
  // never show up there or get indexed — only reachable if you have the link.
  const { data } = await sb.from("blogs").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  if (!post) {
    return buildMetadata({ title: "Post not found — PinkCity", description: "This article could not be found.", path: `/blog/${params.slug}` });
  }
  return buildMetadata({
    title: post.seo_title || `${post.title} | PinkCity`,
    description: post.seo_description || post.excerpt,
    path: `/blog/${params.slug}`,
    ogImage: post.cover_image || undefined,
  });
}

export default async function BlogPostPage({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
    return (
      <div className="pt-40 pb-32 text-center">
        <div className="font-display text-3xl text-ink mb-3">Post not found</div>
        <p className="text-ink/50 mb-6">This article may have been unpublished or moved.</p>
        <Link href="/blog" className="text-sm font-medium text-stone-600">← Back to Blog</Link>
      </div>
    );
  }

  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Draft";

  return (
    <article className="pt-32 pb-28">
      <div className="mx-auto max-w-2xl px-6">
        <Link href="/blog" className="text-xs font-medium text-ink/40 hover:text-ink transition-colors">← Back to Blog</Link>

        {post.status !== "published" && (
          <div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium px-4 py-3">
            👁️ Draft preview — this post isn&apos;t published yet and isn&apos;t visible on the public blog list.
          </div>
        )}

        <div className="mt-6 text-[11px] font-medium tracking-widest2 uppercase text-stone-500">{post.category}</div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight mt-3 mb-4">{post.title}</h1>
        <div className="flex items-center gap-3 text-sm text-ink/45 mb-8">
          {!post.author_name || post.author_name === "PinkCity Team" ? (
            <span className="w-6 h-6 rounded-full bg-stone-600 flex items-center justify-center p-1 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-full h-full object-contain" />
            </span>
          ) : null}
          <span>{post.author_name || "PinkCity Team"}</span>
          <span>·</span>
          <span>{dateStr}</span>
          <span>·</span>
          <span>{post.read_time_mins || 3} min read</span>
        </div>

        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_image} alt="" className="w-full rounded-3xl mb-10 aspect-[16/9] object-cover" />
        ) : (
          <div className="w-full rounded-3xl mb-10 aspect-[16/9] bg-stone-50 flex items-center justify-center text-6xl">
            {CAT_EMOJI[post.category] || "📝"}
          </div>
        )}

        <div className="prose-post" dangerouslySetInnerHTML={{ __html: post.content }} />

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-ink/[0.06]">
            {post.tags.map((t) => (
              <span key={t} className="text-xs bg-stone-50 text-stone-600 rounded-full px-3 py-1.5">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
