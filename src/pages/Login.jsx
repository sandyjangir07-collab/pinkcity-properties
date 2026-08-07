import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import JaliPattern from "../components/JaliPattern";

const PUBLIC_SITE_URL = "https://pinkcityproperties.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [googleUrl, setGoogleUrl] = useState(null);
  const [waiting, setWaiting] = useState(false);

  // Pre-fetch the Google OAuth URL (without auto-redirecting) so it's ready
  // the instant the button is tapped — window.open() only avoids popup
  // blockers when called synchronously inside the click handler, so the
  // async fetch can't happen at click time.
  //
  // Both iOS and Android showed the same "PWA turns into a plain browser
  // tab" symptom with every top-level-navigation approach tried before this
  // (full redirect, and a plain anchor-tag redirect) — that's consistent
  // across platforms because standalone mode is tied to how the app was
  // *launched*, not to which URL is currently loaded; navigating away and
  // being redirected back doesn't restore it on any platform. The only
  // approach that keeps the main window from ever navigating away at all is
  // a genuine popup — the main window's origin/state never changes.
  useEffect(() => {
    sb.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, skipBrowserRedirect: true },
      })
      .then(({ data, error }) => {
        if (!error && data?.url) setGoogleUrl(data.url);
      });
  }, []);

  function handleGoogleClick(e) {
    e.preventDefault();
    if (!googleUrl) return;
    setErr("");
    setWaiting(true);
    const popup = window.open(googleUrl, "google-oauth", "width=480,height=650,menubar=no,toolbar=no");
    if (!popup) {
      // Popup blocked — only fallback left is a full redirect, which we know
      // breaks standalone mode, but it's better than a dead button.
      window.location.href = googleUrl;
      return;
    }
    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        setWaiting(false);
        // The popup's own Supabase client wrote the session to localStorage
        // (same origin) and self-closes on success — re-check here as a
        // backup in case this window's automatic cross-tab sync didn't
        // catch it. No reload: this just refreshes in-memory state.
        sb.auth.getSession().catch(() => {});
      }
    }, 400);
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }


  return (
    <div className="relative min-h-screen flex items-center justify-center p-5 overflow-hidden bg-sand">
      <div className="absolute inset-0 opacity-[0.05] text-stone-600">
        <JaliPattern id="login-jali" />
      </div>
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-stone-500/[0.10] blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-[0_30px_60px_-30px_rgba(43,21,18,0.25)]"
      >
        <div className="text-center mb-7">
          <a href={PUBLIC_SITE_URL} className="inline-flex w-14 h-14 rounded-full bg-stone-600 items-center justify-center mx-auto mb-4 p-2.5 shadow-[0_8px_20px_-6px_rgba(196,56,104,0.5)] active:scale-90 transition-transform" title="Go to website">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          </a>
          <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-1.5">PinkCity Properties</div>
          <div className="font-display text-2xl text-ink">Team Sign In</div>
        </div>

        <a
          href={googleUrl || "#"}
          onClick={handleGoogleClick}
          aria-disabled={!googleUrl || waiting}
          className={`w-full flex items-center justify-center gap-2.5 text-sm font-medium text-ink/75 border border-ink/10 rounded-full py-3 mb-5 transition-colors ${googleUrl && !waiting ? "hover:border-ink/25" : "opacity-50"}`}
        >
          <svg width="17" height="17" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
          </svg>
          {waiting ? "Waiting for Google…" : googleUrl ? "Continue with Google" : "Loading…"}
        </a>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex-1 h-px bg-ink/10" />
          <span className="text-[11px] text-ink/35">OR</span>
          <div className="flex-1 h-px bg-ink/10" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Email</span>
            <input className="field-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">Password</span>
            <input className="field-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button disabled={busy} type="submit" className="w-full">{busy ? "Signing in…" : "Sign In"}</Button>
        </form>

        <a
          href={PUBLIC_SITE_URL}
          className="block text-center text-xs text-ink/40 hover:text-ink/60 transition-colors mt-6"
        >
          ← Back to website
        </a>
      </motion.div>
    </div>
  );
}
