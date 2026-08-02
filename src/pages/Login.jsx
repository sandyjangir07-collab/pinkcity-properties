import { useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { Button } from "../components/ui/button";
import JaliPattern from "../components/JaliPattern";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }

  async function handleGoogle() {
    setErr("");
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
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
          <span className="w-14 h-14 rounded-full bg-stone-600 flex items-center justify-center mx-auto mb-4 p-2.5 shadow-[0_8px_20px_-6px_rgba(196,56,104,0.5)]">
            <img src="/logo.png" alt="" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
          </span>
          <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-1.5">PinkCity Properties</div>
          <div className="font-display text-2xl text-ink">Team Sign In</div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full text-sm font-medium text-ink/75 border border-ink/10 rounded-full py-3 mb-5 hover:border-ink/25 transition-colors"
        >
          Continue with Google
        </button>

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
      </motion.div>
    </div>
  );
}
