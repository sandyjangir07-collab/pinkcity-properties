// Supabase Edge Function: lead-ai-assist
//
// Reads one lead's real record + conversation notes (RLS-scoped to the
// calling user, same as the rest of the app) and asks Claude for:
//   - a short summary of the conversation so far
//   - the single best next move for this specific client
//   - any objections raised in the notes, with a suggestion for each
//
// Deploy: supabase functions deploy lead-ai-assist
// Requires a secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// (get a key from https://console.anthropic.com)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY secret is not set on this project.");

    const { leadId } = await req.json();
    if (!leadId) throw new Error("leadId is required.");

    // Use the caller's own auth token so RLS applies exactly as it does
    // everywhere else in the app (team members only see their own leads).
    const authHeader = req.headers.get("Authorization") || "";
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: lead, error: leadErr } = await sb.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (leadErr || !lead) throw new Error("Lead not found, or you don't have access to it.");

    const { data: notes } = await sb
      .from("lead_notes")
      .select("note, status_change, created_by_name, created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    const timelineText =
      (notes || [])
        .map((n) => {
          const date = new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          const statusBit = n.status_change ? `Status → ${n.status_change}. ` : "";
          return `- [${date}] ${n.created_by_name || "Team"}: ${statusBit}${n.note}`;
        })
        .join("\n") || "No notes logged yet.";

    const leadContext = `Name: ${lead.name}
Status: ${lead.status}
Source: ${lead.source}
Property type: ${lead.property_type || "—"}
Preferred location: ${lead.preferred_location || "—"}
Budget: ${lead.budget || "—"}
Follow-up date: ${lead.follow_up_date || "—"}

Conversation notes (oldest to newest):
${timelineText}`;

    const prompt = `You are a real estate sales assistant for PinkCity Properties in Jaipur, India. Based ONLY on the lead information and conversation notes below, respond with a JSON object with exactly these three keys:
- "next_move": 2-3 sentences on the single best next action to take with this specific client, grounded in what they've actually said or done.
- "objections": an array of short strings, each naming a hesitation or objection this client has actually raised in the notes, paired with a brief suggestion for addressing it. If none are evident, return an empty array — do not invent any.
- "summary": a 2-3 sentence plain-language summary of the conversation so far, written for a teammate picking up this lead cold.

Do not invent facts that aren't present in the notes. If there isn't enough information for a field, say so briefly rather than guessing.

Lead information:
${leadContext}

Respond with ONLY the JSON object — no markdown formatting, no code fences, no extra commentary.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`AI request failed: ${errText.slice(0, 300)}`);
    }

    const aiData = await aiRes.json();
    const textBlock = (aiData.content || []).find((b: { type: string }) => b.type === "text");
    const raw = textBlock ? textBlock.text : "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { next_move: raw, objections: [], summary: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Something went wrong." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
