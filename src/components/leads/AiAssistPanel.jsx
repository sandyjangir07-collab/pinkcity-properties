import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { sb } from "../../lib/supabase";

// Calls the `lead-ai-assist` Supabase Edge Function, which reads this lead's
// notes/timeline and asks Claude for a next-move suggestion, objection
// handling tips, and a short summary. Nothing is fetched automatically —
// only on tap, to keep API usage predictable.
export default function AiAssistPanel({ leadId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function run() {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await sb.functions.invoke("lead-ai-assist", { body: { leadId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setErr(e.message || "Couldn't generate suggestions right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3.5 rounded-[22px] border border-jali/20 bg-jali-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-[16px] w-[16px] text-jali" />
          <span className="text-[13px] font-semibold text-ink">AI Assist</span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-jali px-3.5 py-1.5 text-[11.5px] font-semibold text-sand active:scale-95 transition-transform disabled:opacity-60"
        >
          {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
          {loading ? "Thinking…" : result ? "Refresh" : "Get suggestions"}
        </button>
      </div>

      {err && <p className="mt-2.5 text-[12px] text-red-600">{err}</p>}

      {!result && !err && !loading && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink/45">
          Get an AI read on how to approach this client, based on their notes so far.
        </p>
      )}

      {result && !err && (
        <div className="mt-3 space-y-3">
          {result.summary && (
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink/40">Summary</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/80">{result.summary}</p>
            </div>
          )}
          {result.next_move && (
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink/40">Suggested next move</div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/80">{result.next_move}</p>
            </div>
          )}
          {Array.isArray(result.objections) && result.objections.length > 0 && (
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-ink/40">Objections &amp; how to handle them</div>
              <ul className="mt-1.5 space-y-1.5">
                {result.objections.map((o, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink/80">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-jali" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
