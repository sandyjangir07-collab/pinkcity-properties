import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — set these in Vercel's Project Settings > Environment Variables."
  );
}

// Public site only ever reads public data (active listings, published blog
// posts) with the anon key — same key used client-side, safe either way
// since RLS is what actually protects everything.
// A placeholder URL keeps createClient() from throwing at build time if the
// real env vars are ever missing — the site should degrade to empty data,
// not fail the entire build over one unset variable.
export const sb = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
  auth: { persistSession: false },
});
