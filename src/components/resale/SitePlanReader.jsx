import { useEffect, useMemo, useState } from "react";
import { Sparkles, AlertTriangle, Check, Search } from "lucide-react";
import { Sheet, SheetHeader } from "../ui/Sheet";
import { BrandedLoader } from "../ui/BrandedLoader";
import { FACINGS } from "../../lib/resale";
import { FIELD_ORDER, plotToFormValues, readSitePlan } from "../../lib/sitePlanReader";

const BADGE = {
  high: { text: "Clear", cls: "bg-emerald-50 text-emerald-700" },
  medium: { text: "Check", cls: "bg-amber-50 text-amber-700" },
  low: { text: "Hard to read, check", cls: "bg-red-50 text-red-600" },
};

// Reads a site plan and lets the admin confirm each detail before it goes into the form.
// `load` returns plan page pictures; `current` is what the form already holds; `onApply` fills the form.
export default function SitePlanReader({ open, onClose, load, current, onApply }) {
  const [state, setState] = useState("idle"); // idle | reading | error | pick | review
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [plot, setPlot] = useState(null);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState({}); // key -> { use, value }

  useEffect(() => {
    if (!open) return;
    let live = true;
    setState("reading"); setError(""); setResult(null); setPlot(null); setSearch("");
    (async () => {
      try {
        const { pages } = await load();
        if (!pages.length) throw new Error("Couldn't open that file.");
        const r = await readSitePlan(pages);
        if (!live) return;
        setResult(r);
        const plots = (r.plots || []).filter((p) => p.plot_number);
        if (r.document_type === "unclear" || (!plots.length && !r.scheme_name && !r.location)) {
          setError((r.notes && r.notes[0]) || "This doesn't look like a readable site plan.");
          setState("error");
        } else if (plots.length > 1) setState("pick");
        else choose(r, plots[0] || r.plots?.[0] || {});
      } catch (e) {
        if (!live) return;
        setError(e.message || "Couldn't read the plan.");
        setState("error");
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function choose(r, p) {
    const { fields, warnings } = plotToFormValues(p, r);
    setPlot({ fields, warnings });
    const next = {};
    for (const [k] of FIELD_ORDER) {
      const f = fields[k];
      if (!f.value) continue;
      const existing = current[k];
      // Don't quietly overwrite something already typed: it starts unticked.
      next[k] = { use: !existing || String(existing) === String(f.value), value: f.value };
    }
    setRows(next);
    setState("review");
  }

  const plots = useMemo(() => (result?.plots || []).filter((p) => p.plot_number), [result]);
  const shown = plots.filter((p) => !search.trim() || String(p.plot_number).toLowerCase().includes(search.trim().toLowerCase()));
  const missing = plot ? FIELD_ORDER.filter(([k]) => !plot.fields[k].value).map(([, label]) => label) : [];
  const count = Object.values(rows).filter((r) => r.use && String(r.value).trim()).length;

  function apply() {
    const values = {};
    for (const [k, r] of Object.entries(rows)) if (r.use && String(r.value).trim()) values[k] = String(r.value).trim();
    onApply(values);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Read from site plan" sub="Check each detail before it goes into the listing." />

      {state === "reading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <BrandedLoader size={26} />
          <div className="text-sm text-ink/60">Reading the site plan…<br />This takes about 10–20 seconds.</div>
        </div>
      )}

      {state === "error" && (
        <div className="py-6 text-center">
          <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
          <p className="mt-3 text-sm leading-relaxed text-ink/70">{error}</p>
          <p className="mt-2 text-xs text-ink/40">You can still fill the listing in by hand.</p>
          <button onClick={onClose} className="mt-5 min-h-[44px] rounded-full bg-stone-600 px-6 text-sm font-semibold text-white">Fill it in myself</button>
        </div>
      )}

      {state === "pick" && (
        <div>
          <p className="mb-3 text-sm text-ink/60">This plan shows {plots.length} plots. Which one is this listing for?</p>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type the plot number" inputMode="search" className="field-input pl-10" />
          </div>
          <div className="max-h-[48vh] space-y-2 overflow-y-auto">
            {shown.map((p, i) => (
              <button key={`${p.plot_number}-${i}`} onClick={() => choose(result, p)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left">
                <span className="font-display text-lg font-semibold text-ink">Plot {p.plot_number}</span>
                <span className="text-xs text-ink/50">{p.length && p.width ? `${p.length} × ${p.width} ${p.dimension_unit || "ft"}` : p.area_value ? `${p.area_value} ${p.area_unit === "sq_ft" ? "sq ft" : p.area_unit === "sq_m" ? "sq m" : "Gaj"}` : "size not read"}</span>
              </button>
            ))}
            {shown.length === 0 && <div className="py-6 text-center text-sm text-ink/40">No plot with that number was read from the plan.</div>}
          </div>
        </div>
      )}

      {state === "review" && plot && (
        <div>
          {(result.notes || []).length > 0 && (
            <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">{result.notes.join(" ")}</div>
          )}
          {plot.warnings.map((w) => (
            <div key={w} className="mb-3 flex gap-2 rounded-2xl bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</div>
          ))}
          <div className="space-y-2.5">
            {FIELD_ORDER.filter(([k]) => rows[k]).map(([k, label]) => {
              const f = plot.fields[k];
              const r = rows[k];
              const badge = BADGE[f.confidence];
              const existing = current[k];
              return (
                <div key={k} className={`rounded-2xl border p-3.5 ${r.use ? "border-stone-600/30 bg-white" : "border-ink/10 bg-white/50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-[13px] font-semibold text-ink/80">
                      <input type="checkbox" className="h-4 w-4 accent-stone-600" checked={r.use} onChange={(e) => setRows((x) => ({ ...x, [k]: { ...x[k], use: e.target.checked } }))} />
                      {label}
                    </label>
                    {badge && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${badge.cls}`}>{badge.text}</span>}
                  </div>
                  {k === "facing" ? (
                    <select className="field-input mt-2" value={r.value} onChange={(e) => setRows((x) => ({ ...x, [k]: { use: true, value: e.target.value } }))}>
                      {FACINGS.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  ) : (
                    <input className="field-input mt-2" value={r.value} onChange={(e) => setRows((x) => ({ ...x, [k]: { use: true, value: e.target.value } }))} />
                  )}
                  {f.evidence && <div className="mt-1.5 text-[11.5px] text-ink/45">{f.evidence}</div>}
                  {existing && String(existing) !== String(f.value) && <div className="mt-1 text-[11.5px] text-amber-700">The form currently says "{existing}". Tick to replace it.</div>}
                </div>
              );
            })}
          </div>
          {missing.length > 0 && <p className="mt-3 text-xs leading-relaxed text-ink/45">Not found on the plan: {missing.join(", ")}.</p>}
          <p className="mt-1 text-xs leading-relaxed text-ink/45">Rate, registration amount and owner details are never taken from the plan. You add those yourself.</p>
          <div className="mt-4 flex gap-3">
            <button onClick={onClose} className="min-h-[50px] flex-1 rounded-full border border-ink/10 bg-white text-sm font-semibold text-ink/70">Cancel</button>
            <button onClick={apply} disabled={count === 0} className="flex min-h-[50px] flex-[2] items-center justify-center gap-2 rounded-full bg-stone-600 text-sm font-semibold text-white disabled:opacity-40">
              <Check className="h-4 w-4" /> Use {count} {count === 1 ? "detail" : "details"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function ReadPlanCard({ onPick, onReadCurrent, hasCurrent, busy }) {
  return (
    <div className="mt-5 rounded-[22px] border border-stone-600/20 bg-gradient-to-br from-stone-50 to-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-600 text-white"><Sparkles className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-ink">Start with the site plan</div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink/55">Upload it and the details printed on it are filled in for you. You confirm each one first.</p>
        </div>
      </div>
      <label className={`mt-4 flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full bg-stone-600 px-5 text-[14px] font-semibold text-white ${busy ? "opacity-50 pointer-events-none" : ""}`}>
        Upload site plan and read it
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { const file = e.target.files[0]; e.target.value = ""; if (file) onPick(file); }} />
      </label>
      {hasCurrent && (
        <button type="button" onClick={onReadCurrent} className="mt-2.5 w-full text-center text-[13px] font-semibold text-stone-700">Read the plan already uploaded</button>
      )}
    </div>
  );
}
