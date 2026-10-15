import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, FileText, Share2, Pencil, Lock, Phone, Archive, Download } from "lucide-react";
import { sb } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { formatINR, formatDate } from "../lib/utils";
import { BrandedLoader } from "../components/ui/BrandedLoader";
import { Sheet, SheetHeader } from "../components/ui/Sheet";
import SitePlanViewer from "../components/resale/SitePlanViewer";
import RequestSheet from "../components/resale/RequestSheet";
import {
  BUCKET_PLANS, BUCKET_OWNER_DOCS, RESALE_STATUS, formatGaj, isImagePath, shareText, shareOrCopy, signedUrl, friendlyError,
} from "../lib/resale";

function Tile({ label, value }) {
  return (
    <div className="rounded-2xl border border-ink/[0.06] bg-surface p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-ink">{value}</div>
    </div>
  );
}

// One listing, in the order an associate needs it: what, where, how much, how big, then the plan.
export default function ResalePlotDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const showToast = useToast();
  const { isAdmin } = useAuth();
  const [plot, setPlot] = useState(undefined);
  const [thumb, setThumb] = useState(null);
  const [owner, setOwner] = useState(null);
  const [docs, setDocs] = useState([]);
  const [viewer, setViewer] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  async function load() {
    const { data, error } = await sb.from("resale_plots").select("*").eq("id", id).maybeSingle();
    if (error) showToast(error.message);
    setPlot(data || null);
    setThumb(null);
    if (data?.site_plan_path && isImagePath(data.site_plan_path)) {
      signedUrl(BUCKET_PLANS, data.site_plan_path, 3600).then(setThumb).catch(() => {});
    }
    if (isAdmin && data) {
      // Admin only. The database refuses these tables to everyone else.
      const [{ data: o }, { data: d }] = await Promise.all([
        sb.from("resale_plot_owners").select("*").eq("plot_id", id).maybeSingle(),
        sb.from("resale_owner_documents").select("*").eq("plot_id", id).order("uploaded_at"),
      ]);
      setOwner(o || null);
      setDocs(d || []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAdmin]);

  async function share() {
    const r = await shareOrCopy(shareText(plot), `${plot.scheme} — Plot ${plot.plot_number}`);
    if (r === "copied") showToast("✓ Details copied. Paste them in WhatsApp.");
    if (r === "failed") showToast("Couldn't share. Please try again.");
  }

  async function setStatus(status) {
    const { error } = await sb.from("resale_plots").update({ status }).eq("id", plot.id);
    if (error) return showToast(friendlyError(error));
    setPlot({ ...plot, status });
    showToast("✓ Status updated.");
  }

  async function toggleArchive() {
    const { error } = await sb.from("resale_plots").update({ archived: !plot.archived }).eq("id", plot.id);
    if (error) return showToast(friendlyError(error));
    setArchiveOpen(false);
    showToast(plot.archived ? "✓ Listing restored." : "✓ Listing archived.");
    if (plot.archived) load();
    else nav("/resale");
  }

  async function openDoc(d) {
    try {
      window.open(await signedUrl(BUCKET_OWNER_DOCS, d.file_path, 300), "_blank");
    } catch {
      showToast("Couldn't open that document.");
    }
  }

  if (plot === undefined) {
    return <div className="mx-auto flex max-w-2xl justify-center px-5 py-24"><BrandedLoader size={24} /></div>;
  }
  if (plot === null) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <div className="text-[16px] font-semibold text-ink">This listing isn't available</div>
        <p className="mt-1.5 text-[13px] text-ink/45">It may have been archived or removed.</p>
        <Link to="/resale" className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-stone-600 px-6 text-[13.5px] font-semibold text-white">Back to Plots for Resale</Link>
      </div>
    );
  }

  const st = RESALE_STATUS[plot.status] || RESALE_STATUS.available;
  const hasPlan = !!plot.site_plan_path;
  const canDownload = hasPlan && (isAdmin || plot.plan_download_allowed);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/resale" className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-semibold text-stone-700">
          <ArrowLeft className="h-4 w-4" /> Plots for Resale
        </Link>
        {isAdmin && (
          <Link to={`/resale/${plot.id}/edit`} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 text-[12.5px] font-semibold text-ink/70">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
        )}
      </div>

      {/* 1 scheme + plot number, 2 location */}
      <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">{plot.scheme}</h1>
      <div className="mt-1 text-[16px] font-bold text-stone-600">Plot No. {plot.plot_number}{plot.archived ? " · Archived" : ""}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[14px] text-ink/55"><MapPin className="h-4 w-4" /> {plot.location}</div>

      {/* 3 total demand */}
      <div className="mt-5 rounded-[22px] border border-stone-100 bg-stone-50 p-5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink/45">Total demand</div>
        <div className="font-display text-[38px] font-semibold leading-tight text-stone-700">{formatINR(plot.total_demand)}</div>
        <div className="text-[13px] text-ink/50">{formatGaj(plot.area_gaj)} × {formatINR(plot.rate_per_gaj)} per Gaj</div>
      </div>

      {/* 4 area, 5 rate, 6 registration */}
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <Tile label="Area" value={formatGaj(plot.area_gaj)} />
        <Tile label="Rate per Gaj" value={formatINR(plot.rate_per_gaj)} />
        <Tile label="Registration" value={formatINR(plot.registration_amount)} />
      </div>

      {/* 7 facing + dimensions */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Tile label="Facing" value={plot.facing || "—"} />
        <Tile label="Plot dimensions" value={plot.dimensions || "—"} />
      </div>

      {/* 8 site plan */}
      <div className="mt-3 rounded-[22px] border border-ink/[0.06] bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold text-ink">Site plan</div>
          {hasPlan && <span className="text-[12px] text-ink/40">Zoom{canDownload ? " · Download" : ""}</span>}
        </div>
        <button
          onClick={() => hasPlan && setViewer(true)}
          disabled={!hasPlan}
          aria-label="View site plan"
          className="mt-3 flex h-[190px] w-full items-center justify-center overflow-hidden rounded-2xl bg-stone-50 text-stone-400"
        >
          {thumb ? <img src={thumb} alt="Site plan preview" className="h-full w-full object-contain" /> : hasPlan ? <FileText className="h-10 w-10" /> : <span className="text-[13px] text-ink/40">No site plan uploaded yet</span>}
        </button>
        {hasPlan && !canDownload && <p className="mt-2 text-[11.5px] text-ink/40"><Download className="mr-1 inline h-3 w-3" />Download is switched off for this plan.</p>}
      </div>

      {/* 9 notes */}
      {plot.notes && (
        <div className="mt-3 rounded-[22px] border border-ink/[0.06] bg-surface p-4">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Property notes</div>
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink/75">{plot.notes}</p>
        </div>
      )}

      {/* 10 availability */}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-ink/[0.06] bg-surface px-4 py-3.5">
        <span className="text-[13.5px] text-ink/55">Availability</span>
        <span className={`rounded-full px-3.5 py-1 text-[12.5px] font-bold ${st.cls}`}>{st.label}</span>
      </div>
      <div className="mt-1 text-right text-[11px] text-ink/35">Updated {formatDate(plot.updated_at)}</div>

      {!isAdmin && (
        <button onClick={() => setReqOpen(true)} className="mt-3 min-h-[44px] text-[13.5px] font-semibold text-stone-600 underline-offset-2 hover:underline">
          Something wrong? Request a correction or availability update
        </button>
      )}

      {/* Admin controls */}
      {isAdmin && (
        <>
          <div className="mt-5 rounded-[22px] border border-ink/[0.06] bg-surface p-4">
            <div className="text-[13px] font-semibold text-ink">Change availability</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(RESALE_STATUS).map(([k, v]) => (
                <button key={k} onClick={() => setStatus(k)} className={`min-h-[44px] rounded-full border px-4 text-[13px] font-semibold ${plot.status === k ? "border-stone-600 bg-stone-600 text-white" : "border-ink/10 text-ink/60"}`}>
                  {v.label}
                </button>
              ))}
            </div>
            <button onClick={() => setArchiveOpen(true)} className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-red-600">
              <Archive className="h-4 w-4" /> {plot.archived ? "Restore this listing" : "Archive this listing"}
            </button>
          </div>

          <div className="mt-4 rounded-[22px] border border-stone-100 bg-stone-50/60 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fc8eac] text-[#5a1530]"><Lock className="h-4 w-4" /></span>
              <div className="flex-1 text-[14.5px] font-semibold text-ink">Owner details</div>
              <span className="rounded-full bg-stone-600 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wider text-white">ADMIN ONLY</span>
            </div>
            {!owner && docs.length === 0 ? (
              <p className="mt-3 text-[13px] text-ink/45">No owner details saved yet. Add them from Edit.</p>
            ) : (
              <div className="mt-3 space-y-3 text-[14px]">
                <div><div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Owner</div><div className="font-semibold text-ink">{owner?.owner_name || "—"}</div></div>
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Mobile</div>
                  {owner?.owner_mobile ? <a href={`tel:${owner.owner_mobile}`} className="inline-flex items-center gap-1.5 font-semibold text-stone-700"><Phone className="h-3.5 w-3.5" />{owner.owner_mobile}</a> : "—"}
                </div>
                {owner?.negotiation_notes && (
                  <div><div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Private negotiation notes</div><p className="whitespace-pre-line text-ink/75">{owner.negotiation_notes}</p></div>
                )}
                {docs.length > 0 && (
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink/40">Documents</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {docs.map((d) => (
                        <button key={d.id} onClick={() => openDoc(d)} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-stone-100 bg-white px-3.5 text-[12.5px] font-semibold text-stone-700">
                          <FileText className="h-3.5 w-3.5" /> {d.file_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* The two main actions */}
      <div className="sticky bottom-4 z-10 mt-6 grid gap-2.5 rounded-[22px] border border-ink/[0.06] bg-surface/95 p-3 shadow-lift backdrop-blur sm:grid-cols-2">
        <button
          onClick={() => setViewer(true)}
          disabled={!hasPlan}
          className="min-h-[50px] rounded-full bg-stone-600 text-[14.5px] font-semibold text-white disabled:opacity-40"
        >
          {hasPlan ? "View Site Plan" : "No Site Plan Yet"}
        </button>
        <button onClick={share} className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-stone-100 bg-white text-[14.5px] font-semibold text-stone-700">
          <Share2 className="h-4 w-4" /> Share Property Details
        </button>
      </div>

      <SitePlanViewer open={viewer} plot={plot} canDownload={canDownload} onClose={() => setViewer(false)} />
      <RequestSheet open={reqOpen} plot={plot} onClose={() => setReqOpen(false)} />

      <Sheet open={archiveOpen} onClose={() => setArchiveOpen(false)}>
        <SheetHeader title={plot.archived ? "Restore this listing?" : "Archive this listing?"} sub={plot.archived ? "It will show in the inventory again." : "It disappears from the team's inventory. You can restore it later."} />
        <button onClick={toggleArchive} className="min-h-[50px] w-full rounded-full bg-stone-600 text-[14.5px] font-semibold text-white">
          {plot.archived ? "Restore listing" : "Archive listing"}
        </button>
        <button onClick={() => setArchiveOpen(false)} className="mt-3 min-h-[50px] w-full rounded-full border border-ink/10 text-[14px] font-medium text-ink/60">Cancel</button>
      </Sheet>
    </div>
  );
}
