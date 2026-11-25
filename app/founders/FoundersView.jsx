"use client";

import { motion } from "framer-motion";
import JaliPattern from "../../components/JaliPattern";

const EASE = [0.22, 1, 0.36, 1];
const PRINCIPLES = [
  {
    num: "01",
    title: "Clarity over confusion",
    body: "Every buyer deserves honest guidance and complete transparency.",
    icon: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2" />,
  },
  {
    num: "02",
    title: "Trust over transactions",
    body: "Relationships are built long after the paperwork is signed.",
    icon: <path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6Z m-3 6 2 2 4-4" />,
  },
  {
    num: "03",
    title: "Long-term value over quick sales",
    body: "A great investment isn't just about today — it's about the future it creates.",
    icon: <path d="m4 16 5.5-6 4 4L20 6 M14 6h6v6" />,
  },
];
const FOUNDERS = [
  { initials: "SK", name: "Sandeep Kumar", role: "Co-Founder" },
  { initials: "AS", name: "Aashish Sharma", role: "Co-Founder" },
];

export default function FoundersView() {
  return (
    <>
      <section className="relative pt-40 pb-20 overflow-hidden grain">
        <div className="absolute inset-0 opacity-[0.05] text-stone-600">
          <JaliPattern id="founders-jali" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE }}
            src="/logo.png"
            alt=""
            className="w-14 h-14 mx-auto mb-6"
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-5"
          >
            Our Story
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.05] mb-6"
          >
            It started with a simple belief.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.26 }}
            className="text-lg text-ink/55"
          >
            Real estate doesn&apos;t have to be complicated.
          </motion.p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-xl px-6 text-center space-y-5">
          {[
            "Too often, people make one of life's biggest financial decisions with incomplete information, unnecessary pressure, or uncertainty.",
            "We believed there was a better way.",
            "PinkCity Properties was built on three simple principles.",
          ].map((line) => (
            <p key={line} className="text-lg text-ink/70 leading-relaxed">{line}</p>
          ))}
        </div>
      </section>

      {/* Ethos — Ramcharitmanas verses */}
      <section className="py-20 bg-ink text-sand relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <JaliPattern id="ethos-jali" color="#F7F0E4" />
        </div>
        <div className="relative mx-auto max-w-2xl px-6 text-center space-y-10">
          <div>
            <p className="font-display text-xl sm:text-2xl leading-relaxed">
              रघुकुल रीत सदा चली आई।<br />प्राण जाई पर वचन न जाई॥
            </p>
            <p className="text-sm text-sand/50 mt-4 leading-relaxed max-w-md mx-auto">
              भावार्थ : रघुकुल की यह परंपरा सदा से चली आई है — प्राण भले चले जाएं, पर दिया हुआ वचन कभी नहीं टूटना चाहिए।
            </p>
          </div>
          <div className="w-16 h-px bg-sand/15 mx-auto" />
          <div>
            <p className="font-display text-xl sm:text-2xl leading-relaxed">
              पर हित सरिस धर्म नहिं भाई।<br />पर पीड़ा सम नहिं अधमाई॥
            </p>
            <p className="text-sm text-sand/50 mt-4 leading-relaxed max-w-md mx-auto">
              भावार्थ : हे भाई! दूसरों की भलाई के समान कोई धर्म नहीं है, और दूसरों को दुःख पहुँचाने के समान कोई नीचता नहीं है।
            </p>
          </div>
          <p className="text-xs text-sand/35 tracking-wide">— रामचरितमानस, तुलसीदास</p>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-14">
            <div className="text-xs font-medium tracking-widest2 uppercase text-stone-500">What We Stand For</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {PRINCIPLES.map((p, i) => (
              <motion.div
                key={p.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.1 }}
                className="rounded-3xl bg-white/70 border border-ink/[0.06] p-7"
              >
                <div className="text-3xl font-display text-stone-300 mb-4">{p.num}</div>
                <span className="w-11 h-11 rounded-2xl bg-stone-50 text-stone-600 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {p.icon}
                  </svg>
                </span>
                <h3 className="font-display text-lg text-ink mb-2">{p.title}</h3>
                <p className="text-sm text-ink/55 leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="py-24 pb-32">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <p className="text-lg text-ink/60 leading-relaxed mb-14 max-w-md mx-auto">
            Everything we build begins with that belief, and every decision we make is guided by it.
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-16 mb-14">
            {FOUNDERS.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.12 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-[28px] bg-stone-600 text-sand flex items-center justify-center font-display text-xl mx-auto mb-4 shadow-lift">
                  {f.initials}
                </div>
                <div className="text-sm font-semibold text-ink">{f.name}</div>
                <div className="text-xs text-ink/45 mt-0.5">{f.role}</div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 h-px bg-ink/15" />
            <div className="font-display text-sm text-ink/40 tracking-wide">PinkCity Properties</div>
            <div className="w-10 h-px bg-ink/15" />
          </div>
        </div>
      </section>
    </>
  );
}
