import { buildMetadata } from "../../lib/seo";
import PageHero from "../../components/PageHero";
import { REVIEW_STATS, REVIEWS } from "../../lib/reviewsData";

export const metadata = buildMetadata({
  title: "Reviews — Trust Built One Transaction at a Time | PinkCity",
  description: "Real stories from real people who bought, sold, and invested through PinkCity across Jaipur — 4.9 average rating from 840+ clients.",
  path: "/reviews",
});

export default function ReviewsPage() {
  return (
    <>
      <PageHero
        eyebrow="Loved by Buyers, Sellers & Investors"
        title="Trust built one transaction at a time."
        description="Real stories from real people who bought, sold, and invested through PinkCity across Jaipur."
      />
      <div className="pb-28">
        <div className="mx-auto max-w-3xl px-6">
          <div className="grid grid-cols-3 gap-3.5 mb-14 max-w-lg mx-auto">
            {REVIEW_STATS.map((s) => (
              <div key={s.label} className="bg-white/70 border border-ink/[0.06] rounded-2xl p-5 text-center">
                <div className="font-display text-3xl text-stone-600">{s.value}</div>
                <div className="text-xs text-ink/45 mt-1">{s.label}</div>
                {s.stars && <div className="text-brass text-sm mt-1">★★★★★</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-white/70 border border-ink/[0.06] rounded-3xl p-7">
                <div className="text-brass text-sm mb-2">★★★★★</div>
                <div className="font-display text-4xl text-stone-300 leading-none mb-3">&ldquo;</div>
                <p className="text-[15px] leading-relaxed text-ink/75 mb-5">{r.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-ink/[0.06]">
                  <div className="w-10 h-10 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center text-xs font-semibold shrink-0">{r.initials}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{r.name}</div>
                    <div className="text-xs text-ink/45">{r.role}</div>
                  </div>
                  <div className="ml-auto text-[11px] text-ink/40 shrink-0">{r.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
