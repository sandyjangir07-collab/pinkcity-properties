"use client";

import { motion } from "framer-motion";
import JaliPattern from "./JaliPattern";

const EASE = [0.22, 1, 0.36, 1];

export default function PageHero({ eyebrow, title, description }) {
  return (
    <section className="relative pt-40 pb-20 overflow-hidden grain">
      <div className="absolute inset-0 opacity-[0.05] text-stone-600">
        <JaliPattern id="page-hero-jali" />
      </div>
      <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-stone-500/[0.10] blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-xs font-medium tracking-widest2 uppercase text-stone-500 mb-5"
        >
          {eyebrow}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.08 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl text-ink leading-[1.05] mb-6"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.16 }}
            className="text-lg text-ink/55 max-w-2xl mx-auto leading-relaxed"
          >
            {description}
          </motion.p>
        )}
      </div>
    </section>
  );
}
