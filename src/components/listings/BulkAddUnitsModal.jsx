import { useState } from "react";
import { Sparkles } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

// target: { listingId, listingTitle } | null
export default function BulkAddUnitsModal({ target, onClose, onSaved }) {
  const showToast = useToast();
  const [text, setText] = useState("");
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState("1");
  const [end, setEnd] = useState("10");
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function generateRange() {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    if (isNaN(s) || isNaN(e) || e < s) {
      setErr("Enter a valid start and end number.");
      return;
    }
    if (e - s > 500) {
      setErr("That's a lot in one go — try 500 plots or fewer at a time.");
      return;
    }
    setErr("");
    const lines = [];
    for (let n = s; n <= e; n++) {
      lines.push(`${prefix}${n}, ${size}`.replace(/, $/, ""));
    }
    setText((t) => (t ? t + "\n" + lines.join("\n") : lines.join("\n")));
  }

  function parseLines() {
    return text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [num, ...rest] = line.split(",");
        return { unit_number: num.trim(), unit_size: rest.join(",").trim() || null };
      })
      .filter((u) => u.unit_number);
  }

  async function submit(e) {
    e.preventDefault();
    const units = parseLines();
    if (units.length === 0) {
      setErr("Add at least one plot — one per line, as \"number, size\".");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { error } = await sb.from("colony_units").insert(
        units.map((u) => ({
          listing_id: target.listingId,
          unit_number: u.unit_number,
          unit_size: u.unit_size,
          status: "available",
        }))
      );
      if (error) throw error;
      showToast(`✓ Added ${units.length} plot${units.length > 1 ? "s" : ""}!`);
      setText("");
      onSaved && onSaved();
    } catch (e2) {
      setErr(e2.message || "Could not add these plots — check for duplicate plot numbers.");
    } finally {
      setBusy(false);
    }
  }

  const previewCount = parseLines().length;

  return (
    <Sheet open={!!target} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Add Plots" sub={target?.listingTitle} />

      <div className="rounded-2xl bg-stone-50/60 p-4 mb-5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Quick generate a range
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-2.5">
          <Field label="Prefix"><input className="field-input" placeholder="A-" value={prefix} onChange={(e) => setPrefix(e.target.value)} /></Field>
          <Field label="From #"><input className="field-input" type="number" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="To #"><input className="field-input" type="number" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2.5 items-end">
          <Field label="Size for all (e.g. 200 Gaj)"><input className="field-input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="200 Gaj" /></Field>
          <button type="button" onClick={generateRange} className="h-[46px] px-4 rounded-xl bg-stone-600 text-sand text-xs font-semibold shrink-0">
            Generate
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Field label={`Plots to add${previewCount ? ` (${previewCount})` : ""} — one per line, as "number, size"`}>
          <textarea
            className="field-input min-h-[160px] font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"A-1, 200 Gaj\nA-2, 200 Gaj\nA-3, 250 Gaj"}
          />
        </Field>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button disabled={busy} type="submit" className="w-full">
          {busy ? "Adding…" : `Add ${previewCount || ""} Plot${previewCount === 1 ? "" : "s"}`}
        </Button>
      </form>
    </Sheet>
  );
}
