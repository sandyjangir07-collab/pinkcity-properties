import { useEffect, useRef, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { CATEGORIES } from "../../lib/blogConstants";
import { Modal, ModalHero } from "../ui/Modal";

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "Market Insights",
  seoTitle: "",
  seoDesc: "",
  tags: "",
  readTime: "3",
  author: "PinkCity Team",
  cover: "",
  featured: false,
};

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const FORMATS = {
  h2: (sel) => `<h2>${sel || "Heading"}</h2>`,
  h3: (sel) => `<h3>${sel || "Sub-heading"}</h3>`,
  b: (sel) => `<strong>${sel || "bold text"}</strong>`,
  i: (sel) => `<em>${sel || "italic text"}</em>`,
  ul: (sel) => `<ul>\n  <li>${sel || "List item"}</li>\n  <li>List item</li>\n</ul>`,
  link: (sel) => `<a href="https://pinkcityproperties.com">${sel || "link text"}</a>`,
  quote: (sel) => `<blockquote>${sel || "Quote text"}</blockquote>`,
  img: (sel) => `<img src="IMAGE_URL_HERE" alt="${sel || "description"}"/>`,
  p: (sel) => `<p>${sel || "Paragraph text"}</p>`,
};

// target: "new" | postId | null
export default function BlogFormModal({ target, onClose, onSaved }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("draft");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const contentRef = useRef(null);
  const isEdit = target && target !== "new";

  useEffect(() => {
    if (!target) return;
    setErr("");
    if (target === "new") {
      setForm(emptyForm);
      setStatus("draft");
      return;
    }
    sb.from("blogs").select("*").eq("id", target).maybeSingle().then(({ data }) => {
      if (!data) return;
      setForm({
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        category: data.category || "Market Insights",
        seoTitle: data.seo_title || "",
        seoDesc: data.seo_description || "",
        tags: (data.tags || []).join(", "),
        readTime: String(data.read_time_mins || 3),
        author: data.author_name || "PinkCity Team",
        cover: data.cover_image || "",
        featured: !!data.featured,
      });
      setStatus(data.status || "draft");
    });
  }, [target]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleTitleChange(v) {
    set("title", v);
    if (!isEdit) {
      set("slug", slugify(v));
      setForm((f) => (f.seoTitle ? f : { ...f, seoTitle: v ? `${v} | PinkCity` : "" }));
    }
  }

  function insertFormat(tag) {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    const insert = FORMATS[tag] ? FORMATS[tag](sel) : sel;
    const newValue = ta.value.substring(0, start) + insert + ta.value.substring(end);
    set("content", newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + insert.length;
    });
  }

  async function submit(publish) {
    const title = form.title.trim();
    const slug = form.slug.trim().replace(/[^a-z0-9-]/g, "");
    const content = form.content.trim();
    if (!title || !slug || !content) {
      setErr("Title, slug and content are required.");
      return;
    }
    setBusy(true);
    setErr("");
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    const finalStatus = publish ? "published" : status;
    const payload = {
      title,
      slug,
      excerpt: form.excerpt.trim(),
      content,
      category: form.category,
      seo_title: form.seoTitle.trim() || `${title} | PinkCity`,
      seo_description: form.seoDesc.trim(),
      tags,
      read_time_mins: parseInt(form.readTime) || 3,
      author_name: form.author.trim() || "PinkCity Team",
      cover_image: form.cover.trim() || null,
      status: finalStatus,
      featured: form.featured,
      updated_at: new Date().toISOString(),
      created_by: user.id,
    };
    if (finalStatus === "published" && !isEdit) {
      payload.published_at = new Date().toISOString();
    }
    try {
      if (isEdit) {
        const { error } = await sb.from("blogs").update(payload).eq("id", target);
        if (error) throw error;
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await sb.from("blogs").insert(payload);
        if (error) throw error;
      }
      showToast(publish ? "✓ Post published!" : "✓ Draft saved!");
      onSaved();
    } catch (e) {
      setErr(e.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={!!target} onClose={onClose}>
      <ModalHero title={isEdit ? "Edit Post" : "New Blog Post"} />
      <div className="modal-body">
        <div className="field">
          <label className="fl">Title *</label>
          <input className="fi" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">Slug *</label>
          <input className="fi" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
        </div>
        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Category</label>
            <select className="fsel" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="field">
            <label className="fl">Read Time (mins)</label>
            <input className="fi" type="number" value={form.readTime} onChange={(e) => set("readTime", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="fl">Excerpt</label>
          <textarea className="fi" rows={2} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        </div>

        <div className="field">
          <label className="fl">Content *</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[
              ["h2", "H2"], ["h3", "H3"], ["b", "B"], ["i", "I"], ["ul", "List"],
              ["link", "Link"], ["quote", "Quote"], ["img", "Image"], ["p", "¶"],
            ].map(([tag, label]) => (
              <button key={tag} type="button" className="btn btn-secondary" style={{ width: "auto", padding: "5px 10px", fontSize: 11.5 }} onClick={() => insertFormat(tag)}>
                {label}
              </button>
            ))}
          </div>
          <textarea
            ref={contentRef}
            className="fi"
            rows={10}
            style={{ fontFamily: "monospace", fontSize: 13 }}
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="Write in HTML — use the buttons above to insert tags around your selection."
          />
        </div>

        <div className="divider" />
        <div className="hierarchy-group-label" style={{ margin: "0 0 8px" }}>SEO</div>
        <div className="field">
          <label className="fl">SEO Title</label>
          <input className="fi" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">SEO Description</label>
          <textarea className="fi" rows={2} value={form.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} />
        </div>
        <div className="field">
          <label className="fl">Tags (comma-separated)</label>
          <input className="fi" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
        </div>
        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Author</label>
            <input className="fi" value={form.author} onChange={(e) => set("author", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Cover Image URL</label>
            <input className="fi" value={form.cover} onChange={(e) => set("cover", e.target.value)} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "6px 0 14px" }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> ⭐ Featured
        </label>

        <div className="field">
          <label className="fl">Status</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={"status-pill" + (status === "draft" ? " active" : "")} onClick={() => setStatus("draft")}>Draft</button>
            <button type="button" className={"status-pill" + (status === "published" ? " active" : "")} onClick={() => setStatus("published")}>Published</button>
          </div>
        </div>

        {err && <div className="form-err show" style={{ margin: "10px 0" }}>{err}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <button className="btn btn-secondary" disabled={busy} onClick={() => submit(false)}>
            {busy ? "Saving…" : "Save Draft"}
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={() => submit(true)}>
            {busy ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
