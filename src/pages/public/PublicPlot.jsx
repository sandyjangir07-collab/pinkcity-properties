import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Phone, MessageCircle, MapPin, FileText, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { sb } from "../../lib/supabase";
import { formatINR } from "../../lib/utils";
import { BrandedLoader } from "../../components/ui/BrandedLoader";
import { Sheet, SheetHeader } from "../../components/ui/Sheet";
import SitePlanViewer from "../../components/resale/SitePlanViewer";
import {
  BUCKET_PLANS, RESALE_STATUS, COMPANY_NAME, COMPANY_PHONE, COMPANY_PHONE_SHOWN, formatGaj, isImagePath, signedUrl, waLink,
} from "../../lib/resale";
import PublicShell, { usePageTitle } from "./PublicShell";

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border border-ink/[0.06] bg-white p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-ink">{value}</div>
    </div>
  );
}

function EnquirySheet({ open, onClose, plot, refCode, agentName }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState(""); // bots fill this; people never see it
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setErr(""); setDone(false); }
  }, [open]);

  async function submit() {
    setErr("");
    if (trap) return setDone(true);
    if (name.trim().length < 2) return setErr("Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Please enter a valid 10-digit mobile number.");
    setBusy(true);
    const { error } = await sb.rpc("public_resale_enquire", {
      p_code: plot.public_code, p_ref: refCode || null, p_name: name.trim(), p_phone: phone.trim(), p_message: message.trim() || null,
    });
    setBusy(false);
    if (error) return setErr(error.message || "Something went wrong. Please try again.");
    setDone(true);
  }

  return (
    <Sheet open={open} onClose={onClose} maxWidth="max-w-md">
      {done ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h3 className="mt-3 font-display text-[24px] text-ink">Thank you!</h3>
          <p className="mt-1.5 text-[14px] text-ink/55">{agentName ? `${agentName} from PinkCity` : "Our team"} will call you shortly about {plot.scheme}, Plot {plot.plot_number}.</p>
          <button onClick={onClose} className="mt-6 min-h-[48px] w-full rounded-full bg-crimson text-[14px] font-semibold text-white">Done</button>
        </div>
      ) : (
        <>
          <SheetHeader title="Enquire about this plot" sub={`${plot.scheme} — Plot ${plot.plot_number}`} />
          <div className="space-y-3">
            <input className="field-input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <input className="field-input" type="tel" inputMode="tel" placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            <textarea className="field-input min-h-[84px]" placeholder="Anything you'd like to ask? (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" value={trap} onChange={(e) => setTrap(e.target.value)} name="website" />
          </div>
          {err && <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{err}</div>}
          <button onClick={submit} disabled={busy} className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-crimson text-[14.5px] font-semibold text-white disabled:opacity-50">
            <Send className="h-4 w-4" /> {busy ? "Sending…" : "Request a call back"}
          </button>
          <p className="mt-3 text-center text-[11px] text-ink/40">We'll only use your number to contact you about this plot.</p>
        </>
      )}
    </Sheet>
  );
}

