import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { CAT_EMOJI } from "../lib/blogConstants";
import { Button } from "../components/ui/button";
import { Pill } from "../components/ui/primitives";
import BlogFormModal from "../components/blogs/BlogFormModal";
import { BrandedLoader } from "../components/ui/BrandedLoader";

const EASE = [0.22, 1, 0.36, 1];

export default function Blogs() {
  const showToast = useToast();
  const [posts, setPosts] = useState(null);
  const [formTarget, setFormTarget] = useState(null);

  async function load() {
    const { data } = await sb
      .from("blogs")
      .select("id,slug,title,category,cover_image,status,featured,published_at,read_time_mins")
      .order("created_at", { ascending: false });
    setPosts(data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    if (!window.confirm("Delete this blog post permanently?")) return;
    const { error } = await sb.from("blogs").delete().eq("id", id);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast("Post deleted.");
    load();
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Admin</div>
      <h1 className="font-display text-3xl text-ink mb-2">Blog Posts</h1>
      <p className="text-ink/50 text-sm mb-8">Write, publish, and manage articles for the public site.</p>

      <Button onClick={() => setFormTarget("new")} className="mb-6">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
        New Post
      </Button>

      {posts === null ? (
        <div className="flex justify-center py-16"><BrandedLoader size={24} /></div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-3xl text-center py-16 text-ink/40">
          <div className="font-display text-lg text-ink mb-1">No blog posts yet</div>
          <p className="text-sm">Click New Post to write your first article.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p, i) => {
            const em = CAT_EMOJI[p.category] || "📝";
            const dateStr = p.published_at ? new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Draft";
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: (i % 9) * 0.04, ease: EASE }}
                className="bg-white rounded-3xl overflow-hidden hover:shadow-soft transition-shadow"
              >
                <div
                  className="h-28 flex items-center justify-center text-3xl bg-stone-50"
                  style={p.cover_image ? { backgroundImage: `url(${p.cover_image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  {!p.cover_image && em}
                </div>
                <div className="p-4">
                  <div className="text-sm font-medium text-ink">{p.title}</div>
                  <div className="text-xs text-ink/45 mt-1">
                    {p.category} · {dateStr} · {p.read_time_mins || 3} min{p.featured ? " · ⭐ Featured" : ""}
                  </div>
                  <div className="my-2.5">
                    <Pill tone={p.status === "published" ? "green" : "yellow"}>{p.status === "published" ? "● Published" : "◐ Draft"}</Pill>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <a href={`https://pinkcity-front-end.vercel.app/blog/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5 no-underline">
                      Preview
                    </a>
                    <button onClick={() => setFormTarget(p.id)} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-full px-3 py-1.5">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-3 py-1.5">Delete</button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <BlogFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={() => { setFormTarget(null); load(); }} />
    </div>
  );
}
