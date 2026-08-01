import { useState } from "react";
import { sb } from "../lib/supabase";

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
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src="/logo.png"
            alt=""
            style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 14px" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <div className="page-eyebrow">PinkCity Properties</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>Team Sign In</div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: "100%", marginBottom: 16 }}
          onClick={handleGoogle}
        >
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "6px 0 16px" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <form onSubmit={handleEmailSignIn}>
          <div className="field">
            <label className="fl">Email</label>
            <input className="fi" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="fl">Password</label>
            <input
              className="fi"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <div className="form-err show" style={{ marginBottom: 10 }}>{err}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