export default function PublicPlot() {
  const { code } = useParams();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const refCode = params.get("a") || "";
  const [data, setData] = useState(undefined);
  const [thumb, setThumb] = useState(null);
  const [viewer, setViewer] = useState(false);
  const [enquire, setEnquire] = useState(false);

  const plot = data?.plot;
  usePageTitle(plot ? `${plot.scheme} Plot ${plot.plot_number}, ${plot.location} — PinkCity Properties` : "Resale plot — PinkCity Properties", plot ? `${formatGaj(plot.area_gaj)} plot in ${plot.scheme}, ${plot.location}. Total demand ${formatINR(plot.total_demand)}.` : undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: d, error } = await sb.rpc("public_resale_get", { p_code: code, p_ref: refCode || null });
      if (cancelled) return;
      setData(error ? null : d || null);
      if (d?.plot?.site_plan_path && isImagePath(d.plot.site_plan_path)) {
        signedUrl(BUCKET_PLANS, d.plot.site_plan_path, 3600).then((u) => !cancelled && setThumb(u)).catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [code, refCode]);

  if (data === undefined) return <PublicShell search={search}><div className="flex justify-center py-24"><BrandedLoader size={24} /></div></PublicShell>;
  if (!plot) {
    return (
      <PublicShell search={search}>
        <div className="mx-auto mt-10 max-w-md rounded-2xl border border-ink/[0.06] bg-white p-8 text-center">
          <div className="font-display text-[22px] font-semibold">This plot isn't listed any more</div>
          <p className="mt-2 text-[13.5px] text-ink/50">It may have been sold or taken down. See what else is available.</p>
          <Link to={`/p${search}`} className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-crimson px-6 text-[14px] font-semibold text-white">See available plots</Link>
        </div>
      </PublicShell>
    );
  }

  const agent = data.agent;
  const contactName = agent?.name || COMPANY_NAME;
  const contactPhone = agent?.phone || COMPANY_PHONE;
  const contactShown = agent?.phone || COMPANY_PHONE_SHOWN;
  const st = RESALE_STATUS[plot.status] || RESALE_STATUS.available;
  const gone = plot.status === "sold" || plot.status === "unavailable";
  const hasPlan = !!plot.site_plan_path;
  const wa = waLink(contactPhone, `Hi, I'm interested in ${plot.scheme}, Plot ${plot.plot_number} (${plot.public_code}). Please share more details.`);

  return (
    <PublicShell search={search}>
      <Link to={`/p${search}`} className="inline-flex min-h-[40px] items-center gap-1.5 text-[13.5px] font-semibold text-crimson"><ArrowLeft className="h-4 w-4" /> All plots</Link>

      {gone && <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13.5px] font-semibold text-amber-900">This plot is no longer available. <Link to={`/p${search}`} className="underline">See similar plots</Link></div>}
      {plot.status === "reserved" && <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">This plot is currently reserved. Ask us if it comes back, or about similar plots.</div>}

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">{plot.scheme}</h1>
          <div className="mt-1 text-[16px] font-bold text-crimson">Plot No. {plot.plot_number}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink/55"><MapPin className="h-4 w-4" /> {plot.location}</div>
        </div>
        <span className={`shrink-0 rounded-full px-3.5 py-1 text-[12.5px] font-bold ${st.cls}`}>{st.label}</span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="rounded-[22px] border border-crimson/15 bg-white p-5 shadow-soft">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/45">Total demand</div>
            <div className="font-display text-[40px] font-semibold leading-tight text-crimson-deep">{formatINR(plot.total_demand)}</div>
            <div className="text-[13px] text-ink/50">{formatGaj(plot.area_gaj)} × {formatINR(plot.rate_per_gaj)} per Gaj</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <Tile label="Area" value={formatGaj(plot.area_gaj)} />
            <Tile label="Rate per Gaj" value={formatINR(plot.rate_per_gaj)} />
            <Tile label="Registration" value={formatINR(plot.registration_amount)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Tile label="Facing" value={plot.facing || "—"} />
            <Tile label="Plot dimensions" value={plot.dimensions || "—"} />
          </div>
          {plot.notes && (
            <div className="mt-3 rounded-2xl border border-ink/[0.06] bg-white p-4">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">About this plot</div>
              <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink/75">{plot.notes}</p>
            </div>
          )}
          <div className="mt-3 rounded-[22px] border border-ink/[0.06] bg-white p-4 shadow-soft">
            <div className="text-[14px] font-semibold">Site plan</div>
            <button onClick={() => hasPlan && setViewer(true)} disabled={!hasPlan} aria-label="View site plan" className="mt-3 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-2xl bg-cream text-ink/30">
              {thumb ? <img src={thumb} alt="Site plan preview" className="h-full w-full object-contain" /> : hasPlan ? <FileText className="h-10 w-10" /> : <span className="text-[13px]">Site plan coming soon</span>}
            </button>
            {hasPlan && <button onClick={() => setViewer(true)} className="mt-3 min-h-[46px] w-full rounded-full border border-crimson/30 text-[14px] font-semibold text-crimson">View site plan</button>}
          </div>
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-[22px] border border-ink/[0.06] bg-white p-5 shadow-soft">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/40">{agent ? "Your contact" : "Talk to us"}</div>
            <div className="mt-1.5 font-display text-[21px] font-semibold leading-tight">{contactName}</div>
            {agent && <div className="text-[12.5px] text-ink/45">PinkCity Properties &amp; Consultants</div>}
            <a href={`tel:${contactPhone}`} className="mt-1 block text-[15px] font-semibold text-crimson">{contactShown}</a>
            <div className="mt-4 grid gap-2.5">
              <a href={`tel:${contactPhone}`} className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-crimson text-[14.5px] font-semibold text-white active:scale-[0.98]"><Phone className="h-4 w-4" /> Call now</a>
              <a href={wa} target="_blank" rel="noreferrer" className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[#1FA855] text-[14.5px] font-semibold text-white active:scale-[0.98]"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <button onClick={() => setEnquire(true)} className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-crimson/30 bg-white text-[14.5px] font-semibold text-crimson active:scale-[0.98]"><Send className="h-4 w-4" /> Request a call back</button>
            </div>
          </div>
        </aside>
      </div>

      <SitePlanViewer open={viewer} plot={plot} canDownload={!!plot.plan_download_allowed} onClose={() => setViewer(false)} />
      <EnquirySheet open={enquire} onClose={() => setEnquire(false)} plot={plot} refCode={refCode} agentName={agent?.name} />
    </PublicShell>
  );
}
