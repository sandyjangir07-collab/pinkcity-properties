import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { useToast } from "../hooks/useToast";
import { CAT_EMOJI } from "../lib/blogConstants";
import { IconPlus } from "../components/ui/Icons";
import BlogFormModal from "../components/blogs/BlogFormModal";

export default function Blogs() {
  const showToast = useToast();
  const [posts, setPosts] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // "new" | postId | null

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
    <div className="page">
      <div className="page-eyebrow">Admin</div>
      <h1 className="page-title">Blog Posts</h1>
      <p className="page-sub">Write, publish, and manage articles for the public site.</p>

      <button className="btn btn-primary" style={{ width: "auto", display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }} onClick={() => setFormTarget("new")}>
        <IconPlus size={15} stroke="white" /> New Post
      </button>

      {posts === null ? (
        <div className="center-loading"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-title">No blog posts yet</div>
          <p>Click New Post to write your first article.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {posts.map((p) => {
            const em = CAT_EMOJI[p.category] || "📝";
            const dateStr = p.published_at ? new Date(p.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Draft";
            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ height: 110, background: p.cover_image ? `url(${p.cover_image}) center/cover` : "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                  {!p.cover_image && em}
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 3 }}>
                    {p.category} · {dateStr} · {p.read_time_mins || 3} min{p.featured ? " · ⭐ Featured" : ""}
                  </div>
                  <div style={{ margin: "8px 0 10px" }}>
                    <span className={"pill " + (p.status === "published" ? "pill-green" : "pill-yellow")}>
                      {p.status === "published" ? "● Published" : "◐ Draft"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={`/blog-post.html?slug=${p.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ width: "auto", padding: "7px 12px", fontSize: 12, textDecoration: "none" }}>
                      Preview
                    </a>
                    <button className="btn btn-secondary" style={{ width: "auto", padding: "7px 12px", fontSize: 12 }} onClick={() => setFormTarget(p.id)}>
                      Edit
                    </button>
                    <button className="btn-reject" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => handleDelete(p.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BlogFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={() => { setFormTarget(null); load(); }} />
    </div>
  );
}
