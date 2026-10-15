import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, Download, ExternalLink } from "lucide-react";
import { BrandedLoader } from "../ui/BrandedLoader";
import { BUCKET_PLANS, signedUrl, isImagePath, fileExt } from "../../lib/resale";

// Full-screen site plan: big preview, zoom, and download when the admin allows it.
export default function SitePlanViewer({ open, plot, canDownload, onClose }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open || !plot?.site_plan_path) return;
    let cancelled = false;
    setUrl(null);
    setErr("");
    setZoom(1);
    signedUrl(BUCKET_PLANS, plot.site_plan_path, 3600)
      .then((u) => !cancelled && setUrl(u))
      .catch(() => !cancelled && setErr("Couldn't load the site plan. Please try again."));
    return () => {
      cancelled = true;
    };
  }, [open, plot?.site_plan_path]);

  if (!open || !plot) return null;
  const isImg = isImagePath(plot.site_plan_path);

  async function download() {
    try {
      const name = `${plot.scheme}-plot-${plot.plot_number}-site-plan.${fileExt(plot.site_plan_path)}`.replace(/\s+/g, "-");
      const u = await signedUrl(BUCKET_PLANS, plot.site_plan_path, 300, name);
      window.location.href = u;
    } catch {
      setErr("Couldn't start the download. Please try again.");
    }
  }

  const btn = "flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white active:scale-95";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink/95" role="dialog" aria-label="Site plan">
      <div className="flex items-center gap-2 px-3 py-3 text-white">
        <button onClick={onClose} aria-label="Close site plan" className={btn}><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1 px-1">
          <div className="truncate text-[14px] font-semibold">{plot.scheme} · Plot {plot.plot_number}</div>
          <div className="text-[11.5px] text-white/60">Site plan{isImg ? " · double-tap to zoom" : ""}</div>
        </div>
        {isImg && (
          <>
            <button onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="Zoom out" className={btn}><ZoomOut className="h-5 w-5" /></button>
            <button onClick={() => setZoom((z) => Math.min(4, +(z + 0.5).toFixed(1)))} aria-label="Zoom in" className={btn}><ZoomIn className="h-5 w-5" /></button>
          </>
        )}
        {canDownload && <button onClick={download} aria-label="Download site plan" className={btn}><Download className="h-5 w-5" /></button>}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {err && <div className="m-6 rounded-2xl bg-white/10 p-5 text-center text-[14px] text-white">{err}</div>}
        {!err && !url && (
          <div className="flex h-full items-center justify-center"><BrandedLoader size={24} /></div>
        )}
        {!err && url && isImg && (
          <img
            src={url}
            alt={`Site plan for ${plot.scheme} plot ${plot.plot_number}`}
            onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
            style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "100%" : "none" }}
            className="mx-auto block select-none object-contain"
          />
        )}
        {!err && url && !isImg && (
          <div className="flex h-full flex-col">
            <iframe src={url} title="Site plan PDF" className="min-h-0 flex-1 bg-white" />
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-white/10 py-3 text-[13px] font-semibold text-white">
              <ExternalLink className="h-4 w-4" /> Open PDF in a new tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
