"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { sb } from "../lib/supabase";
import { BUDGET_OPTIONS } from "../lib/searchConstants";

const PROPERTY_TYPES = ["Colony", "Plot", "Flat", "Villa"];
const EASE = [0.22, 1, 0.36, 1];

const TRUST_POINTS = ["No spam calls — ever.", "Bank-grade data privacy.", "Every listing legally verified."];

export default function ConsultationForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", budget: "", propertyType: "", location: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setErr("Please fill in your name and phone number.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { error } = await sb.from("leads").insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        budget: form.budget || null,
        property_type: form.propertyType || null,
        preferred_location: form.location.trim() || null,
        source: "consultation",
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: "", phone: "", email: "", budget: "", propertyType: "", location: "" });
    } catch (e2) {
      setErr("Something went wrong saving your request — please try again or WhatsApp us directly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-4">Free Consultation</div>
            <h2 className="font-display text-4xl sm:text-5xl text-ink leading-[1.05] mb-5">Get expert property guidance.</h2>
            <p className="text-lg text-ink/55 max-w-md leading-relaxed mb-8">
              A senior advisor will call you within 24 hours with a shortlist of verified properties that match your budget and goals.
            </p>

            <div className="space-y-3.5 mb-8">
              {TRUST_POINTS.map((t) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-600 flex items-center justify-center shrink-0">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 4 4L19 7" /></svg>
                  </span>
                  <span className="text-sm font-medium text-ink/75">{t}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3.5 bg-white/70 border border-ink/[0.06] rounded-3xl p-4 max-w-sm">
              <span className="w-11 h-11 rounded-full bg-stone-600 flex items-center justify-center p-2 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-full h-full object-contain" />
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">PinkCity Advisor</div>
                <div className="text-xs text-ink/45">Typically responds in &lt; 4 hours</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="rounded-[32px] bg-white shadow-[0_20px_60px_-24px_rgba(43,21,18,0.18)] p-8"
          >
            {!sent ? (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Your Name"><input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Rahul Verma" /></Field>
                  <Field label="Phone"><input className="field-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98XXX XXXXX" /></Field>
                </div>
                <Field label="Email"><input className="field-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" /></Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Budget">
                    <select className="field-input" value={form.budget} onChange={(e) => set("budget", e.target.value)}>
                      <option value="">Select…</option>
                      {BUDGET_OPTIONS.map((b) => (<option key={b} value={b}>{b}</option>))}
                    </select>
                  </Field>
                  <Field label="Property Type">
                    <select className="field-input" value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
                      <option value="">Select…</option>
                      {PROPERTY_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </Field>
                </div>
                <Field label="Preferred Location"><input className="field-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Jagatpura, Mansarovar…" /></Field>

                {err && <p className="text-sm text-red-600">{err}</p>}

                <button
                  disabled={busy}
                  type="submit"
                  className="w-full rounded-full bg-stone-600 hover:bg-stone-700 text-sand text-sm font-semibold py-4 transition-colors disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Request free consultation →"}
                </button>
              </form>
            ) : (
              <div className="py-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <div className="font-display text-2xl text-ink mb-2">Request received!</div>
                <p className="text-sm text-ink/50 leading-relaxed">
                  A senior advisor will call you within 24 hours. In a hurry?{" "}
                  <a href="https://wa.me/919358830405" target="_blank" rel="noreferrer" className="text-stone-600 font-medium">
                    Message us on WhatsApp
                  </a>.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold tracking-wide uppercase text-ink/40 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
