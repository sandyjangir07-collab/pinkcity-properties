import { useEffect, useMemo, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { downloadQuotationPDF, formatINRQ } from "../lib/quotationPdf";

function computeQuotation(sizeStr, rateStr, corner, park) {
  const size = parseFloat(sizeStr) || 0;
  const rate = parseFloat(rateStr) || 0;
  const base = size * rate;
  const cornerExtra = corner ? base * 0.05 : 0;
  const parkExtra = park ? base * 0.05 : 0;
  const total = base + cornerExtra + parkExtra;
  return { size, rate, base, cornerExtra, parkExtra, total };
}

const emptyForm = { plotNo: "", client: "", size: "", rate: "", corner: false, park: false };

export default function Quotation() {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState(null);

  const q = useMemo(() => computeQuotation(form.size, form.rate, form.corner, form.park), [form.size, form.rate, form.corner, form.park]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function loadHistory() {
    const { data } = await sb.from("quotations").select("*").eq("created_by", user.id).order("created_at", { ascending: false }).limit(20);
    setHistory(data || []);
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function preparedByName() {
    return profile?.full_name || profile?.email || user.email;
  }

  function buildQuoteObject(extra) {
    return {
      plot_no: form.plotNo.trim(),
      client_name: form.client.trim() || null,
      plot_size_gaj: q.size,
      rate_per_gaj: q.rate,
      corner_plot: form.corner,
      park_facing: form.park,
      base_price: q.base,
      corner_extra: q.cornerExtra,
      park_extra: q.parkExtra,
      total_price: q.total,
      created_at: new Date().toISOString(),
      ...extra,
    };
  }

  function validate() {
    if (!form.plotNo.trim() || !q.size || !q.rate) {
      setErr("Fill in Plot No., Plot Size, and Rate first.");
      return false;
    }
    setErr("");
    return true;
  }

  async function handleDownload() {
    if (!validate()) return;
    setDownloading(true);
    try {
      await downloadQuotationPDF(buildQuoteObject(), preparedByName());
    } catch (e) {
      showToast(e.message || "Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await sb.from("quotations").insert(
        buildQuoteObject({ created_by: user.id, created_by_name: preparedByName() })
      );
      if (error) throw error;
      showToast("✓ Quotation saved!");
      setForm(emptyForm);
      loadHistory();
    } catch (e) {
      setErr(e.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHistory(id) {
    if (!window.confirm("Delete this quotation?")) return;
    await sb.from("quotations").delete().eq("id", id);
    loadHistory();
  }

  async function handleDownloadFromHistory(item) {
    try {
      await downloadQuotationPDF(item, preparedByName());
    } catch (e) {
      showToast(e.message || "Could not generate PDF.");
    }
  }

  return (
    <div className="page">
      <div className="page-eyebrow">PinkCity Properties</div>
      <h1 className="page-title">Quotation Builder</h1>
      <p className="page-sub">Build a plot quotation, download it as a branded PDF, or share it on WhatsApp.</p>

      <div className="card">
        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Plot No. *</label>
            <input className="fi" value={form.plotNo} onChange={(e) => set("plotNo", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Client Name</label>
            <input className="fi" value={form.client} onChange={(e) => set("client", e.target.value)} />
          </div>
        </div>
        <div className="field-grid-2">
          <div className="field">
            <label className="fl">Plot Size (Gaj) *</label>
            <input className="fi" type="number" value={form.size} onChange={(e) => set("size", e.target.value)} />
          </div>
          <div className="field">
            <label className="fl">Rate (₹ / Gaj) *</label>
            <input className="fi" type="number" value={form.rate} onChange={(e) => set("rate", e.target.value)} />
          </div>
        </div>
        <div className="field-grid-2" style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input type="checkbox" checked={form.corner} onChange={(e) => set("corner", e.target.checked)} /> Corner Plot (+5%)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
            <input type="checkbox" checked={form.park} onChange={(e) => set("park", e.target.checked)} /> Park Facing (+5%)
          </label>
        </div>

        <div className="divider" />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Base Price</span>
          <span>{formatINRQ(q.base)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Corner Extra</span>
          <span>{form.corner ? "+" + formatINRQ(q.cornerExtra) : "—"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "4px 0 14px" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Park Facing Extra</span>
          <span>{form.park ? "+" + formatINRQ(q.parkExtra) : "—"}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--primary-soft)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 16,
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 15 }}>Total Quoted Price</span>
          <span style={{ fontSize: 22, fontFamily: "var(--font-display)", color: "var(--primary)" }}>{formatINRQ(q.total)}</span>
        </div>

        {err && <div className="form-err show" style={{ marginBottom: 12 }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="btn btn-secondary" disabled={downloading} onClick={handleDownload}>
            {downloading ? "Generating…" : "📄 Download PDF"}
          </button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Quotation"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">My Quotations</h2>
        {history === null ? (
          <div className="center-loading"><div className="spinner" /></div>
        ) : history.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>No quotations yet — build your first one above.</div>
        ) : (
          history.map((item) => {
            const d = new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const tags = [item.corner_plot ? "Corner" : null, item.park_facing ? "Park Facing" : null].filter(Boolean).join(" · ");
            const waText = encodeURIComponent(
              `Quotation — Plot ${item.plot_no}\nSize: ${item.plot_size_gaj} Gaj\nRate: ${formatINRQ(item.rate_per_gaj)}/Gaj\n${tags ? tags + "\n" : ""}Total: ${formatINRQ(item.total_price)}`
            );
            return (
              <div key={item.id} className="info-row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="info-row-value">
                    Plot {item.plot_no}
                    {item.client_name ? ` · ${item.client_name}` : ""}
                  </div>
                  <div className="info-row-label">
                    {item.plot_size_gaj} Gaj × {formatINRQ(item.rate_per_gaj)}
                    {tags ? ` · ${tags}` : ""} · {d}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "var(--primary)", fontWeight: 600 }}>{formatINRQ(item.total_price)}</span>
                  <button className="lead-icon-btn" title="Download PDF" onClick={() => handleDownloadFromHistory(item)}>📄</button>
                  <a className="lead-icon-btn" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" title="Share on WhatsApp">💬</a>
                  <button className="btn btn-secondary" style={{ width: "auto", padding: "6px 10px", fontSize: 11 }} onClick={() => handleDeleteHistory(item.id)}>✕</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
