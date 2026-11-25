import Link from "next/link";
import JaliPattern from "./JaliPattern";

export default function Footer() {
  return (
    <footer className="relative bg-ink text-sand/70 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.05]">
        <JaliPattern id="footer-jali" color="#F7F0E4" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-12 h-12 rounded-full bg-stone-600 flex items-center justify-center shadow-[0_4px_16px_rgba(196,56,104,0.4)] p-[6px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-full h-full object-contain" />
              </span>
              <span className="font-display text-xl text-sand">
                PinkCity<span className="text-stone-400">.</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-sand/50">
              Verified properties. Transparent deals. Built in Jaipur to fix everything that&apos;s broken about Indian real estate.
            </p>
          </div>
          <FooterCol
            title="Explore"
            links={[
              ["Properties", "/#properties"],
              ["Plots", "/#properties"],
              ["Resale Plots", "/resale"],
              ["Colonies", "/#properties"],
              ["Villas", "/#properties"],
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              ["About", "/founders"],
              ["Verified™ Process", "/verified"],
              ["Careers", "https://wa.me/919358830405?text=" + encodeURIComponent("Hi, I'd like to know about career opportunities at PinkCity.")],
              ["Contact", "https://wa.me/919358830405"],
            ]}
          />
          <FooterCol
            title="Investment Zones"
            links={[
              ["All Areas", "/areas"],
              ["Ajmer Road", "/ajmer-road"],
              ["Diggi-Malpura Road", "/diggi-malpura-road"],
              ["Tonk Road", "/tonk-road-shivdaspura"],
            ]}
          />
        </div>
        <div className="pt-8 border-t border-sand/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sand/35">
          <div>© 2026 PinkCity Properties &amp; Consultants. Jaipur, Rajasthan.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-sand/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-sand/60 transition-colors">Terms</Link>
            <Link href="/rera" className="hover:text-sand/60 transition-colors">RERA</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="text-xs font-medium tracking-widest2 uppercase text-sand/35 mb-4">{title}</div>
      <div className="flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="text-sm text-sand/55 hover:text-sand transition-colors">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
