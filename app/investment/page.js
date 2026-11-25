import Link from "next/link";
import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";
import { CORRIDORS } from "../../lib/areasData";
import StarRating from "../../components/StarRating";

export const metadata = buildMetadata({
  title: "Investment Intelligence — Compare Jaipur's Growth Corridors | PinkCity",
  description: "A side-by-side comparison of Jaipur's tracked growth corridors — entry pricing, investment horizon, and PinkCity's own sourced ratings, all in one place.",
  path: "/investment",
});

export default function InvestmentPage() {
  return (
    <>
      <PageHero
        eyebrow="Investment Intelligence"
        title="Compare, before you commit."
        description="Every corridor we track, side by side — current entry pricing, investment horizon, and our own rated assessment. For the full infrastructure sourcing behind each rating, open the corridor itself."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-3xl bg-white/70 border border-ink/[0.06] overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-4 px-6 py-4 bg-stone-50/60 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
              <div>Corridor</div>
              <div>Rating</div>
              <div>Entry Price</div>
              <div>Horizon</div>
              <div></div>
            </div>
            {CORRIDORS.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}`}
                className="grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-3 sm:gap-4 items-center px-6 py-5 border-t border-ink/[0.06] hover:bg-stone-50/40 transition-colors"
              >
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-sm font-semibold text-ink">{c.title}</div>
                  <div className="text-xs text-ink/40 mt-0.5">{c.badge}</div>
                </div>
                <div><StarRating value={c.stars} /></div>
                <div className="text-sm text-ink/70">{c.entryPrice}</div>
                <div className="text-sm text-ink/70">{c.horizon}</div>
                <div className="hidden sm:flex justify-end">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-ink/30"><path d="M9 18l6-6-6-6" /></svg>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-stone-50/60 p-7">
            <div className="text-sm text-ink/60 leading-relaxed">
              <strong className="text-ink">A note on these ratings.</strong> Every score above is PinkCity&apos;s own editorial assessment — weighted across connectivity, regulatory clarity, price momentum, infrastructure, and demand — sourced from official government records where available (JDA, NHAI, RMRCL, and similar). They are not a government index, RERA rating, or guarantee of future returns. Open any corridor for the full sourcing behind its score.
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/areas" className="text-sm font-medium text-stone-600">See the full location breakdown →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
