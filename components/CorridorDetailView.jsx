import Link from "next/link";
import StarRating from "./StarRating";
import { GROWTH_STAGES, STATUS_TONE } from "../lib/corridorDetails";

export default function CorridorDetailView({ data }) {
  return (
    <div className="pb-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7 mb-8">
          <span className="inline-block text-[11px] font-medium tracking-wide text-stone-600 bg-stone-50 px-3 py-1 rounded-full mb-4">
            {data.badge}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-ink leading-tight mb-4">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <StarRating value={data.stars} />
              <div className="text-xs text-ink/40 mt-1">Investment Rating — {data.stars} / 5</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-0.5">Risk Level</div>
              <div className="text-sm font-semibold text-ink">{data.riskLevel}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-0.5">Investment Horizon</div>
              <div className="text-sm font-semibold text-ink">{data.horizon}</div>
            </div>
          </div>
        </div>

        <Section
          title={
            <span className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
              PinkCity Expert Verdict
            </span>
          }
        >
          <div className="flex flex-wrap gap-2 mb-4">
            {data.recoTags.map((t) => (
              <span key={t} className="text-xs bg-stone-50 text-stone-600 rounded-full px-3 py-1.5">{t}</span>
            ))}
          </div>
          <p className="text-[14.5px] leading-relaxed text-ink/70">{data.verdict}</p>
          <p className="text-xs text-ink/40 mt-4 pt-4 border-t border-ink/[0.06] leading-relaxed">
            <strong className="text-ink/55">Methodology:</strong> PinkCity&apos;s Investment Rating is our own editorial assessment — weighted across connectivity, regulatory clarity, price momentum, social/commercial infrastructure, and employment drivers — not a government, RERA, or third-party index.
          </p>
        </Section>

        <Section title="Growth Meter">
          <div className="font-display text-xl text-ink mb-3">{data.growthStage}</div>
          <div className="flex gap-1.5 mb-2">
            {GROWTH_STAGES.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i <= data.growthStageIndex ? "bg-stone-500" : "bg-ink/[0.08]"}`} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-ink/35 mb-4">
            {GROWTH_STAGES.map((s) => (<span key={s}>{s}</span>))}
          </div>
        </Section>

        <Section title="Infrastructure Tracker" sub="Verified projects only — status and source shown for each.">
          <div className="space-y-3">
            {data.infrastructure.map((item) => {
              const tone = STATUS_TONE[item.statusTone] || STATUS_TONE.planning;
              return (
                <div key={item.title} className="rounded-2xl border border-ink/[0.06] p-4">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="text-sm font-semibold text-ink">{item.title}</div>
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${tone.bg} ${tone.text}`}>{tone.dot} {item.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-ink/40">
                    <span>Impact: {item.impact}</span>
                    <span>Source: {item.source}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {data.blogSlug && (
          <div className="rounded-3xl bg-ink p-7 flex items-center justify-between gap-4 flex-wrap mt-8">
            <div>
              <div className="text-sm font-medium text-sand mb-1">Want the full picture?</div>
              <div className="text-xs text-sand/45">Read the complete investment guide for this corridor.</div>
            </div>
            <Link href={`/blog/${data.blogSlug}`} className="text-sm font-medium text-ink bg-sand rounded-full px-5 py-2.5 no-underline shrink-0">
              Read the guide →
            </Link>
          </div>
        )}

        <div className="text-center mt-10">
          <Link href="/#properties" className="text-sm font-medium text-stone-600">Browse listings in this area →</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div className="mt-8">
      <div className="font-display text-lg text-ink mb-1">{title}</div>
      {sub && <p className="text-xs text-ink/40 mb-4">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </div>
  );
}
