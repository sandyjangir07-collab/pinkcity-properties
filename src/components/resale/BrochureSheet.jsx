import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createBrochure, shareBrochure } from "../../lib/brochure";
import { Sheet, SheetHeader } from "../ui/Sheet";

function Toggle({ checked, onChange, title, hint }) {
  return (
    <label className="flex min-h-[52px] items-start gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-stone-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12px] text-ink/45">{hint}</span>
      </span>
    </label>
  );
}

// Associate/admin: a one-page branded PDF to send a customer. Property facts
// only — owner details are never part of the listing data this reads.
export default function BrochureSheet({ open, plot, onClose }) {
  const { employee, profile, user } = useAuth();
  const showToast = useToast();
  const [reg, setReg] = useState(true);
  const [notes, setNotes] = useState(false);
  const [contact, setContact] = useState(true);
  const [fullPlan, setFullPlan] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setReg(true);
      setNotes(false);
      setContact(true);
      setFullPlan(true);
      setErr("");
    }
  }, [open]);

  if (!plot) return <Sheet open={false} onClose={onClose} />;
  const name = employee?.full_name || profile?.full_name || "";
  const mobile = employee?.mobile || "";
  const hasPlan = !!plot.site_plan_path;

  async function make() {
    setBusy(true);
    setErr("");
    try {
      const { blob, filename, planStatus } = await createBrochure(plot, {
        includeRegistration: reg,
        includeNotes: notes,
        includeFullPlan: fullPlan,
        contactName: contact ? name : "",
        contactMobile: contact ? mobile : "",
      });
      const r = await shareBrochure(blob, filename, `${plot.scheme} — Plot ${plot.plot_number}`);
      if (planStatus === "failed") showToast("The brochure was created, but the site plan couldn't be added.");
      else if (r === "downloaded") showToast("✓ Brochure downloaded.");
      if (r !== "cancelled") onClose();
    } catch (e) {
      setErr((e && e.message) || "Couldn't create the brochure. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={() => !busy && onClose()} maxWidth="max-w-md">
      <SheetHeader title="Customer brochure" sub={`${plot.scheme} · Plot ${plot.plot_number}`} />
      <div className="mb-3.5 flex items-start gap-3 rounded-2xl bg-stone-50 p-4 text-[13px] leading-relaxed text-ink/65">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-stone-600" />
        <span>
          A branded PDF with the price, size and facts{hasPlan ? ", plus the site plan" : ""}, ready to send on WhatsApp. It never includes owner details.
        </span>
      </div>
      <div className="space-y-2.5">
        <Toggle checked={reg} onChange={setReg} title="Show registration amount" hint="Turn off if you'd rather discuss it in person" />
        <Toggle checked={notes} onChange={setNotes} title="Include property notes" hint="Off by default — notes are written for the team" />
        {hasPlan && <Toggle checked={fullPlan} onChange={setFullPlan} title="Add the site plan at full size" hint="Puts the plan on its own page so every detail is easy to read" />}
        <Toggle checked={contact} onChange={setContact} title="Add my contact details" hint={name ? `${name}${mobile ? " · " + mobile : ""}` : "No name found on your profile"} />
      </div>
      {err && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">{err}</p>}
      <button onClick={make} disabled={busy} className="mt-4 min-h-[52px] w-full rounded-full bg-stone-600 text-[14.5px] font-semibold text-white disabled:opacity-50">
        {busy ? "Creating…" : "Create & Share PDF"}
      </button>
    </Sheet>
  );
}
