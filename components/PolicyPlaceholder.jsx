import PageHero from "./PageHero";

export default function PolicyPlaceholder({ eyebrow, title, body }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} />
      <div className="pb-28">
        <div className="mx-auto max-w-xl px-6">
          <div className="rounded-3xl bg-white/70 border border-ink/[0.06] p-8 text-center">
            <p className="text-[15px] text-ink/65 leading-relaxed mb-6">{body}</p>
            <a
              href="https://wa.me/919358830405"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-stone-600 text-sand text-sm font-medium px-6 py-3"
            >
              Contact us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
