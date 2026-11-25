import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";

export const metadata = buildMetadata({
  title: "Government Resources — Verify Rajasthan Land Records Yourself | PinkCity",
  description: "The same official Rajasthan government sources PinkCity checks before any listing earns the Verified badge — Urban GIS Portal, JDA Schemes & Allottees, and Apna Khata.",
  path: "/govt-resources",
});

const RESOURCES = [
  {
    title: "Urban GIS Portal",
    url: "https://gis.rajasthan.gov.in/CitizenUDH/",
    display: "gis.rajasthan.gov.in",
    desc: "Rajasthan's official land-use and zoning map, run by the Urban Development & Housing Department. Search any plot to see its designated zone — residential, commercial, institutional, or ecological — straight from the Jaipur Master Plan.",
    icon: "M12 22s8-4.5 8-11a8 8 0 0 0-16 0c0 6.5 8 11 8 11Z M12 11m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0",
  },
  {
    title: "JDA Schemes & Allottees",
    url: "https://jda.rajasthan.gov.in/content/raj/udh/jda---jaipur/en/citizen-service/scheme-and-allottees.html",
    display: "jda.rajasthan.gov.in",
    desc: "The Jaipur Development Authority's own record of every official housing scheme and who it was allotted to. Useful for confirming a plot genuinely came through a JDA scheme, and isn't just claimed to be.",
    icon: "M3 7h18v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  },
  {
    title: "Apna Khata",
    url: "https://apnakhata.rajasthan.gov.in/",
    display: "apnakhata.rajasthan.gov.in",
    desc: "Rajasthan's official land record portal (also called e-Dharti), run by the Revenue Department. Look up jamabandi (ownership record), khasra/khatauni numbers, and mutation status directly — no login required for basic lookups.",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6M9 13h6M9 17h6",
  },
];

export default function GovtResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Govt. Resources"
        title="The same sources we verify against."
        description="Every PinkCity Verified™ listing is checked against official Rajasthan government records — not just our word. Here are the same three sources, direct, so you can check them yourself too."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-2xl px-6 space-y-5">
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 bg-white/70 border border-ink/[0.06] rounded-3xl p-6 hover:border-stone-300 hover:-translate-y-0.5 transition-all"
            >
              <span className="w-12 h-12 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={r.icon} />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="font-display text-lg text-ink mb-1.5">{r.title}</div>
                <div className="text-sm text-ink/55 leading-relaxed mb-3">{r.desc}</div>
                <div className="text-xs font-medium text-stone-600">Visit {r.display} →</div>
              </div>
            </a>
          ))}

          <div className="bg-stone-50/60 rounded-3xl p-6 text-sm text-ink/60 leading-relaxed">
            <strong className="text-ink">Why we link directly to these.</strong> These are official Government of Rajasthan portals — not ours, and not affiliated with PinkCity. We link to them because they&apos;re exactly what our own team checks before any listing earns a PinkCity Verified™ badge, and we&apos;d rather you be able to verify it yourself too than just take our word for it.
          </div>
        </div>
      </div>
    </>
  );
}
