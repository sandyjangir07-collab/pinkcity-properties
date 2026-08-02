import { useEffect, useRef, useState } from "react";
import { sb } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { Sheet, SheetHeader, Field } from "../ui/Sheet";
import { Button } from "../ui/button";

const PRESETS = [
  { label: "🟢 Interested", value: "Interested — following up" },
  { label: "🔴 Not interested", value: "Not interested" },
  { label: "⚪ No answer", value: "No answer" },
  { label: "🟡 Call back later", value: "Asked to call back later" },
];

export default function CallOutcomeWatcher({ onLogged }) {
  const { user, profile } = useAuth();
  const showToast = useToast();
  const pendingRef = useRef(null);
  const [prompt, setPrompt] = useState(null); // { id, name } | null
  const [note, setNote] = useState("");

  useEffect(() => {
    function onClick(e) {
      const btn = e.target.closest('a[href^="tel:"][data-lead-id]');
      if (!btn) return;
      pendingRef.current = { id: btn.dataset.leadId, name: btn.dataset.leadName, at: Date.now() };
    }
    function onVisibility() {
      if (document.visibilityState !== "visible" || !pendingRef.current) return;
      const elapsed = Date.now() - pendingRef.current.at;
      if (elapsed < 4000 || elapsed > 15 * 60 * 1000) {
        pendingRef.current = null;
        return;
      }
      const call = pendingRef.current;
      pendingRef.current = null;
      setNote("");
      setPrompt({ id: call.id, name: call.name || "this lead" });
    }
    document.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function save(preset) {
    const typed = note.trim();
    const finalNote = preset && typed ? `${preset} — ${typed}` : preset || typed;
    if (!prompt || !finalNote) {
      setPrompt(null);
      return;
    }
    const submitterName = profile?.full_name || profile?.email || user.email;
    try {
      await sb.from("lead_notes").insert({
        lead_id: prompt.id,
        note: "📞 " + finalNote,
        created_by: user.id,
        created_by_name: submitterName,
        created_at: new Date().toISOString(),
      });
      await sb.from("leads").update({ updated_at: new Date().toISOString() }).eq("id", prompt.id);
      showToast("✓ Logged");
      onLogged && onLogged();
    } catch (e) {
      console.error("Call outcome save failed:", e);
    }
    setPrompt(null);
  }

  return (
    <Sheet open={!!prompt} onClose={() => setPrompt(null)} maxWidth="max-w-sm">
      <SheetHeader title="How did the call go?" sub={prompt ? `With ${prompt.name}` : ""} />
      <div className="grid grid-cols-2 gap-2 mb-4">
        {PRESETS.map((p) => (
          <button key={p.value} onClick={() => save(p.value)} className="text-xs font-medium text-ink/70 border border-ink/10 rounded-xl py-2.5">
            {p.label}
          </button>
        ))}
      </div>
      <Field label="Or add a note">
        <input className="field-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details…" />
      </Field>
      <Button onClick={() => save(null)} className="w-full mt-4">Save note</Button>
    </Sheet>
  );
}
