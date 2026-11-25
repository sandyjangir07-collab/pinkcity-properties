import Link from "next/link";
import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";
import { VALUE_CARDS, PROCESS_STEPS, WHY_STATS } from "../../lib/whyData";

export const metadata = buildMetadata({
  title: "Why PinkCity — A Different Kind of Real Estate Company",
  description: "We replace uncertainty with verification, paperwork with concierge service, and brokers with advisors who actually pick up your call.",
  path: "/why",
});

export default function WhyPage() {
  return (
    <>
      <PageHero
        eyebrow="Why PinkCity"
        title="A different kind of real estate company."
        description="We replace uncertainty with verification, paperwork with concierge service, and brokers with advisors who actually pick up your call."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-3xl px-6 space-y-8">
          <div className="text-center -mt-4 mb-4">
            <Link href="/#properties" className="inline-flex items-center gap-2 rounded-full bg-stone-600 text-sand text-sm font-medium px-6 py-3 hover:bg-stone-700 transition-colors">
              Get free consultation →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VALUE_CARDS.map((c) => (
              <div key={c.title} className="bg-white/70 border border-ink/[0.06] rounded-3xl p-6">
                <span className="w-11 h-11 rounded-xl bg-stone-600 flex items-center justify-center mb-4 shadow-[0_3px_10px_rgba(196,56,104,0.28)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d={c.icon} />
                  </svg>
                </span>
                <div className="font-display text-lg text-ink mb-1.5">{c.title}</div>
                <div className="text-sm text-ink/50 leading-relaxed">{c.body}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-ink to-[#1a120f] p-9">
            <div className="text-xs font-semibold tracking-widest2 uppercase text-stone-400 mb-3">How It Works</div>
            <h2 className="font-display text-2xl sm:text-3xl text-sand mb-6">From first search to handing you the keys.</h2>
            <div className="flex flex-col">
              {PROCESS_STEPS.map((s, i) => (
                <div key={s.title} className={`flex gap-3.5 py-4 ${i < PROCESS_STEPS.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                  <div className="text-[10px] font-bold text-stone-400 shrink-0 w-6 pt-1">{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <div className="font-display text-lg text-sand mb-1">{s.title}</div>
                    <div className="text-xs text-sand/40 leading-relaxed">{s.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {WHY_STATS.map((s) => (
              <div key={s.label} className="bg-white/70 border border-ink/[0.06] rounded-2xl p-6 text-center">
                <div className="font-display text-4xl text-stone-600">{s.value}</div>
                <div className="text-xs text-ink/45 mt-1.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
