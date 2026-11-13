import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader } from "../ui/Sheet";

// The owner (or an admin) shares a lead with another associate. The owner stays the
// primary owner; both can then see every note, add notes and update the lead.
export default function TransferLeadSheet({ open, lead, onClose, onDone }) {
  const showToast = useToast();
  const [people, setPeople] = useState([]);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    setTarget("");
    setNote("");
    // Names only. Associates can't read the employees table directly (phone numbers,
    // documents), so this goes through a small lookup that returns just who can be picked.
    sb.rpc("lead_transfer_candidates").then(({ data }) =>
      setPeople((data || []).filter((p) => p.user_id !== lead.created_by))
    );
  }, [open, lead?.id]);

  if (!lead) return <Sheet open={false} onClose={onClose} />;
  const owner = lead.created_by_name || "the owner";
  const sharedWith = lead.assigned_to_name;

  async function share() {
    if (!target) return;
    setBusy(true);
    const { error } = await sb.rpc("transfer_lead", { p_lead_id: lead.id, p_to_user: target, p_note: note || null });
    setBusy(false);
    if (error) return showToast(error.message);
    const name = people.find((p) => p.user_id === target)?.full_name || "them";
    showToast(`✓ Shared with ${name}. They've been told.`);
    onDone();
  }

  async function stop() {
    setStopping(true);
    const { error } = await sb.rpc("end_lead_transfer", { p_lead_id: lead.id });
    setStopping(false);
    if (error) return showToast(error.message);
    showToast("✓ Sharing stopped. The lead is back with its owner.");
    onDone();
  }

  return (
    <Sheet open={open} onClose={() => !busy && !stopping && onClose()} maxWidth="max-w-md">
      <SheetHeader title={sharedWith ? "Change who it's shared with" : "Transfer to another associate"} sub={lead.name} />

      <div className="mb-4 flex items-start gap-3 rounded-2xl bg-stone-50 p-4 text-[13px] leading-relaxed text-ink/65">
        <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-stone-600" />
        <span>
          <b className="font-semibold text-ink">{owner} stays the primary owner.</b> The associate you pick will see this lead, every note on it and its visits. You can both add notes, edit the notes and update the status.
        </span>
      </div>

      {sharedWith && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-ochre/30 bg-ochre/10 px-4 py-3">
          <span className="text-[13px] text-ink/70">Currently shared with <b className="font-semibold text-ink">{sharedWith}</b></span>
          <button onClick={stop} disabled={stopping} className="shrink-0 rounded-full border border-red-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-red-600 disabled:opacity-50">
            {stopping ? "Stopping…" : "Stop sharing"}
          </button>
        </div>
      )}

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">{sharedWith ? "Share with someone else" : "Transfer to"}</span>
        <select className="field-input" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Choose an associate…</option>
          {people.filter((p) => p.user_id !== lead.assigned_to).map((p) => (
            <option key={p.id} value={p.user_id}>{p.full_name}{p.designation ? ` — ${p.designation}` : ""}</option>
          ))}
        </select>
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[13px] font-semibold text-ink/80">Note for them <span className="font-normal text-ink/40">(optional)</span></span>
        <textarea className="field-input min-h-[76px]" placeholder="e.g. Client prefers evening calls — please follow up on Friday" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>

      <button onClick={share} disabled={!target || busy} className="mt-4 min-h-[52px] w-full rounded-full bg-crimson text-[14.5px] font-semibold text-white disabled:opacity-40">
        {busy ? "Sharing…" : "Transfer lead"}
      </button>
    </Sheet>
  );
}
