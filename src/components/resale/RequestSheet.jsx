import { useEffect, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { friendlyError } from "../../lib/resale";
import { Sheet, SheetHeader } from "../ui/Sheet";

const KINDS = [
  { id: "correction", label: "Correct some details" },
  { id: "availability", label: "Update availability" },
];

// Associates can't edit listings — they ask the admin to fix or update one.
export default function RequestSheet({ open, plot, onClose }) {
  const { profile, user } = useAuth();
  const showToast = useToast();
  const [kind, setKind] = useState("correction");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setKind("correction");
      setMessage("");
    }
  }, [open]);

  async function submit() {
    if (!message.trim() || !plot) return;
    setBusy(true);
    const { error } = await sb.from("resale_plot_requests").insert({
      plot_id: plot.id,
      kind,
      message: message.trim(),
      requested_by_name: profile?.full_name || profile?.email || user?.email || null,
    });
    setBusy(false);
    if (error) {
      showToast(friendlyError(error));
      return;
    }
    showToast("✓ Sent to the admin.");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      <SheetHeader title="Ask the admin" sub={plot ? `${plot.scheme} · Plot ${plot.plot_number}` : ""} />
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            className={`min-h-[44px] rounded-full border px-4 text-[13.5px] font-semibold ${kind === k.id ? "border-stone-600 bg-stone-600 text-white" : "border-ink/10 text-ink/60"}`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <textarea
        className="field-input mt-4 min-h-[110px]"
        placeholder={kind === "correction" ? "What looks wrong? e.g. The rate should be ₹19,000 per Gaj" : "What changed? e.g. This plot is now sold"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button
        onClick={submit}
        disabled={busy || !message.trim()}
        className="mt-4 min-h-[50px] w-full rounded-full bg-stone-600 text-[14.5px] font-semibold text-white disabled:opacity-40"
      >
        {busy ? "Sending…" : "Send to admin"}
      </button>
    </Sheet>
  );
}
