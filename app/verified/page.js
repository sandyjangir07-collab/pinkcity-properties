import Link from "next/link";
import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";
import { VERIFICATION_CHECKS } from "../../lib/verifiedChecks";

export const metadata = buildMetadata({
  title: "PinkCity Verified™ — The 6-Point Verification Process",
  description: "Before any property earns the PinkCity Verified™ badge, it passes rigorous legal and physical verification by our in-house advocates — title search, encumbrance check, zoning, site inspection, NOCs, and senior legal sign-off.",
  path: "/verified",
});

export default function VerifiedPage() {
  return (
    <>
      <PageHero
        eyebrow="The PinkCity Verified™ Process"
        title="Six checks. One promise."
        description="Before any property earns the badge, it passes rigorous legal and physical verification by our in-house advocates."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-2xl px-6 space-y-10">
          <div className="text-center">
            <Link href="/#properties" className="inline-flex items-center gap-2 rounded-full bg-stone-600 text-sand text-sm font-medium px-6 py-3 hover:bg-stone-700 transition-colors">
              Browse verified listings →
            </Link>
          </div>

          <div className="flex justify-center">
            <div className="w-48 h-48 rounded-full bg-stone-50 border border-dashed border-stone-300 flex flex-col items-center justify-center p-5 shadow-[0_8px_40px_rgba(20,16,18,0.10)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-16 h-16 object-contain mb-2" />
              <div className="text-[9px] font-semibold tracking-[2px] text-ink/40 uppercase">PinkCity</div>
              <div className="font-display text-xl text-ink leading-none">Verified</div>
              <div className="text-[9px] text-ink/40">TM</div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl text-ink mb-6 text-center">The 6-point verification</h2>
            <div className="rounded-3xl bg-ink border border-white/[0.07] overflow-hidden shadow-[0_8px_40px_rgba(20,16,18,0.20)]">
              {VERIFICATION_CHECKS.map((c, i) => (
                <div key={c.num} className={`flex items-start gap-3.5 px-6 py-5 ${i < VERIFICATION_CHECKS.length - 1 ? "border-b border-white/[0.06]" : ""}`}>
                  <span className="text-[11px] font-bold text-[#c47a94] tracking-wide min-w-[22px] mt-0.5 shrink-0">{c.num}</span>
                  <div>
                    <strong className="block mb-1 text-sand/90 text-sm">{c.title}</strong>
                    <span className="text-xs text-sand/45">{c.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-white/70 border border-ink/[0.06] rounded-3xl p-6">
              <div className="font-display text-4xl text-stone-600 mb-2">62%</div>
              <div className="text-xs text-ink/50 leading-relaxed">of property disputes in India arise from title defects a proper search would have caught.</div>
            </div>
            <div className="bg-white/70 border border-ink/[0.06] rounded-3xl p-6">
              <div className="font-display text-4xl text-stone-600 mb-2">100%</div>
              <div className="text-xs text-ink/50 leading-relaxed">of PinkCity Verified™ listings have cleared all 6 checks before appearing on the platform.</div>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-ink to-[#1a120f] p-10 text-center">
            <div className="font-display text-2xl text-sand mb-3">Ready to buy with confidence?</div>
            <p className="text-sm text-sand/55 mb-7 leading-relaxed">Every Verified listing comes with a full legal summary report. Zero commission from buyers.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/#properties" className="rounded-full bg-stone-600 text-sand text-sm font-medium px-6 py-3.5">Browse listings</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
