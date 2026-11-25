"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import StarRating from "./StarRating";

export default function CorridorCard({ corridor: c, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: (index % 2) * 0.1 }}
    >
      <Link
        href={`/${c.slug}`}
        className="group block rounded-3xl bg-white/70 border border-ink/[0.06] p-8 hover:shadow-[0_24px_48px_-24px_rgba(196,56,104,0.22)] hover:-translate-y-1 transition-all duration-300"
      >
        <span className="inline-block text-[11px] font-medium tracking-wide text-stone-600 bg-stone-50 px-3 py-1 rounded-full mb-4">
          {c.badge}
        </span>
        <h3 className="font-display text-2xl text-ink mb-3">{c.title}</h3>
        <StarRating value={c.stars} />
        <p className="text-sm text-ink/55 leading-relaxed mt-4 mb-6">{c.desc}</p>
        <div className="grid grid-cols-3 gap-4 pt-5 border-t border-ink/[0.06]">
          <Stat label="Entry Price" value={c.entryPrice} />
          <Stat label="Growth Stage" value={c.stage} />
          <Stat label="Horizon" value={c.horizon} />
        </div>
        <div className="mt-6 text-xs font-medium text-ink/40 group-hover:text-stone-600 transition-colors inline-flex items-center gap-1">
          View corridor report
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-ink/35 mb-1">{label}</div>
      <div className="text-sm font-medium text-ink">{value}</div>
    </div>
  );
}
