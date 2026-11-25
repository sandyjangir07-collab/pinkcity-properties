"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { sb } from "../../lib/supabase";
import {
  BUCKET_PLANS, COMPANY_PHONE, COMPANY_PHONE_SHOWN, STATUS, formatGaj, formatINR, isImagePath,
} from "../../lib/resale";

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/70 border border-ink/[0.06] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/40">{label}</div>
      <div className="mt-1 text-base font-semibold text-ink">{value}</div>
    </div>
  );
}

function EnquiryForm({ plot, refCode, agentName }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState(""); // bots fill this in; people never see it
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (trap) return setDone(true);
    if (name.trim().length < 2) return setErr("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Please enter a valid 10-digit mobile number.");
    setBusy(true);
    const { error } = await sb.rpc("public_resale_enquire", {
      p_code: plot.public_code,
      p_ref: refCode || null,
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_message: message.trim() || null,
    });
    setBusy(false);
    if (error) return setErr("Something went wrong — please try again, or call or WhatsApp us directly.");
    setDone(true);
  }

  if (done) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="m5 12 4 4L19 7" /></svg>
        </span>
        <h3 className="font-display text-2xl text-ink">Thank you!</h3>
        <p className="mt-1.5 text-sm text-ink/55">
          {agentName ? `${agentName} from PinkCity` : "Our team"} will call you shortly about {plot.scheme}, Plot {plot.plot_number}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className="field-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <input className="field-input" type="tel" inputMode="tel" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      <textarea className="field-input min-h-[80px]" placeholder="Anything you'd like to ask? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
      {err && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{err}</div>}
      <button type="submit" disabled={busy} className="w-full rounded-full bg-stone-600 text-sand text-sm font-medium py-3.5 hover:bg-stone-700 transition-colors disabled:opacity-50">
        {busy ? "Sending…" : "Request a call back"}
      </button>
      <p className="text-center text-[11px] text-ink/40">We&apos;ll only use your number to contact you about this plot.</p>
    </form>
  );
}

