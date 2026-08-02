import { useEffect, useRef, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { CATEGORIES } from "../../lib/blogConstants";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";

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
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-lg">
      <SheetHeader title={isEdit ? "Edit Post" : "New Blog Post"} />
      <div className="space-y-4">
        <Field label="Title *"><input className="field-input" value={form.title} onChange={(e) => handleTitleChange(e.target.value)} /></Field>
        <Field label="Slug *"><input className="field-input" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className="field-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="Read Time (mins)"><input className="field-input" type="number" value={form.readTime} onChange={(e) => set("readTime", e.target.value)} /></Field>
        </div>
        <Field label="Excerpt"><textarea className="field-input min-h-[60px]" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></Field>

        <Field label="Content *">
          <div className="flex gap-1.5 flex-wrap mb-2">
            {[
              ["h2", "H2"], ["h3", "H3"], ["b", "B"], ["i", "I"], ["ul", "List"],
              ["link", "Link"], ["quote", "Quote"], ["img", "Image"], ["p", "¶"],
            ].map(([tag, label]) => (
              <button key={tag} type="button" onClick={() => insertFormat(tag)} className="text-xs font-medium text-ink/60 border border-ink/10 rounded-lg px-2.5 py-1">
                {label}
              </button>
            ))}
          </div>
          <textarea
            ref={contentRef}
            className="field-input min-h-[220px] font-mono text-xs"
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="Write in HTML — use the buttons above to insert tags around your selection."
          />
        </Field>

        <div className="h-px bg-ink/[0.06]" />
        <div className="text-[10px] font-semibold tracking-wide uppercase text-ink/35">SEO</div>
        <Field label="SEO Title"><input className="field-input" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
        <Field label="SEO Description"><textarea className="field-input min-h-[60px]" value={form.seoDesc} onChange={(e) => set("seoDesc", e.target.value)} /></Field>
        <Field label="Tags (comma-separated)"><input className="field-input" value={form.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Author"><input className="field-input" value={form.author} onChange={(e) => set("author", e.target.value)} /></Field>
          <Field label="Cover Image URL"><input className="field-input" value={form.cover} onChange={(e) => set("cover", e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} /> ⭐ Featured</label>

        <Field label="Status">
          <div className="flex gap-2">
            <button type="button" onClick={() => setStatus("draft")} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${status === "draft" ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}>Draft</button>
            <button type="button" onClick={() => setStatus("published")} className={`text-xs font-medium px-3 py-1.5 rounded-full border ${status === "published" ? "bg-stone-600 text-sand border-stone-600" : "border-ink/10 text-ink/60"}`}>Published</button>
          </div>
        </Field>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button disabled={busy} onClick={() => submit(false)} className="text-sm font-medium text-ink/70 border border-ink/10 rounded-full py-3 disabled:opacity-50">
            {busy ? "Saving…" : "Save Draft"}
          </button>
          <button disabled={busy} onClick={() => submit(true)} className="text-sm font-medium text-sand bg-stone-600 rounded-full py-3 disabled:opacity-50">
            {busy ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
