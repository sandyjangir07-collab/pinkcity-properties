import { useEffect, useMemo, useState } from "react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { downloadQuotationPDF, formatINRQ } from "../lib/quotationPdf";
import { Card, SectionTitle } from "../components/ui/primitives";
import { FileDown, MessageCircle } from "lucide-react";
import { Button } from "../components/ui/button";

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
    <div className="max-w-2xl mx-auto px-5 py-10">
      <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">PinkCity Properties</div>
      <h1 className="font-display text-3xl text-ink mb-2">Quotation Builder</h1>
      <p className="text-ink/50 text-sm mb-8">Build a plot quotation, download it as a branded PDF, or share it on WhatsApp.</p>

      <div className="space-y-4">
        <Card>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Plot No. *</span>
              <input className="field-input" value={form.plotNo} onChange={(e) => set("plotNo", e.target.value)} />
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Client Name</span>
              <input className="field-input" value={form.client} onChange={(e) => set("client", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Plot Size (Gaj) *</span>
              <input className="field-input" type="number" value={form.size} onChange={(e) => set("size", e.target.value)} />
            </div>
            <div>
              <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Rate (₹ / Gaj) *</span>
              <input className="field-input" type="number" value={form.rate} onChange={(e) => set("rate", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.corner} onChange={(e) => set("corner", e.target.checked)} /> Corner Plot (+5%)</label>
            <label className="flex items-center gap-2 text-sm text-ink/70"><input type="checkbox" checked={form.park} onChange={(e) => set("park", e.target.checked)} /> Park Facing (+5%)</label>
          </div>

          <div className="h-px bg-ink/[0.06] mb-3" />
          <div className="flex justify-between text-sm py-1"><span className="text-ink/50">Base Price</span><span className="text-ink">{formatINRQ(q.base)}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-ink/50">Corner Extra</span><span className="text-ink">{form.corner ? "+" + formatINRQ(q.cornerExtra) : "—"}</span></div>
          <div className="flex justify-between text-sm py-1 mb-3"><span className="text-ink/50">Park Facing Extra</span><span className="text-ink">{form.park ? "+" + formatINRQ(q.parkExtra) : "—"}</span></div>

          <div className="flex justify-between items-center bg-stone-50 rounded-2xl px-4 py-3.5 mb-4">
            <span className="text-sm font-semibold text-ink">Total Quoted Price</span>
            <span className="font-display text-2xl text-stone-600">{formatINRQ(q.total)}</span>
          </div>

          {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleDownload} disabled={downloading} className="text-sm font-medium text-ink/70 border border-ink/10 rounded-full py-3 disabled:opacity-50">
              {downloading ? "Generating…" : <span className="inline-flex items-center gap-1.5"><FileDown className="w-4 h-4" /> Download PDF</span>}
            </button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Quotation"}</Button>
          </div>
        </Card>

        <Card>
          <SectionTitle>My Quotations</SectionTitle>
          {history === null ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 rounded-full border-2 border-ink/15 border-t-stone-500 animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-sm text-ink/40">No quotations yet — build your first one above.</div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const d = new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                const tags = [item.corner_plot ? "Corner" : null, item.park_facing ? "Park Facing" : null].filter(Boolean).join(" · ");
                const waText = encodeURIComponent(
                  `Quotation — Plot ${item.plot_no}\nSize: ${item.plot_size_gaj} Gaj\nRate: ${formatINRQ(item.rate_per_gaj)}/Gaj\n${tags ? tags + "\n" : ""}Total: ${formatINRQ(item.total_price)}`
                );
                return (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink truncate">Plot {item.plot_no}{item.client_name ? ` · ${item.client_name}` : ""}</div>
                      <div className="text-xs text-ink/45">{item.plot_size_gaj} Gaj × {formatINRQ(item.rate_per_gaj)}{tags ? ` · ${tags}` : ""} · {d}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-semibold text-stone-600">{formatINRQ(item.total_price)}</span>
                      <button onClick={() => handleDownloadFromHistory(item)} className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center active:scale-90 transition-transform" title="Download PDF"><FileDown className="w-3.5 h-3.5 text-ink/60" /></button>
                      <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center active:scale-90 transition-transform" title="Share on WhatsApp"><MessageCircle className="w-3.5 h-3.5 text-ink/60" /></a>
                      <button onClick={() => handleDeleteHistory(item.id)} className="text-xs text-ink/40 px-1.5">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
