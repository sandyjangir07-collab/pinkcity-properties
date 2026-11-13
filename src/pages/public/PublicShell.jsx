import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { COMPANY_NAME, COMPANY_PHONE, COMPANY_PHONE_SHOWN } from "../../lib/resale";

export function usePageTitle(title, description) {
  useEffect(() => {
    const prev = document.title;
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content");
    if (description && meta) meta.setAttribute("content", description);
    return () => {
      document.title = prev;
      if (meta && prevDesc != null) meta.setAttribute("content", prevDesc);
    };
  }, [title, description]);
}

// The public face: no login, no CRM chrome. Same brand, calmer layout.
export default function PublicShell({ children, search = "" }) {
  return (
    <div className="min-h-screen bg-cream font-sans text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/[0.06] bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to={`/p${search}`} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crimson p-1.5">
              <img src="/logo.png" alt="" className="h-full w-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-[16px] font-semibold">PinkCity<span className="text-crimson">.</span></span>
              <span className="block truncate text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/45">Properties &amp; Consultants</span>
            </span>
          </Link>
          <a href={`tel:${COMPANY_PHONE}`} className="ml-auto inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-crimson px-4 text-[13px] font-semibold text-white active:scale-95">
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
      <footer className="border-t border-ink/[0.06] bg-white/60">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-[12px] leading-relaxed text-ink/45 sm:px-6">
          <div className="font-semibold text-ink/65">{COMPANY_NAME}</div>
          <div>Jaipur, Rajasthan · <a href={`tel:${COMPANY_PHONE}`} className="font-semibold text-crimson">{COMPANY_PHONE_SHOWN}</a></div>
          <p className="mx-auto mt-3 max-w-md">Demand rates shown are indicative and subject to confirmation. Please verify documents and details before booking.</p>
        </div>
      </footer>
    </div>
  );
}