export default function PlotView({ plot }) {
  const params = useSearchParams();
  const refCode = params.get("a") || "";
  const [agent, setAgent] = useState(null);
  const [planUrl, setPlanUrl] = useState(null);
  const [zoom, setZoom] = useState(false);

  // A link shared by an associate carries ?a=<code>, which shows their name and number.
  useEffect(() => {
    if (!refCode) return;
    let cancelled = false;
    sb.rpc("public_resale_get", { p_code: plot.public_code, p_ref: refCode }).then(({ data }) => {
      if (!cancelled && data?.agent) setAgent(data.agent);
    });
    return () => { cancelled = true; };
  }, [refCode, plot.public_code]);

  // Signed in the browser so the link never goes stale on a cached page.
  useEffect(() => {
    if (!plot.site_plan_path) return;
    let cancelled = false;
    sb.storage.from(BUCKET_PLANS).createSignedUrl(plot.site_plan_path, 3600).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setPlanUrl(data.signedUrl);
    });
    return () => { cancelled = true; };
  }, [plot.site_plan_path]);

  const st = STATUS[plot.status] || STATUS.available;
  const gone = plot.status === "sold" || plot.status === "unavailable";
  const contactName = agent?.name || "PinkCity Properties";
  const contactPhone = agent?.phone || COMPANY_PHONE;
  const contactShown = agent?.phone || COMPANY_PHONE_SHOWN;
  const digits = String(contactPhone).replace(/\D/g, "");
  const wa = `https://wa.me/${digits}?text=${encodeURIComponent(`Hi, I'm interested in ${plot.scheme}, Plot ${plot.plot_number} (${plot.public_code}). Please share more details.`)}`;
  const isImg = isImagePath(plot.site_plan_path);
  const canOpen = !!plot.plan_download_allowed;

  return (
    <article className="pt-32 pb-28">
      <div className="mx-auto max-w-6xl px-6">
        <Link href="/resale" className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 mb-6">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          All resale plots
        </Link>

        {gone && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            This plot is no longer available. <Link href="/resale" className="underline">See similar plots</Link>
          </div>
        )}
        {plot.status === "reserved" && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This plot is currently reserved. Ask us if it becomes available again, or about similar plots.
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-3">Resale plot · {plot.public_code}</div>
            <h1 className="font-display text-4xl sm:text-5xl text-ink leading-[1.05]">{plot.scheme}</h1>
            <div className="mt-2 text-lg font-semibold text-stone-600">Plot No. {plot.plot_number}</div>
            <div className="mt-1.5 flex items-center gap-1.5 text-ink/55">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              {plot.location}
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8">
          <div>
            <div className="rounded-3xl bg-stone-50 border border-stone-100 p-6">
              <div className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/45">Total demand</div>
              <div className="font-sans font-bold text-4xl sm:text-5xl text-stone-700 leading-tight mt-1">{formatINR(plot.total_demand)}</div>
              <div className="mt-1 text-sm text-ink/50">{formatGaj(plot.area_gaj)} × {formatINR(plot.rate_per_gaj)} per Gaj</div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Tile label="Area" value={formatGaj(plot.area_gaj)} />
              <Tile label="Rate per Gaj" value={formatINR(plot.rate_per_gaj)} />
              <Tile label="Registration" value={formatINR(plot.registration_amount)} />
              <Tile label="Facing" value={plot.facing || "—"} />
              <Tile label="Dimensions" value={plot.dimensions || "—"} />
            </div>

            {plot.notes && (
              <div className="mt-4 rounded-2xl bg-white/70 border border-ink/[0.06] p-5">
                <div className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/40">About this plot</div>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{plot.notes}</p>
              </div>
            )}

            <div className="mt-4 rounded-3xl bg-white/70 border border-ink/[0.06] p-5">
              <div className="font-display text-xl text-ink">Site plan</div>
              {plot.site_plan_path ? (
                isImg ? (
                  <button onClick={() => planUrl && setZoom(true)} className="mt-4 flex h-[260px] w-full items-center justify-center overflow-hidden rounded-2xl bg-stone-50" aria-label="Enlarge site plan">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {planUrl ? <img src={planUrl} alt={`Site plan for ${plot.scheme} Plot ${plot.plot_number}`} className="h-full w-full object-contain" /> : <span className="text-sm text-ink/35">Loading site plan…</span>}
                  </button>
                ) : canOpen && planUrl ? (
                  <a href={planUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-stone-600/30 px-6 py-3 text-sm font-medium text-stone-600">Open site plan (PDF)</a>
                ) : (
                  <p className="mt-3 text-sm text-ink/50">Ask us and we&apos;ll send you the site plan for this plot.</p>
                )
              ) : (
                <p className="mt-3 text-sm text-ink/45">Site plan coming soon.</p>
              )}
              {isImg && planUrl && canOpen && (
                <a href={planUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-stone-600">Open full size ↗</a>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-6 shadow-[0_1px_2px_rgba(43,21,18,0.04)]">
              <div className="text-[10px] font-semibold uppercase tracking-widest2 text-ink/40">{agent ? "Your contact" : "Talk to us"}</div>
              <div className="mt-2 font-display text-2xl text-ink leading-tight">{contactName}</div>
              {agent && <div className="text-xs text-ink/45 mt-0.5">PinkCity Properties &amp; Consultants</div>}
              <a href={`tel:${contactPhone}`} className="mt-1 block text-base font-semibold text-stone-600">{contactShown}</a>
              <div className="mt-5 grid gap-2.5">
                <a href={`tel:${contactPhone}`} className="flex items-center justify-center rounded-full bg-stone-600 text-sand text-sm font-medium py-3.5 hover:bg-stone-700 transition-colors">Call now</a>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-full bg-[#1FA855] text-white text-sm font-medium py-3.5">WhatsApp</a>
              </div>
              <div className="my-6 border-t border-ink/[0.06]" />
              <div className="font-display text-xl text-ink mb-3">Prefer a call back?</div>
              <EnquiryForm plot={plot} refCode={refCode} agentName={agent?.name} />
            </div>
          </aside>
        </div>
      </div>

      {zoom && planUrl && (
        <div className="fixed inset-0 z-[60] bg-ink/85 flex items-center justify-center p-4" onClick={() => setZoom(false)} role="dialog" aria-label="Site plan">
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/90 text-ink flex items-center justify-center" aria-label="Close" onClick={() => setZoom(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={planUrl} alt="Site plan, enlarged" className="max-h-full max-w-full object-contain rounded-xl bg-white" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </article>
  );
}
