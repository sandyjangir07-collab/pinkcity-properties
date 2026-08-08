import { useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { sb } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { Card } from "../ui/primitives";

const CALLMEBOT_NUMBER = "+34 644 84 71 47";

export default function WhatsAppOptIn({ employee, onUpdated }) {
  const showToast = useToast();
  const [key, setKey] = useState(employee.whatsapp_apikey || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await sb.from("employees").update({ whatsapp_apikey: key.trim() || null }).eq("id", employee.id);
    setBusy(false);
    if (error) {
      showToast(error.message);
      return;
    }
    showToast(key.trim() ? "✓ WhatsApp alerts enabled!" : "WhatsApp alerts turned off.");
    onUpdated?.();
  }

  const isSet = !!employee.whatsapp_apikey;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-emerald-600" />
        <div className="font-display text-[19px] text-ink">WhatsApp Alerts</div>
        {isSet && (
          <span className="inline-flex items-center gap-1 ml-auto text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
            <Check className="w-2.5 h-2.5" /> Active
          </span>
        )}
      </div>
      <p className="text-xs text-ink/50 leading-relaxed mb-4">
        Get approvals and hierarchy updates on WhatsApp, not just in the app. This needs a one-time setup on your own phone first:
      </p>
      <ol className="text-xs text-ink/60 leading-relaxed space-y-1.5 mb-4 list-decimal list-inside">
        <li>Save <strong className="text-ink">{CALLMEBOT_NUMBER}</strong> as a contact on your phone.</li>
        <li>Send it this exact WhatsApp message: <span className="font-mono bg-stone-50 rounded px-1.5 py-0.5">I allow callmebot to send me messages</span></li>
        <li>You'll get a reply back with your personal API key — paste it below.</li>
      </ol>
      <div className="flex gap-2">
        <input
          className="field-input flex-1"
          placeholder="Paste your CallMeBot API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button
          onClick={save}
          disabled={busy}
          className="shrink-0 rounded-full bg-stone-600 text-sand text-sm font-semibold px-5 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Card>
  );
}
